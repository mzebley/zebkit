#!/usr/bin/env tsx
/**
 * penpot:pull — Fetches design tokens from a Penpot file and writes them as
 * Zebkit-compatible JSON override files.
 *
 * The pull command is the return leg of the sync loop: after designers have
 * edited token values in Penpot, this script brings those edits back into the
 * Zebkit build pipeline as customTokenPath override files.
 *
 * ── Modes ─────────────────────────────────────────────────────────────────────
 *
 * API mode (default)
 *   Calls GET /api/rpc/command/get-file on the Penpot instance to fetch the
 *   file's token data directly. Requires PENPOT_ACCESS_TOKEN and
 *   PENPOT_FILE_ID in the environment (or penpot.fileId in zebkit.config.json).
 *   If the API call fails (e.g. the Penpot instance uses transit+json and
 *   rejects the application/json Accept header), the error message suggests
 *   falling back to file mode.
 *
 * File mode (--file <path>)
 *   Reads a token JSON file that was exported manually from Penpot
 *   (Assets → Design Tokens → Export). Accepts both W3C DTCG format and the
 *   Tokens Studio format that Penpot currently exports. No authentication is
 *   required. This is the most reliable path until Penpot's API JSON support
 *   is confirmed stable.
 *
 * ── Output ────────────────────────────────────────────────────────────────────
 *
 * One JSON file per module is written to dist/penpot-pull/ (or the path set
 * via --out or penpot.pullOutputPath in zebkit.config.json). Each file is a
 * flat TokenInterface map compatible with Zebkit's customTokenPath override
 * mechanism. After reviewing the diff printed to stdout, point your config at
 * the output directory:
 *
 *   "tokens": { "customTokenPath": "dist/penpot-pull" }
 *
 * ── Flags ─────────────────────────────────────────────────────────────────────
 *
 *   --file <path>  Read tokens from a locally exported JSON file instead of
 *                  calling the Penpot API.
 *
 *   --out <dir>    Override the output directory (default: dist/penpot-pull).
 *
 * ── Usage ─────────────────────────────────────────────────────────────────────
 *
 *   npm run penpot:pull
 *   npm run penpot:pull -- --file ./exported-tokens.json
 *   npm run penpot:pull -- --out ./token-overrides
 */

import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';
import { loadZebkitConfig } from '../config.js';
import { fetchPenpotFile, resolvePenpotClientConfig } from './client.js';
import { dtcgToZebkit, diffTokens } from './transform/from-dtcg.js';
import { gatherZebkitFiles } from '@token-scripts/gather-files';
import { buildZebkitTokens } from '@token-scripts/compile-tokens';
import type { DtcgRoot, TokensStudioRoot } from './types.js';

/** Parses CLI flags from process.argv. */
function parseArgs(): { filePath: string | undefined; outDir: string | undefined } {
  const args = process.argv.slice(2);
  const fileIdx = args.findIndex((a) => a === '--file');
  const filePath = fileIdx !== -1 ? args[fileIdx + 1] : undefined;
  const outIdx = args.findIndex((a) => a === '--out');
  const outDir = outIdx !== -1 ? args[outIdx + 1] : undefined;
  return { filePath, outDir };
}

/**
 * Reads and parses a locally exported Penpot token file.
 * Supports any JSON file — DTCG or Tokens Studio format is detected and
 * normalised downstream in dtcgToZebkit.
 */
async function loadFromFile(filePath: string): Promise<DtcgRoot | TokensStudioRoot> {
  const resolved = path.resolve(process.cwd(), filePath);
  if (!(await fs.pathExists(resolved))) {
    throw new Error(`Token file not found: ${resolved}`);
  }
  return fs.readJson(resolved) as Promise<DtcgRoot | TokensStudioRoot>;
}

/**
 * Fetches token data from the Penpot RPC API.
 *
 * Penpot stores imported tokens under file.data.tokens keyed by set name.
 * Returns undefined (with a helpful message) if the API call fails or if
 * no tokens are found in the file — pull should degrade gracefully since
 * the API token format is underdocumented and may change.
 */
