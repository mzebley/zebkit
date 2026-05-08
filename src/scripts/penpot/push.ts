#!/usr/bin/env tsx
/**
 * penpot:push — Compiles all Zebkit tokens and writes a W3C DTCG-compliant
 * JSON file ready to import into Penpot via Assets → Design Tokens → Import.
 *
 * The script re-uses the standard Zebkit token pipeline (gatherZebkitFiles +
 * buildZebkitTokens) so it always reflects whatever component selection,
 * custom overrides, and theme are configured in zebkit.config.json. The
 * compiled token map is then converted to DTCG format by transform/to-dtcg.ts
 * and written to dist/penpot-push/zebkit-tokens.tokens.json.
 *
 * ── Flags ─────────────────────────────────────────────────────────────────────
 *
 *   --dry-run   Print the DTCG JSON to stdout (truncated) without writing any
 *               files. Useful for verifying the output format before importing.
 *
 *   --out <dir> Override the default output directory (dist/penpot-push).
 *
 * ── Usage ─────────────────────────────────────────────────────────────────────
 *
 *   npm run penpot:push
 *   npm run penpot:push -- --dry-run
 *   npm run penpot:push -- --out ./design-exports
 */

import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';
import { fileURLToPath } from 'node:url';
import { gatherZebkitFiles } from '@token-scripts/gather-files';
import { buildZebkitTokens } from '@token-scripts/compile-tokens';
import { loadZebkitConfig } from '../config.js';
import { zebkitToDtcg, totalTokensCount } from './transform/to-dtcg.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Parses CLI flags from process.argv. */
function parseArgs(): { dryRun: boolean; outDir: string | undefined } {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const outIdx = args.findIndex((a) => a === '--out');
  const outDir = outIdx !== -1 ? args[outIdx + 1] : undefined;
  return { dryRun, outDir };
}

async function main() {
  const { dryRun, outDir: outDirOverride } = parseArgs();

  // ── Load config ────────────────────────────────────────────────────────────
  // Config is optional; the script works without zebkit.config.json using
  // sensible defaults (all core tokens, no custom overrides).
  const configResult = await loadZebkitConfig();
  const config = configResult?.config ?? {};
  const penpotConfig = config.penpot ?? {};
  const tokensConfig = config.tokens ?? {};

  const destinationPath =
    outDirOverride ??
    path.resolve(process.cwd(), 'dist/penpot-push');

  // Respect component selection from tokens config; default to core-only when
  // no components are listed and includeAllComponents is not set.
  const selectedComponents: string[] = tokensConfig.selectedComponents ?? [];

  // ── Gather token files ─────────────────────────────────────────────────────
  console.log(chalk.cyan('Gathering Zebkit token files…'));
  const { tokenFiles } = await gatherZebkitFiles(
    tokensConfig.includeAllComponents ? [] : selectedComponents
  );

  if (tokenFiles.length === 0) {
    console.error(chalk.red('No token files found. Verify your project structure.'));
    process.exit(1);
  }

  // ── Compile tokens ─────────────────────────────────────────────────────────
  // exportFile=false suppresses the normal JSON/TS/JS token artifacts; we only
  // need the in-memory token map to feed into the DTCG transform.
  console.log(chalk.cyan('Compiling tokens…'));
  const { tokens, layers } = await buildZebkitTokens(
    'penpot-push',
    tokenFiles,
    path.resolve(process.cwd(), 'dist/penpot-push-tmp'),
    tokensConfig.customTokenPath,
    [],
    {},
    false
  );

  if (Object.keys(tokens).length === 0) {
    console.error(chalk.red('No tokens compiled. Check your token source files.'));
    process.exit(1);
  }

  // ── Transform to DTCG ──────────────────────────────────────────────────────
  // penpotConfig.skipTypes lets callers exclude additional token types beyond
  // the built-in skip list (utility, setting, asset).
  console.log(chalk.cyan('Transforming to W3C DTCG format…'));
  const dtcg = zebkitToDtcg(tokens, layers, {
    skipTypes: penpotConfig.skipTypes,
  });

  const tokenCount = totalTokensCount(dtcg);
  const groupCount = Object.keys(dtcg).filter((k) => k !== '$metadata').length;

  // ── Dry run ────────────────────────────────────────────────────────────────
  if (dryRun) {
    console.log(chalk.yellow('\n──── DRY RUN — DTCG output (truncated) ────'));
    const preview = JSON.stringify(dtcg, null, 2).slice(0, 4000);
    console.log(preview);
    console.log(chalk.yellow(`\n${tokenCount} tokens across ${groupCount} groups`));
    console.log(chalk.yellow('Dry run complete. No files written.'));
    return;
  }

  // ── Write output ───────────────────────────────────────────────────────────
  await fs.ensureDir(destinationPath);
  const outputFile = path.join(destinationPath, 'zebkit-tokens.tokens.json');
  await fs.writeJson(outputFile, dtcg, { spaces: 2 });

  console.log(chalk.green(`\n✓ ${tokenCount} tokens across ${groupCount} groups written to:`));
  console.log(chalk.white(`  ${outputFile}`));
  console.log(
    chalk.cyan(
      '\nTo import into Penpot:\n' +
        '  1. Open your Penpot file\n' +
        '  2. Open the Design Tokens panel (Assets → Design Tokens)\n' +
        '  3. Click the import button and select zebkit-tokens.tokens.json\n'
    )
  );
}

main().catch((err) => {
  console.error(chalk.red('penpot:push failed:'), err);
  process.exit(1);
});
