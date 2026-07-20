#!/usr/bin/env tsx
/**
 * DTCG export-validation gate (plans/dtcg-alignment/plan.md, Phase 4 — locks).
 *
 * Rebuilds the exported token documents fresh from source — the default theme
 * plus every built-in preset, exactly as `build:defaults` emits them — and runs
 * `validateDtcgDocument` over each module. This turns "the exports are valid
 * DTCG" from a fact that happens to be true today into one the build enforces:
 * deleting a `$`-field, mistyping a `$type`, or slipping in a `$ref`/`$extends`
 * fails `npm run check` with a message that names the module and token.
 *
 * It validates the LIVE pipeline output (not the checked-in snapshots), so a
 * source edit that would produce an invalid export is caught before anything is
 * regenerated or committed.
 *
 * Usage: npm run check:dtcg-validate
 */
import path from 'path';
import chalk from 'chalk';
import { fileURLToPath } from 'node:url';
import { gatherZebkitFiles } from '../src/scripts/tokens/gather-files.js';
import { buildZebkitTokens } from '../src/scripts/tokens/compile-tokens.js';
import {
  fromDtcgDocument,
  toDtcgDocuments,
  toStrictDtcgDocument,
  validateDtcgDocument,
} from '../src/scripts/tokens/dtcg-document.js';
import { isDtcgSpecType } from '../src/definitions/dtcg.js';
import {
  getBuiltInThemeNames,
  DEFAULT_THEME_NAME,
  resolveSourceThemeOverridePath,
} from '../src/scripts/theme-presets.js';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '..');

/** Compile one theme's modules in-memory and serialize them to DTCG documents. */
async function documentsForTheme(
  themeName: string,
  tokenFiles: string[],
  overridePaths: string[]
): Promise<Record<string, Record<string, unknown>>> {
  const { tokens, layers, groupExtensions, externalModules } = await buildZebkitTokens(
    themeName,
    tokenFiles,
    path.join(REPO_ROOT, 'tmp', 'dtcg-validate', themeName),
    undefined,
    [],
    { splitMode: 'combined', overridePaths },
    false
  );
  return toDtcgDocuments({ tokens, layers, groupExtensions, externalModules });
}

async function main(): Promise<void> {
  process.chdir(REPO_ROOT);
  const files = await gatherZebkitFiles();

  const builds: Array<{ theme: string; overridePaths: string[] }> = [
    { theme: DEFAULT_THEME_NAME, overridePaths: [] },
  ];
  for (const theme of await getBuiltInThemeNames()) {
    if (theme === DEFAULT_THEME_NAME) continue;
    const overridePath = resolveSourceThemeOverridePath(theme);
    if (overridePath) builds.push({ theme, overridePaths: [overridePath] });
  }

  const problems: string[] = [];
  let moduleCount = 0;
  let strictDropTotal = 0;

  for (const build of builds) {
    console.log(chalk.cyan(`\n--- validating export: ${build.theme} ---`));
    const documents = await documentsForTheme(build.theme, files.tokenFiles, build.overridePaths);
    for (const [key, doc] of Object.entries(documents)) {
      moduleCount += 1;
      const label = `${build.theme}/${key}`;
      for (const error of validateDtcgDocument(doc, label)) problems.push(error);

      // Strict-mode export (D9): the spec-only reduction must itself be valid and
      // contain no proprietary `$type` — it is what tools that reject unknown
      // types will consume.
      const { document, dropped } = toStrictDtcgDocument(doc);
      strictDropTotal += dropped.length;
      for (const error of validateDtcgDocument(document, `${label} (strict)`)) problems.push(error);
      for (const [name, entry] of Object.entries(fromDtcgDocument(document).entries)) {
        if (!isDtcgSpecType(entry.$type)) {
          problems.push(`${label} (strict).${name}: non-spec $type '${entry.$type}' survived strict export`);
        }
      }
    }
  }

  // The corpus carries proprietary-typed tokens (cssDimension, display, …), so a
  // real strict export must shed some — a zero total means the filter regressed.
  if (strictDropTotal === 0) {
    problems.push('strict export dropped nothing across the corpus — the D9 spec-only filter is not firing');
  }

  if (problems.length > 0) {
    console.error(
      chalk.red(`\nDTCG export validation failed (${problems.length} problem(s)):`)
    );
    for (const problem of problems) console.error(chalk.red(`  - ${problem}`));
    console.error(
      chalk.yellow(
        '\nEvery exported token document must be conformant DTCG: each leaf needs a ' +
          '$value (or a fluid-scale index), a $type in the allowed set, and a $description; ' +
          '$ref / $extends are rejected (use a {curly-brace} reference).'
      )
    );
    process.exitCode = 1;
    return;
  }

  console.log(
    chalk.green(
      `\nDTCG export validation OK — ${moduleCount} module document(s) across ${builds.length} theme(s) conformant ` +
        `(strict mode sheds ${strictDropTotal} proprietary-typed token(s)).`
    )
  );
}

main().catch((error) => {
  console.error(chalk.red('check-dtcg-validate failed:'), error);
  process.exit(1);
});
