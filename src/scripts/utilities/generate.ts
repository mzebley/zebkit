#!/usr/bin/env tsx
// Generates utility SCSS partials from hand-authored *utilities.manifest.json
// contracts. Each family's `source` partial is overwritten wholesale — edit
// the manifest and regenerate, never the partial. lint.ts validates the
// round trip.
//
// Run: npm run generate:utilities

import fs from "fs-extra";
import path from "node:path";
import { globSync } from "glob";
import postcss from "postcss";
import {
  BREAKPOINTS,
  MANIFEST_GLOB,
  STATE_PATTERN_STATES,
  expandFamily,
  instantiateTemplate,
  type StatePatternStateName,
  type UtilityFamily,
  type UtilityManifest,
  type UtilityRule,
} from "./expand.js";
import {
  breakpointKeysFromModules,
  loadTokenModules,
  resolvePatternValues,
} from "./token-source.js";

type SourcePlan = {
  source: string;
  manifestPaths: Set<string>;
  families: UtilityFamily[];
};

type PatternEntry = {
  className: string;
  edge: string | null;
  value: string;
  negative: boolean;
};

class GenerationError extends Error {}

function escapeClassName(className: string): string {
  return className.replace(/:/g, "\\:");
}

function selectorForClass(className: string): string {
  return `.${escapeClassName(className)}`;
}

function renderRule(selectors: string[], declarations: Array<[string, string]>): string {
  if (declarations.length === 0) return "";
  return `${selectors.join(",\n")} {\n${declarations
    .map(([prop, value]) => `  ${prop}: ${value};`)
    .join("\n")}\n}\n`;
}

// Manifests author custom properties and var() references with the literal
// --zbk- prefix; the generated SCSS uses the configurable prefix var so a
// consumer's prefix flows through, exactly like pattern families' token vars.
function rewritePrefix(text: string): string {
  return text.replace(/--zbk-/g, "--#{prefix.$cssVar}-");
}

// Render one `rules` family rule (selector + declarations + nested) as verbatim
// SCSS. Declarations and selectors are emitted literally; only the --zbk- prefix
// is rewritten. Nested rules use '&' and are indented inside the parent block.
function renderRuleBlock(rule: UtilityRule): string {
  const declarations = Object.entries(rule.declarations)
    .map(([prop, value]) => `  ${rewritePrefix(prop)}: ${rewritePrefix(value)};`)
    .join("\n");
  const nested = (rule.nested ?? [])
    .map((child) => indent(renderRuleBlock(child), 2))
    .join("\n\n");
  const body = [declarations, nested].filter(Boolean).join("\n\n");
  return `${rule.selector} {\n${body}\n}`;
}

function patternEntries(family: UtilityFamily): PatternEntry[] {
  if (!family.pattern) return [];

  const pattern = family.pattern;
  const edges: Array<string | null> = pattern.edgeRequired ? [] : [null];
  for (const edge of pattern.edges ?? []) edges.push(edge);

  const entries: PatternEntry[] = [];
  const byClass = new Map<string, PatternEntry>();

  for (const edge of edges) {
    const stem = edge ? `${pattern.base}-${edge}` : pattern.base;
    for (const value of pattern.values ?? []) {
      const entry = { className: `${stem}-${value}`, edge, value, negative: false };
      entries.push(entry);
      byClass.set(entry.className, entry);
    }
    const negatives = Array.isArray(pattern.negativeValues) ? pattern.negativeValues : [];
    for (const value of negatives) {
      const entry = { className: `${stem}-neg-${value}`, edge, value, negative: true };
      entries.push(entry);
      byClass.set(entry.className, entry);
    }
  }

  for (const [alias, target] of Object.entries(pattern.aliases ?? {})) {
    const targetEntry = byClass.get(target);
    if (!targetEntry) continue;
    entries.push({ ...targetEntry, className: alias });
  }

  return entries;
}

