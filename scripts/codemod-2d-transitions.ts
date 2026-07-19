#!/usr/bin/env tsx
/**
 * Phase 2d codemod (plans/dtcg-alignment/plan.md, decisions D5/D11): splits the
 * conflated `transition` token type into its DTCG successors.
 *
 * The transition MODULE (`src/tokens/transition/`) is restructured by hand
 * (structured `duration`/`cubicBezier` values with serialize self-checks). This
 * codemod handles the mechanical remainder — component modules and theme
 * documents — classifying each `transition`-typed entry by its value:
 *
 *   - `<n>ms` / `0`            → `duration`  (source: structured `{value, unit}`;
 *                               `0` is `transition-delay`, kept a bare `0`)
 *   - `{…duration…|…delay…}`   → `duration`  (reference; kept a string)
 *   - `{…function…}`           → `cubicBezier` (reference; kept a string)
 *   - `ease`/`ease-out`/…      → `transitionTimingFunction` (keyword; kept a string)
 *   - anything else (a CSS     → `transitionProperty`        (kept a string)
 *     property-name list)
 *
 * Theme override `$value`s stay raw strings — only `$type` retypes (the merge
 * keeps `$type` base-controlled, but editor schemas pin it as a const, so the
 * document must carry the base entry's split type). Idempotent (no `transition`
 * type survives). Deleted at the end of Phase 4 (D11).
 */
import path from "path";
import fs from "fs-extra";
import { glob } from "glob";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), "..");
// Base-type oracle: the merged default-theme snapshot carries each entry's
// split `$type` (build it first — same pattern as codemod-d5-collapse).
const DEFAULTS_DIR = path.join(REPO_ROOT, "dist", "cli", "defaults");
const SPLIT_TYPES = ["duration", "cubicBezier", "transitionProperty", "transitionTimingFunction"];

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

type Classification = { type: string; durationMs?: number };

/** Map a `transition`-typed entry's value to its split type (and, for ms/0 literals, its duration). */
function classify(content: string): Classification {
  if (content.startsWith("{")) {
    if (/duration|delay|grace/.test(content)) return { type: "duration" };
    if (/function|timing/.test(content)) return { type: "cubicBezier" };
    throw new Error(`Unclassifiable transition reference: ${content}`);
  }
  const ms = content.match(/^(-?\d+(?:\.\d+)?)ms$/);
  if (ms) return { type: "duration", durationMs: Number(ms[1]) };
  if (content === "0") return { type: "duration", durationMs: 0 };
  if (/^cubic-bezier\(/.test(content)) return { type: "cubicBezier" };
  if (/^(ease|ease-in|ease-out|ease-in-out|linear|step-start|step-end|steps\()/.test(content)) {
    return { type: "transitionTimingFunction" };
  }
  return { type: "transitionProperty" };
}

let tsChanged = 0;
let jsonChanged = 0;
let entries = 0;

async function migrateSource(): Promise<void> {
  const files = await glob("src/components/**/tokens/tokens.ts", { cwd: REPO_ROOT, absolute: true });
  for (const file of files) {
    const before = await fs.readFile(file, "utf8");
    const after = before.replace(
      /\$value: "([^"]*)",(\s*\n\s*)\$type: "transition",/g,
      (_m, content: string, ws: string) => {
        const c = classify(content);
        entries++;
        const value =
          c.durationMs !== undefined
            ? `{ value: ${c.durationMs}, unit: "ms" }`
            : `"${content}"`;
        return `$value: ${value},${ws}$type: "${c.type}",`;
      }
    );
    if (after !== before) {
      await fs.writeFile(file, after);
      tsChanged++;
    }
  }
}

async function migrateThemes(): Promise<void> {
  const files = await glob("theme/**/zbk-*.tokens.json", { cwd: REPO_ROOT, absolute: true });
  for (const file of files) {
    let content = await fs.readFile(file, "utf8");
    if (!content.includes('"$type": "transition"')) continue;

    // `$type` is base-controlled by the merge (and pinned as a const in the
    // editor schema), so a theme entry must carry its BASE type — not the type
    // its own overriding value would classify to (a curve reference can override
    // a keyword-easing slot). Read the base type per entry from the oracle.
    const moduleKey = path.basename(file).replace(/\.tokens\.json$/, "");
    const oraclePath = path.join(DEFAULTS_DIR, `${moduleKey}.json`);
    if (!(await fs.pathExists(oraclePath))) {
      throw new Error(`No base-type oracle at ${oraclePath} for ${file} — run build:defaults first.`);
    }
    const oracle = (await fs.readJson(oraclePath)) as Record<string, { $type?: string }>;

    let changed = false;
    for (const [name, entry] of Object.entries(oracle)) {
      if (name.startsWith("$") || name.startsWith("_")) continue;
      const baseType = entry?.$type;
      if (!baseType || !SPLIT_TYPES.includes(baseType)) continue;
      const re = new RegExp(`("${escapeRegExp(name)}":\\s*\\{[\\s\\S]*?"\\$type":\\s*)"transition"`);
      const next = content.replace(re, `$1"${baseType}"`);
      if (next !== content) {
        content = next;
        changed = true;
        entries++;
      }
    }
    if (changed) {
      await fs.writeFile(file, content);
      jsonChanged++;
    }
  }
}

async function main(): Promise<void> {
  await migrateSource();
  await migrateThemes();
  console.log(
    `codemod-2d-transitions: retyped ${entries} source entr(ies) across ${tsChanged} module(s), ${jsonChanged} theme document(s).`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
