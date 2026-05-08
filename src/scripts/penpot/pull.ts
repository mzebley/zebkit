#!/usr/bin/env tsx
/**
 * penpot:pull — Fetches design tokens from a Penpot file and writes them as
 * Zebkit-compatible JSON override files to dist/penpot-pull/.
 *
 * Two modes:
 *   API mode  (default): calls the Penpot RPC API using PENPOT_ACCESS_TOKEN and
 *                        PENPOT_FILE_ID (or zebkit.config.json penpot.fileId).
 *   File mode (--file):  reads a token JSON file exported manually from Penpot.
 *
 * Usage:
 *   npm run penpot:pull
 *   npm run penpot:pull -- --file ./exported-tokens.json
 *   npm run penpot:pull -- --out ./my-output-dir
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

function parseArgs(): { filePath: string | undefined; outDir: string | undefined } {
  const args = process.argv.slice(2);
  const fileIdx = args.findIndex((a) => a === '--file');
  const filePath = fileIdx !== -1 ? args[fileIdx + 1] : undefined;
  const outIdx = args.findIndex((a) => a === '--out');
  const outDir = outIdx !== -1 ? args[outIdx + 1] : undefined;
  return { filePath, outDir };
}

async function loadFromFile(filePath: string): Promise<DtcgRoot | TokensStudioRoot> {
  const resolved = path.resolve(process.cwd(), filePath);
  if (!(await fs.pathExists(resolved))) {
    throw new Error(`Token file not found: ${resolved}`);
  }
  return fs.readJson(resolved) as Promise<DtcgRoot | TokensStudioRoot>;
}

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

  // Penpot stores tokens in file.data.tokens (keyed by set name)
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

  // Penpot wraps each set as a top-level key; reconstruct a DTCG-compatible root
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
  console.log(chalk.cyan('Transforming tokens to Zebkit format…'));
  const modules = dtcgToZebkit(rawTokens);

  if (modules.length === 0) {
    console.error(chalk.red('No tokens could be parsed from the input.'));
    process.exit(1);
  }

  // ── Load source tokens for diff ────────────────────────────────────────────
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
    // Diff is best-effort; don't fail the pull if source tokens can't be loaded
  }

  // ── Write override files ───────────────────────────────────────────────────
  await fs.ensureDir(outputPath);

  let totalTokens = 0;
  for (const { key, tokens } of modules) {
    const filePath = path.join(outputPath, `${key}.tokens.json`);
    await fs.writeJson(filePath, tokens, { spaces: 2 });
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