// valueMap entries are verbatim final values; they can be keyed by full class
// name (for aliases), neg-<value>, or value suffix.
function resolveValue(
  family: UtilityFamily,
  entry: PatternEntry
): { css: string; verbatim: boolean } {
  const valueMap = family.generator?.valueMap;
  const mappedValue =
    valueMap?.[entry.className] ??
    (entry.negative ? valueMap?.[`neg-${entry.value}`] : undefined) ??
    valueMap?.[entry.value] ??
    family.pattern?.literals?.[entry.value];
  if (mappedValue !== undefined) {
    return { css: rewritePrefix(mappedValue), verbatim: true };
  }

  if (family.tokens) {
    const edgeSegment = family.tokens.edgeInToken && entry.edge ? `-${entry.edge}` : "";
    const tokenName = entry.negative
      ? `${family.tokens.varPrefix}${edgeSegment}-neg-${entry.value}`
      : `${family.tokens.varPrefix}${edgeSegment}-${entry.value}`;
    return { css: `var(--#{prefix.$cssVar}-${tokenName})`, verbatim: false };
  }

  return { css: entry.negative ? `-${entry.value}` : entry.value, verbatim: false };
}

function resolveProperties(family: UtilityFamily, edge: string | null): string[] {
  const edgeProperties = family.generator?.edgeProperties;
  if (!edgeProperties) return family.properties;
  return edgeProperties[edge ?? ""] ?? [];
}

function withImportant(family: UtilityFamily, value: string): string {
  if (!family.important || value.endsWith("!important")) return value;
  return `${value} !important`;
}

// Only prefix class tokens the family itself claims — structural companions in
// compound selectors keep their unprefixed form.
function prefixSelectors(scss: string, breakpoint: string, claimed: Set<string>): string {
  const root = postcss.parse(scss);
  root.walkRules((rule) => {
    rule.selectors = rule.selectors.map((selector) =>
      selector.replace(/\.((?:\\:|[a-zA-Z0-9_-])+)/g, (match, classToken: string) => {
        const normalized = classToken.replace(/\\:/g, ":");
        if (!claimed.has(normalized)) return match;
        return selectorForClass(`${breakpoint}:${normalized}`);
      })
    );
  });
  return root.toString();
}

function classDeclarationsOrThrow(
  family: UtilityFamily,
  className: string
): Record<string, string> {
  const classDeclarations = family.generator?.declarations?.[className];
  if (!classDeclarations || Object.keys(classDeclarations).length === 0) {
    throw new GenerationError(
      `family '${family.name}': no declarations for class '${className}'. ` +
        `An empty rule would be silently dropped by Sass — add generator.declarations['${className}'] (or rawScss).`
    );
  }
  return classDeclarations;
}

function selectorsFor(family: UtilityFamily, className: string, breakpoint?: string): string[] {
  const prefixed = breakpoint ? `${breakpoint}:${className}` : className;
  if (!family.modifiers?.hover) return [selectorForClass(prefixed)];
  const hoverName = breakpoint ? `${breakpoint}:hover:${className}` : `hover:${className}`;
  return [selectorForClass(prefixed), selectorForClass(hoverName) + ":hover"];
}

type StateConfig = { name: StatePatternStateName; pseudo: string | null };
const ALL_STATE_CONFIGS: StateConfig[] = [
  { name: "base", pseudo: null },
  { name: "focus", pseudo: ":is(:focus-visible, :focus-within)" },
  { name: "hover", pseudo: ":hover" },
  { name: "active", pseudo: ":active" },
  { name: "disabled", pseudo: ':is(:disabled, [aria-disabled="true"])' },
];

