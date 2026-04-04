#!/usr/bin/env tsx
/**
 * Pre-publish script: compiles all core token modules to JSON snapshots.
 * Runs via tsx (dev context) during `npm run build:defaults` before publishing.
 * Output goes to dist/cli/defaults/ and ships with the npm package so the
 * installed CLI can load token defaults without dynamic TS imports.
 */

import path from 'path';
import fs from 'fs-extra';
import { fileURLToPath } from 'node:url';
import { gatherZebkitFiles } from '../src/scripts/tokens/gather-files.js';
import { buildZebkitTokens } from '../src/scripts/tokens/compile-tokens.js';
import type { LayerName } from '../src/definitions/layers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const defaultsDir = path.resolve(__dirname, '../dist/cli/defaults');

interface ManifestModule {
  key: string;
  layer: string;
  file: string;
}

async function buildDefaults() {
  console.log('Building token defaults for CLI distribution...');
  await fs.ensureDir(defaultsDir);

  // Gather all core token files (no components, no SCSS needed)
  const files = await gatherZebkitFiles([]);

  // Run the full token pipeline in-memory (no CSS compilation, no file export)
  const { tokens, layers } = await buildZebkitTokens(
    'default',
    files.tokenFiles,
    defaultsDir,
    undefined,
    [],
    { splitMode: 'combined' },
    false
  );

  if (Object.keys(tokens).length === 0) {
    console.error('No tokens found — aborting.');
    process.exit(1);
  }

  const manifest: { modules: ManifestModule[] } = { modules: [] };

  for (const [tokenKey, tokenData] of Object.entries(tokens)) {
    const layer: LayerName = layers[tokenKey] ?? 'base';
    const fileName = `${tokenKey}.json`;
    const filePath = path.join(defaultsDir, fileName);

    // Write token data with metadata fields so the CLI can reconstruct key/layer
    // without needing a separate manifest lookup per-file.
    await fs.writeJson(
      filePath,
      { _key: tokenKey, _layer: layer, ...tokenData },
      { spaces: 2 }
    );

    manifest.modules.push({ key: tokenKey, layer, file: fileName });
  }

  await fs.writeJson(path.join(defaultsDir, 'manifest.json'), manifest, { spaces: 2 });

  console.log(`\nWrote ${manifest.modules.length} token modules to ${defaultsDir}`);
  console.log(`Manifest: ${path.join(defaultsDir, 'manifest.json')}`);
}

buildDefaults().catch((err) => {
  console.error('build-defaults failed:', err);
  process.exit(1);
});