async function loadFromApi(
  penpotConfig: { instanceUrl?: string; fileId?: string }
): Promise<DtcgRoot | TokensStudioRoot | undefined> {
  const resolved = resolvePenpotClientConfig({
    instanceUrl: penpotConfig.instanceUrl,
    fileId: penpotConfig.fileId,
  });
  if (!resolved) return undefined;

  const { client, fileId } = resolved;
  console.log(chalk.cyan(`Fetching tokens from Penpot file ${fileId}…`));

  const fileData = await fetchPenpotFile(fileId, client);
  if (!fileData) {
    console.error(
      chalk.yellow(
        '\nCould not fetch token data from the Penpot API.\n' +
          'Try exporting tokens manually from Penpot and running:\n' +
          '  npm run penpot:pull -- --file ./exported-tokens.json'
      )
    );
    return undefined;
  }

  const tokens = fileData.data?.tokens;
  if (!tokens || Object.keys(tokens).length === 0) {
    console.warn(
      chalk.yellow(
        'No tokens found in the Penpot file.\n' +
          'Import tokens into the file first (penpot:push), then make edits, then pull.'
      )
    );
    return undefined;
  }

  // Penpot wraps each token set as a top-level key inside data.tokens.
  // The shape is compatible with a DTCG/Tokens Studio root document.
  return tokens as unknown as DtcgRoot | TokensStudioRoot;
}

async function main() {
  const { filePath, outDir: outDirOverride } = parseArgs();

  // ── Load config ────────────────────────────────────────────────────────────
  const configResult = await loadZebkitConfig();
  const config = configResult?.config ?? {};
  const penpotConfig = config.penpot ?? {};
  const tokensConfig = config.tokens ?? {};

  const outputPath = path.resolve(
    process.cwd(),
    outDirOverride ?? penpotConfig.pullOutputPath ?? 'dist/penpot-pull'
  );

  // ── Load raw token data ────────────────────────────────────────────────────
  let rawTokens: DtcgRoot | TokensStudioRoot | undefined;

  if (filePath) {
    console.log(chalk.cyan(`Loading tokens from file: ${filePath}`));
    rawTokens = await loadFromFile(filePath);
  } else {
    rawTokens = await loadFromApi(penpotConfig);
  }

  if (!rawTokens) {
    process.exit(1);
  }

  // ── Transform to Zebkit ────────────────────────────────────────────────────
  // dtcgToZebkit auto-detects format (DTCG vs Tokens Studio) and normalises
  // before converting, so rawTokens can be either format.
  console.log(chalk.cyan('Transforming tokens to Zebkit format…'));
  const modules = dtcgToZebkit(rawTokens);

  if (modules.length === 0) {
    console.error(chalk.red('No tokens could be parsed from the input.'));
    process.exit(1);
  }

  // ── Compute diff vs source (best-effort) ──────────────────────────────────
  // Compile the source tokens to produce a baseline for the diff summary.
  // If this fails for any reason the pull still succeeds — the diff is purely
  // informational and is not needed to write the override files.
  let diff: { added: number; changed: number; removed: number } | undefined;
  try {
    const { tokenFiles } = await gatherZebkitFiles(
      tokensConfig.includeAllComponents ? [] : (tokensConfig.selectedComponents ?? [])
    );
    const { tokens: sourceTokens } = await buildZebkitTokens(
      'diff-base',
      tokenFiles,
      path.resolve(process.cwd(), 'dist/penpot-diff-tmp'),
      tokensConfig.customTokenPath,
      [],
      {},
      false
    );
    diff = diffTokens(modules, sourceTokens);
  } catch {
    // Swallow — diff is best-effort
  }

  // ── Write override files ───────────────────────────────────────────────────
  await fs.ensureDir(outputPath);

  let totalTokens = 0;
  for (const { key, tokens } of modules) {
    // Each module is written as its own file so consumers can selectively
    // apply individual modules via a customTokenPath directory scan.
    const outFile = path.join(outputPath, `${key}.tokens.json`);
    await fs.writeJson(outFile, tokens, { spaces: 2 });
    totalTokens += Object.keys(tokens).length;
  }

  console.log(
    chalk.green(
      `\n✓ ${totalTokens} tokens across ${modules.length} modules written to:\n  ${outputPath}`
    )
  );

  if (diff) {
    console.log(
      chalk.cyan(
        `\nDiff vs source: ${diff.added} added, ${diff.changed} changed, ${diff.removed} removed`
      )
    );
  }

  console.log(
    chalk.cyan(
      '\nTo apply these overrides, add to zebkit.config.json:\n' +
        `  "tokens": { "customTokenPath": "${path.relative(process.cwd(), outputPath)}" }`
    )
  );
}

main().catch((err) => {
  console.error(chalk.red('penpot:pull failed:'), err);
  process.exit(1);
});