function renderStatePatternRules(family: UtilityFamily): string {
  const sp = family.statePattern!;
  const enabledStateNames = new Set<string>(
    sp.states === true ? [...STATE_PATTERN_STATES] : sp.states
  );
  const stateConfigs = ALL_STATE_CONFIGS.filter((s) => enabledStateNames.has(s.name));

  const axisNames = Object.keys(sp.axes);
  const axisValueArrays = axisNames.map((name) => sp.axes[name]);
  const combos: Array<Record<string, string | null>> = axisValueArrays
    .reduce<Array<(string | null)[]>>(
      (acc, arr) => acc.flatMap((combo) => arr.map((item) => [...combo, item])),
      [[]]
    )
    .map((combo) => {
      const b: Record<string, string | null> = {};
      axisNames.forEach((name, i) => { b[name] = combo[i]; });
      return b;
    });

  type RuleEntry = { className: string; properties: string[]; varValue: string };
  const entries: RuleEntry[] = [];

  for (const [roleName, propsRaw] of Object.entries(sp.roles)) {
    const properties = Array.isArray(propsRaw) ? propsRaw : [propsRaw];
    for (const axisBindings of combos) {
      const bindings = { role: roleName, ...axisBindings };
      const className = instantiateTemplate(sp.class, bindings);
      if (!className) continue;
      const varName = rewritePrefix(instantiateTemplate(sp.var, bindings));
      entries.push({ className, properties, varValue: `var(${varName})` });
    }
  }

  const blocks: string[] = [];

  for (const { name: stateName, pseudo } of stateConfigs) {
    if (stateName === "base") {
      for (const { className, properties, varValue } of entries) {
        blocks.push(renderRule([`.${escapeClassName(className)}`], properties.map((p) => [p, varValue])));
      }
    } else if (stateName === "hover") {
      const hoverRules = entries
        .map(({ className, properties, varValue }) =>
          renderRule(
            [`.${escapeClassName(`hover:${className}`)}${pseudo}`],
            properties.map((p) => [p, varValue])
          )
        )
        .join("\n");
      blocks.push(`@media (hover: hover) and (pointer: fine) {\n${indent(hoverRules.trimEnd(), 2)}\n}`);
    } else {
      for (const { className, properties, varValue } of entries) {
        const selector = `[class~="${stateName}:${className}"]${pseudo}`;
        blocks.push(renderRule([selector], properties.map((p) => [p, varValue])));
      }
    }
  }

  return blocks.join("\n");
}

function renderFamilyRules(family: UtilityFamily, breakpoint?: string): string {
  if (family.statePattern) {
    // statePattern families don't support breakpoint modifiers.
    if (breakpoint) return "";
    return renderStatePatternRules(family);
  }

  if (family.rules) {
    // Rules families do not support modifiers, so they only ever render at base.
    return family.rules.map(renderRuleBlock).join("\n\n");
  }

  if (family.generator?.rawScss) {
    const raw = family.generator.rawScss.trim();
    if (breakpoint) {
      return prefixSelectors(raw, breakpoint, expandFamily(family).baseClasses);
    }
    const staticScss = family.generator.staticScss ? `${family.generator.staticScss.trim()}\n\n` : "";
    return `${staticScss}${raw}\n`;
  }

  if (family.classes) {
    const staticScss =
      !breakpoint && family.generator?.staticScss ? `${family.generator.staticScss.trim()}\n\n` : "";
    return (
      staticScss +
      family.classes
        .map((className) =>
          renderRule(
            selectorsFor(family, className, breakpoint),
            Object.entries(classDeclarationsOrThrow(family, className)).map(([prop, value]) => [
              rewritePrefix(prop),
              withImportant(family, rewritePrefix(value)),
            ])
          )
        )
        .join("\n")
    );
  }

  return patternEntries(family)
    .map((entry) => {
      const properties = resolveProperties(family, entry.edge);
      if (properties.length === 0) {
        throw new GenerationError(
          `family '${family.name}': no properties resolve for class '${entry.className}' (edge '${entry.edge ?? ""}').`
        );
      }
      const resolved = resolveValue(family, entry);
      const value = resolved.verbatim ? resolved.css : withImportant(family, resolved.css);
      return renderRule(
        selectorsFor(family, entry.className, breakpoint),
        properties.map((property) => [property, value])
      );
    })
    .join("\n");
}

function indent(value: string, spaces: number): string {
  const pad = " ".repeat(spaces);
  return value
    .split("\n")
    .map((line) => (line.length === 0 ? line : `${pad}${line}`))
    .join("\n");
}

