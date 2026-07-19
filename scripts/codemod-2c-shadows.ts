#!/usr/bin/env tsx
/**
 * Phase 2c codemod (plans/dtcg-alignment/plan.md, decisions D5/D11): migrates
 * the legacy `boxShadow` token type to the DTCG composite `shadow` type.
 *
 * The elevation ramp — the only tokens with real shadow strings — is restructured
 * by hand in `src/tokens/elevation/tokens/tokens.ts` (structured layer arrays with
 * a serialize round-trip self-check). Every other shadow token is either the
 * literal `"none"` or a `{elevation.*}` reference, so this codemod is purely
 * mechanical:
 *
 *   - src component modules (`src/components/**\/tokens/tokens.ts`): retype
 *     `boxShadow` → `shadow`; the `none` literal becomes the empty array `[]`
 *     (the `box-shadow: none` convention).
 *   - theme documents (`theme/**\/*.tokens.json`): retype `$type` only — override
 *     `$value`s stay raw strings, substituted verbatim by the merge (the Phase
 *     2a/2b theme policy).
 *
 * Idempotent: retyped entries no longer carry `boxShadow`. Deleted at the end of
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

async function migrateSource(): Promise<void> {
  const files = await glob("src/components/**/tokens/tokens.ts", { cwd: REPO_ROOT, absolute: true });
  for (const file of files) {
    const before = await fs.readFile(file, "utf8");
    // `none` shadow entries → empty array. Only matches the two-line pair, so a
    // `$value: "none"` on a non-shadow entry (utility/textTransform/…) is untouched.
    let after = before.replace(
      /\$value:\s*"none",(\s*\n\s*)\$type:\s*"boxShadow",/g,
      '$value: [],$1$type: "shadow",'
    );
    // Remaining shadow entries (references) keep their value, just retype.
    after = after.replace(/(\$type:\s*)"boxShadow"/g, '$1"shadow"');
    if (after !== before) {
      await fs.writeFile(file, after);
      tsChanged++;
    }
  }
}

async function migrateThemes(): Promise<void> {
  const files = await glob("theme/**/*.tokens.json", { cwd: REPO_ROOT, absolute: true });
  for (const file of files) {
    const before = await fs.readFile(file, "utf8");
    const after = before.replace(/("\$type":\s*)"boxShadow"/g, '$1"shadow"');
    if (after !== before) {
      await fs.writeFile(file, after);
      jsonChanged++;
    }
  }
}

async function main(): Promise<void> {
  await migrateSource();
  await migrateThemes();
  console.log(`codemod-2c-shadows: retyped ${tsChanged} source module(s), ${jsonChanged} theme document(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
