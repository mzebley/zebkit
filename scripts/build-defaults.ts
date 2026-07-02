#!/usr/bin/env tsx
/**
 * Pre-publish script: compiles all core token modules to JSON snapshots.
 * Runs via tsx (dev context) during `npm run build:defaults` before publishing.
 * Output goes to dist/cli/defaults/ and ships with the npm package so the
 * installed CLI can load token defaults without dynamic TS imports.
 */

import path from 'path';
import fs from 'fs-extra';
import { glob } from 'glob';
import { fileURLToPath } from 'node:url';
import { gatherZebkitFiles } from '../src/scripts/tokens/gather-files.js';
import { buildZebkitTokens } from '../src/scripts/tokens/compile-tokens.js';
import { discoverVariantConfigs } from '../src/scripts/tokens/compile-variants.js';
import type { LayerName } from '../src/definitions/layers.js';
import { getBuiltInThemeNames, DEFAULT_THEME_NAME, resolveSourceThemeOverridePath } from '../src/scripts/theme-presets.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const defaultsDir = path.resolve(__dirname, '../dist/cli/defaults');
const presetsDir = path.resolve(__dirname, '../dist/cli/presets');

interface ManifestModule {
  key: string;
  layer: string;
  file: string;
}

async function buildDefaults() {
  console.log('Building token defaults for CLI distribution...');
  await fs.ensureDir(defaultsDir);
  await fs.ensureDir(presetsDir);

  // Gather all core token files (no components, no SCSS needed)
  const files = await gatherZebkitFiles([]);

  // Run the full token pipeline in-memory (no CSS compilation, no file export)
  const { tokens, layers } = await buildZebkitTokens(DEFAULT_THEME_NAME, files.tokenFiles, defaultsDir, undefined, [], { splitMode: 'combined' }, false);

  if (Object.keys(tokens).length === 0) {
    console.error('No tokens found — aborting.');
    process.exit(1);
  }

  await writeSnapshotDir(defaultsDir, tokens, layers);

  // Snapshot built-in variant configs (raw, as-authored) so the installed CLI can
  // register them without the TS sources — those don't ship, and the bundled CLI
  // couldn't dynamically import .ts anyway.
  const variantConfigs = await discoverVariantConfigs();
  const variantsPath = path.join(defaultsDir, 'variants.json');
  await fs.writeJson(variantsPath, variantConfigs, { spaces: 2 });
  console.log(`Wrote ${variantConfigs.length} built-in variant config(s) to ${variantsPath}`);

  const builtInThemes = await getBuiltInThemeNames();
  const presetThemeNames = builtInThemes.filter((theme) => theme !== DEFAULT_THEME_NAME);

  for (const themeName of presetThemeNames) {
    const overridePath = resolveSourceThemeOverridePath(themeName);
    if (!overridePath) continue;

    const presetOutputDir = path.join(presetsDir, themeName);
    await fs.ensureDir(presetOutputDir);

    const { tokens: presetTokens, layers: presetLayers } = await buildZebkitTokens(
      themeName,
      files.tokenFiles,
      presetOutputDir,
      undefined,
      [],
      {
        splitMode: 'combined',
        overridePaths: [overridePath],
      },
      false
    );

    await writeSnapshotDir(presetOutputDir, presetTokens, presetLayers);
    await copyVariantOverrideFiles(overridePath, path.join(presetOutputDir, 'variant-overrides'));
  }

  await fs.writeJson(
    path.join(presetsDir, 'manifest.json'),
    { themes: presetThemeNames },
    { spaces: 2 }
  );

  console.log(`Theme presets: ${path.join(presetsDir, 'manifest.json')}`);
}

async function copyVariantOverrideFiles(sourceDir: string, outputDir: string) {
  const variantFiles = await glob('**/*.json', {
    cwd: sourceDir,
    absolute: true,
    nodir: true,
  });

  const matchingFiles = variantFiles.filter((file) =>
    /-variants$/i.test(path.basename(file, path.extname(file))) ||
    /\.variant\./i.test(path.basename(file))
  );

  if (matchingFiles.length === 0) {
    return;
  }

  await fs.ensureDir(outputDir);

  for (const file of matchingFiles) {
    await fs.copy(file, path.join(outputDir, path.basename(file)));
  }
}

async function writeSnapshotDir(
  outputDir: string,
  tokens: Record<string, unknown>,
  layers: Record<string, LayerName>
) {
  const manifest: { modules: ManifestModule[] } = { modules: [] };

  for (const [tokenKey, tokenData] of Object.entries(tokens)) {
    const layer: LayerName = layers[tokenKey] ?? 'base';
    const fileName = `${tokenKey}.json`;
    const filePath = path.join(outputDir, fileName);

    // Write token data with metadata fields so the CLI can reconstruct key/layer
    // without needing a separate manifest lookup per-file.
    await fs.writeJson(
      filePath,
      { _key: tokenKey, _layer: layer, ...tokenData },
      { spaces: 2 }
    );

    manifest.modules.push({ key: tokenKey, layer, file: fileName });
  }

  await fs.writeJson(path.join(outputDir, 'manifest.json'), manifest, { spaces: 2 });

  console.log(`\nWrote ${manifest.modules.length} token modules to ${outputDir}`);
  console.log(`Manifest: ${path.join(outputDir, 'manifest.json')}`);
}

buildDefaults().catch((err) => {
  console.error('build-defaults failed:', err);
  process.exit(1);
});
