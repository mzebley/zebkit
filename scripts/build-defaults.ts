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
import { isVariantOverrideFile } from '../src/scripts/tokens/compile-variant-helpers.js';
import { getKnownComponents } from '../src/scripts/known-components.js';
import { toDtcgDocuments, type ModuleMeta } from '../src/scripts/tokens/dtcg-document.js';
import type { LayerName } from '../src/definitions/layers.js';
import type { TokenInterface, TokenGroupExtensions } from '../src/definitions/tokens.js';
import { getBuiltInThemeNames, DEFAULT_THEME_NAME, resolveSourceThemeOverridePath } from '../src/scripts/theme-presets.js';
import {
  cssDestinationArtifactName,
  deriveDirectTokenCssDestinations,
} from '../src/scripts/tokens/css-token-destinations.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const defaultsDir = path.resolve(__dirname, '../dist/cli/defaults');
const presetsDir = path.resolve(__dirname, '../dist/cli/presets');
const SHARED_DEFAULT_ARTIFACTS = new Set(['component-tokens.json', 'css-properties.json']);

interface ManifestModule {
  key: string;
  layer: string;
  file: string;
}

async function buildDefaults() {
  console.log('Building token defaults for CLI distribution...');
  // `component-tokens.json` shares this directory but is owned by
  // build:components. Snapshot modules are reconciled after generation so
  // retired modules disappear without deleting another generator's output.
  await fs.ensureDir(defaultsDir);
  await fs.emptyDir(presetsDir);
  const previousDefaultModuleFiles = await readManifestModuleFiles(defaultsDir);

  // Gather all core token files (no components, no SCSS needed)
  const files = await gatherZebkitFiles();

  // Run the full token pipeline in-memory (no CSS compilation, no file export)
  const { tokens, layers, moduleMetadata, groupExtensions, externalModules } = await buildZebkitTokens(DEFAULT_THEME_NAME, files.tokenFiles, defaultsDir, undefined, [], { splitMode: 'combined' }, false);

  if (Object.keys(tokens).length === 0) {
    console.error('No tokens found — aborting.');
    process.exit(1);
  }

  const defaultManifest = await writeSnapshotDir(
    defaultsDir,
    tokens,
    layers,
    groupExtensions,
    externalModules,
    moduleMetadata
  );
  await fs.writeJson(
    path.join(defaultsDir, cssDestinationArtifactName()),
    await deriveDirectTokenCssDestinations(tokens),
    { spaces: 2 }
  );

  // Snapshot built-in variant configs (raw, as-authored) so the installed CLI can
  // register them without the TS sources — those don't ship, and the bundled CLI
  // couldn't dynamically import .ts anyway.
  const variantConfigs = await discoverVariantConfigs();
  const variantsPath = path.join(defaultsDir, 'variants.json');
  await fs.writeJson(variantsPath, variantConfigs, { spaces: 2 });
  console.log(`Wrote ${variantConfigs.length} built-in variant config(s) to ${variantsPath}`);

  // Snapshot the component vocabulary so the installed CLI can validate the
  // `components` config block and offer init choices without the TS sources.
  const componentNames = await getKnownComponents();
  const componentsPath = path.join(defaultsDir, 'components.json');
  await fs.writeJson(componentsPath, componentNames, { spaces: 2 });
  console.log(`Wrote ${componentNames.length} component name(s) to ${componentsPath}`);

  await removeRetiredDefaultModules(previousDefaultModuleFiles, defaultManifest);

  const builtInThemes = await getBuiltInThemeNames();
  const presetThemeNames = builtInThemes.filter((theme) => theme !== DEFAULT_THEME_NAME);

  for (const themeName of presetThemeNames) {
    const overridePath = resolveSourceThemeOverridePath(themeName);
    if (!overridePath) continue;

    const presetOutputDir = path.join(presetsDir, themeName);
    await fs.ensureDir(presetOutputDir);

    const {
      tokens: presetTokens,
      layers: presetLayers,
      moduleMetadata: presetModuleMetadata,
      groupExtensions: presetGroupExtensions,
      externalModules: presetExternalModules,
    } = await buildZebkitTokens(
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

    await writeSnapshotDir(
      presetOutputDir,
      presetTokens,
      presetLayers,
      presetGroupExtensions,
      presetExternalModules,
      presetModuleMetadata
    );
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
  // Rebuild the shipped preset snapshot exactly. Without clearing this folder,
  // a renamed or retired override can survive into published CLI pulls.
  await fs.emptyDir(outputDir);

  const variantFiles = await glob('**/*.json', {
    cwd: sourceDir,
    absolute: true,
    nodir: true,
  });

  const matchingFiles = variantFiles.filter(isVariantOverrideFile);

  if (matchingFiles.length === 0) {
    return;
  }

  for (const file of matchingFiles) {
    await fs.copy(file, path.join(outputDir, path.basename(file)));
  }
}

async function readManifestModuleFiles(directory: string): Promise<Set<string>> {
  try {
    const manifest = (await fs.readJson(path.join(directory, 'manifest.json'))) as {
      modules?: Array<{ file?: unknown }>;
    };
    const modules = Array.isArray(manifest.modules) ? manifest.modules : [];
    return new Set(
      modules
        .map((module) => module.file)
        .filter(
          (file): file is string =>
            typeof file === 'string' &&
            path.basename(file) === file &&
            file.endsWith('.json') &&
            !SHARED_DEFAULT_ARTIFACTS.has(file)
        )
    );
  } catch {
    return new Set();
  }
}

async function removeRetiredDefaultModules(
  previousFiles: ReadonlySet<string>,
  manifest: { modules: ManifestModule[] }
) {
  const expectedFiles = new Set(manifest.modules.map((module) => module.file));

  await Promise.all(
    [...previousFiles]
      .filter((file) => !expectedFiles.has(file))
      .map((file) => fs.remove(path.join(defaultsDir, file)))
  );
}

async function writeSnapshotDir(
  outputDir: string,
  tokens: Record<string, unknown>,
  layers: Record<string, LayerName>,
  groupExtensions: Record<string, unknown> = {},
  externalModules: ReadonlySet<string> = new Set(),
  moduleMetadata: Record<string, ModuleMeta> = {}
) {
  const manifest: { modules: ManifestModule[] } = { modules: [] };

  // Each snapshot is a DTCG document (Phase 3): the module key comes from the
  // filename, and layer / emission mode / fluid-scale controls ride the
  // group-level `$extensions["dev.zebkit"]` block (a hoisted group `$type`
  // appears when the module is homogeneous). The JSON-mode loader
  // (fromDtcgDocument) reconstructs the internal token map from it. `toDtcgDocuments`
  // is the single boundary shared with `writeTokensToFile` and `check:dtcg-validate`.
  const documents = toDtcgDocuments({
    tokens: tokens as Record<string, TokenInterface>,
    layers,
    groupExtensions: groupExtensions as Record<string, TokenGroupExtensions | undefined>,
    externalModules,
    moduleMetadata,
  });

  for (const tokenKey of Object.keys(tokens)) {
    const layer: LayerName = layers[tokenKey] ?? 'base';
    const fileName = `${tokenKey}.json`;
    await fs.writeJson(path.join(outputDir, fileName), documents[tokenKey], { spaces: 2 });
    manifest.modules.push({ key: tokenKey, layer, file: fileName });
  }

  await fs.writeJson(path.join(outputDir, 'manifest.json'), manifest, { spaces: 2 });

  console.log(`\nWrote ${manifest.modules.length} token modules to ${outputDir}`);
  console.log(`Manifest: ${path.join(outputDir, 'manifest.json')}`);
  return manifest;
}

buildDefaults().catch((err) => {
  console.error('build-defaults failed:', err);
  process.exit(1);
});
