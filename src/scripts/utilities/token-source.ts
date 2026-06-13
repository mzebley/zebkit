// Loads zebkit token modules (src/{core,components}/**/tokens/tokens.ts) and
// returns a map of module key -> (token key -> token type). Replaces the USWDS
// project's token-template-loader: lets the lint check that a family's
// tokens.group exists, that every pattern value is a real token key, and
// (when tokens.types is set) that each value's declared `type` is allowed.
//
// Modules that share a `key` (e.g. core/spacing and semantic/spacing both
// export key "spacing") are merged into one group.

import path from "node:path";
import { pathToFileURL } from "node:url";
import { globSync } from "glob";
import type { UtilityFamily } from "./expand.js";

/** group key -> (token key -> token `type`, "" when a token declares none). */
export type TokenModuleMap = Map<string, Map<string, string>>;

export async function loadTokenModules(rootDir: string): Promise<TokenModuleMap> {
  const files = globSync("src/{core,components}/**/tokens/tokens.ts", { cwd: rootDir }).sort();
  const modules: TokenModuleMap = new Map();

  for (const file of files) {
    const mod = await import(pathToFileURL(path.resolve(rootDir, file)).href);
    if (typeof mod.key !== "string" || typeof mod.default !== "object") continue;
    const keys = modules.get(mod.key) ?? new Map<string, string>();
    for (const [tokenKey, token] of Object.entries(mod.default as Record<string, unknown>)) {
      const type = (token as { type?: unknown })?.type;
      keys.set(tokenKey, typeof type === "string" ? type : "");
    }
    modules.set(mod.key, keys);
  }

  return modules;
}

/**
 * Resolve a pattern family's value axes in place against its bound token group,
 * so the lint and the generator both work from the same concrete lists:
 *
 * - `pattern.values` omitted -> derive every token key in the group (filtered to
 *   `tokens.types` when set, `neg-*` keys skipped), so it can never drift from
 *   the tokens. An explicit `values` is left untouched (a deliberate limiter).
 * - `pattern.negativeValues: true` -> mirror the resolved positives: emit a
 *   negative for each value that has a matching, type-allowed `neg-<value>`
 *   token. Values without a neg token (named sizes, `0`) are skipped.
 * - `pattern.exclude` -> subtract those values from both axes, applied last.
 *
 * A no-op when there is no `tokens` binding or the group is unknown (the lint
 * reports those). `edgeInToken` families skip positive derivation and negative
 * mirroring (their token keys embed the edge, so a bare value list is ambiguous).
 */
export function resolvePatternValues(
  family: UtilityFamily,
  tokenModules: TokenModuleMap
): void {
  const pattern = family.pattern;
  if (!pattern || !family.tokens) return;

  const group = tokenModules.get(family.tokens.group);
  if (!group) return;

  const allowedTypes = family.tokens.types ? new Set(family.tokens.types) : undefined;
  const typeAllowed = (key: string): boolean => {
    const type = group.get(key);
    return type !== undefined && (!allowedTypes || allowedTypes.has(type));
  };

  // Positive values: an explicit list wins; otherwise derive the whole group.
  let values = pattern.values;
  if (!values && !family.tokens.edgeInToken) {
    values = [];
    for (const key of group.keys()) {
      if (key.startsWith("neg-")) continue;
      if (typeAllowed(key)) values.push(key);
    }
  }

  // Negative values: `true` mirrors the resolved positives.
  let negatives = pattern.negativeValues;
  if (negatives === true) {
    negatives = [];
    if (!family.tokens.edgeInToken) {
      for (const value of values ?? []) {
        const negKey = `neg-${value}`;
        if (group.has(negKey) && typeAllowed(negKey)) negatives.push(value);
      }
    }
  }

  // exclude subtracts from both axes.
  const exclude = new Set(pattern.exclude ?? []);
  if (exclude.size > 0) {
    if (values) values = values.filter((v) => !exclude.has(v));
    if (Array.isArray(negatives)) negatives = negatives.filter((v) => !exclude.has(v));
  }

  // literals append non-token values to the positive axis (after exclude, so
  // they are intentional additions immune to it; their CSS is emitted verbatim).
  if (pattern.literals) {
    values = values ? [...values] : [];
    for (const literal of Object.keys(pattern.literals)) {
      if (!values.includes(literal)) values.push(literal);
    }
  }

  if (values) pattern.values = values;
  if (Array.isArray(negatives)) pattern.negativeValues = negatives;
}
