#!/usr/bin/env tsx
/**
 * Phase 2e codemod (plans/dtcg-alignment/plan.md, decisions D5/D11): the numbers
 * & typography leftovers. Retypes the last legacy families onto their spec
 * successors across component modules and theme documents:
 *
 *   - `opacity`  → `number`     (values already unitless numbers)
 *   - `zIndex`   → `number`     (…except a `z-index: auto` keyword → `cssDimension`, D4)
 *   - `lineHeight` → `number`   (percentage values re-authored unitless: `150%` → `1.5`)
 *   - `borderStyle` → `strokeStyle`
 *   - `fontWeight` values normalized string → number (`"400"` → `400`)
 *
 * It also retires the `tracking.*` virtual alias (completing I5): the dangling
 * `{tracking.x}` references (which pointed at an undefined `--zbk-tracking-x`
 * var) are repointed to the real `{letter-spacing.x}` module.
 *
 * The primitive/prose/semantic modules are migrated by hand (line-height's
 * unitless values + explicit a11y modifier, the number retypes). This handles
 * the mechanical remainder. Theme `$value`s that stay strings are left as-is
 * (Phase 3 makes theme documents fully structured); only the leftmost of the
 * transforms above touch a theme value. Idempotent. Deleted at the end of
 * Phase 4 (D11).
 */
import path from "path";
import fs from "fs-extra";
import { glob } from "glob";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), "..");

let tsChanged = 0;
let jsonChanged = 0;

/** Component source: retype `$type`s and repoint `{tracking.*}` → `{letter-spacing.*}`. */
async function migrateSource(): Promise<void> {
  const files = await glob("src/components/**/tokens/tokens.ts", {
    cwd: REPO_ROOT,
    absolute: true,
  });
  for (const file of files) {
    const before = await fs.readFile(file, "utf8");
    const after = before
      .replace(/\$type: "opacity"/g, '$type: "number"')
      .replace(/\$type: "zIndex"/g, '$type: "number"')
      .replace(/\$type: "lineHeight"/g, '$type: "number"')
      .replace(/\$type: "borderStyle"/g, '$type: "strokeStyle"')
      .replace(/\{tracking\./g, "{letter-spacing.");
    if (after !== before) {
      await fs.writeFile(file, after);
      tsChanged++;
    }
  }
}

/** A line-height `$value`: `%` → unitless number; a round-trippable numeric string → number. */
function convertLineHeightValue(v: unknown): unknown {
  if (typeof v !== "string" || v.startsWith("{")) return v;
  if (v.endsWith("%")) return Number(v.slice(0, -1)) / 100;
  if (/^-?\d+(\.\d+)?$/.test(v) && String(Number(v)) === v) return Number(v);
  return v;
}

/** A fontWeight `$value`: a round-trippable integer string → number; references untouched. */
function convertFontWeightValue(v: unknown): unknown {
  if (typeof v === "string" && /^\d+$/.test(v) && String(Number(v)) === v) return Number(v);
  return v;
}

function rewriteTracking(v: unknown): unknown {
  return typeof v === "string" ? v.replace(/\{tracking\./g, "{letter-spacing.") : v;
}

type Entry = { $value?: unknown; $type?: string; [k: string]: unknown };

/** Theme documents: retype base-controlled `$type`s, transform the touched values, repoint tracking. */
async function migrateThemes(): Promise<void> {
  const files = await glob("theme/**/zbk-*.tokens.json", {
    cwd: REPO_ROOT,
    absolute: true,
  });
  for (const file of files) {
    const raw = await fs.readFile(file, "utf8");
    const doc = JSON.parse(raw) as Record<string, Entry>;
    let changed = false;

    for (const [name, entry] of Object.entries(doc)) {
      if (name.startsWith("$") || !entry || typeof entry !== "object") continue;

      // Repoint dangling tracking references wherever they appear.
      const repointed = rewriteTracking(entry.$value);
      if (repointed !== entry.$value) {
        entry.$value = repointed;
        changed = true;
      }

      switch (entry.$type) {
        case "opacity":
          entry.$type = "number";
          changed = true;
          break;
        case "zIndex":
          // The lone non-numeric member of the family is `z-index: auto`.
          entry.$type = entry.$value === "auto" ? "cssDimension" : "number";
          changed = true;
          break;
        case "lineHeight": {
          entry.$type = "number";
          const nv = convertLineHeightValue(entry.$value);
          if (nv !== entry.$value) entry.$value = nv;
          changed = true;
          break;
        }
        case "borderStyle":
          entry.$type = "strokeStyle";
          changed = true;
          break;
        case "fontWeight": {
          const nv = convertFontWeightValue(entry.$value);
          if (nv !== entry.$value) {
            entry.$value = nv;
            changed = true;
          }
          break;
        }
      }
    }

    if (changed) {
      await fs.writeFile(file, JSON.stringify(doc, null, 2) + "\n");
      jsonChanged++;
    }
  }
}

async function main(): Promise<void> {
  await migrateSource();
  await migrateThemes();
  console.log(
    `codemod-2e-numbers-typography: retyped ${tsChanged} component module(s), ${jsonChanged} theme document(s).`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