function renderSourceFile(plan: SourcePlan, breakpoints: string[]): string {
  const manifestList = Array.from(plan.manifestPaths).sort().join(", ");

  // Unlayered rules families (e.g. transition :root defaults) emit outside the
  // @layer stack; everything else wraps in the file's @layer. The layer comes
  // from the first layered family so an unlayered family never sets it.
  const unlayeredFamilies = plan.families.filter((family) => family.rules && family.unlayered);
  const layeredFamilies = plan.families.filter((family) => !(family.rules && family.unlayered));
  const layer = layeredFamilies[0]?.layer ?? "utilities";

  const unlayeredBlocks = unlayeredFamilies
    .map((family) => renderFamilyRules(family).trim())
    .filter(Boolean);

  const blocks = layeredFamilies
    .map((family) => renderFamilyRules(family).trim())
    .filter(Boolean);

  for (const breakpoint of breakpoints) {
    const rulesForBreakpoint = layeredFamilies
      .filter((family) => (family.modifiers?.responsive ?? []).includes(breakpoint))
      .map((family) => renderFamilyRules(family, breakpoint).trim())
      .filter(Boolean)
      .join("\n\n");
    if (!rulesForBreakpoint) continue;
    blocks.push(`@include gen.from-breakpoint('${breakpoint}') {\n${indent(rulesForBreakpoint, 2)}\n}`);
  }

  const lines = [
    `// GENERATED by generate:utilities from ${manifestList} — do not edit; edit the manifest and regenerate.`,
    `@use 'tokens/styles/variables/prefix' as prefix;`,
    `@use 'tokens/styles/mixins/generators' as gen;`,
    ``,
  ];
  if (unlayeredBlocks.length > 0) {
    lines.push(unlayeredBlocks.join("\n\n"), ``);
  }
  lines.push(`@layer ${layer} {`, indent(blocks.join("\n\n"), 2), `}`, ``);
  return lines.join("\n");
}

async function main(): Promise<void> {
  const rootDir = process.cwd();
  const manifests = globSync(MANIFEST_GLOB, { cwd: rootDir }).sort();
  const tokenModules = await loadTokenModules(rootDir);
  const breakpoints = breakpointKeysFromModules(tokenModules, BREAKPOINTS);

  const bySource = new Map<string, SourcePlan>();
  for (const manifestPath of manifests) {
    const manifest = (await fs.readJson(path.resolve(rootDir, manifestPath))) as UtilityManifest;
    for (const family of manifest.families) {
      family.layer = family.layer ?? manifest.layer;
      resolvePatternValues(family, tokenModules);
      for (const source of [family.source].flat()) {
        const plan = bySource.get(source) ?? {
          source,
          manifestPaths: new Set<string>(),
          families: [],
        };
        plan.manifestPaths.add(manifestPath);
        plan.families.push(family);
        bySource.set(source, plan);
      }
    }
  }

  const plans = Array.from(bySource.values()).sort((a, b) => a.source.localeCompare(b.source));

  // --check renders in-memory and diffs against the committed partials without
  // writing — the "generated SCSS is up to date" guard for `check`/CI. Fails on
  // stale output (a manifest changed but nobody regenerated) or hand-edits to a
  // generated partial. Never mutates the tree.
  const checkOnly = process.argv.includes("--check");
  const drifted: string[] = [];

  for (const plan of plans) {
    const output = renderSourceFile(plan, breakpoints);
    const outputPath = path.resolve(rootDir, plan.source);

    if (checkOnly) {
      const current = (await fs.pathExists(outputPath)) ? await fs.readFile(outputPath, "utf8") : null;
      if (current !== output) drifted.push(plan.source);
      continue;
    }

    await fs.ensureDir(path.dirname(outputPath));
    await fs.writeFile(outputPath, output, "utf8");
    console.log(`generated ${plan.source}`);
  }

  if (checkOnly) {
    if (drifted.length > 0) {
      console.error(
        `Utility SCSS is out of date with the manifests:\n${drifted.map((s) => `  - ${s}`).join("\n")}\n` +
          `Run 'npm run generate:utilities' and commit the result (do not hand-edit generated partials).`
      );
      process.exitCode = 1;
    } else {
      console.log(`Utility SCSS is up to date (${plans.length} partial(s)).`);
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
