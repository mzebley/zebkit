#!/usr/bin/env tsx

import fs from 'fs-extra';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { glob } from 'glob';

import { buildZebkitTokens } from '../src/scripts/tokens/compile-tokens.js';
import { isVariantOverrideFile } from '../src/scripts/tokens/compile-variant-helpers.js';
import {
  fromDtcgDocument,
  toDtcgDocuments,
  validateDtcgDocuments,
} from '../src/scripts/tokens/dtcg-document.js';
import {
  DEFAULT_THEME_NAME,
  getBuiltInThemeNames,
  resolveSourceThemeOverridePath,
} from '../src/scripts/theme-presets.js';
import { extractZbkTokens } from '../src/scripts/prune/content-scan.js';
import { deriveDirectTokenCssDestinations } from '../src/scripts/tokens/css-token-destinations.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULTS_DIR = path.join(REPO_ROOT, 'dist', 'cli', 'defaults');
const PRESETS_DIR = path.join(REPO_ROOT, 'dist', 'cli', 'presets');
const COMPONENT_BUNDLE = path.join(REPO_ROOT, 'dist', 'components', 'index.js');
const COMPONENT_TOKENS_FILE = path.join(DEFAULTS_DIR, 'component-tokens.json');

interface SnapshotManifest {
  modules: Array<{ key: string; layer: string; file: string }>;
}

async function gatherSourceTokenFiles(): Promise<string[]> {
  const [languageTokens, componentTokens] = await Promise.all([
    glob('**/tokens/tokens.ts', {
      cwd: path.join(REPO_ROOT, 'src', 'tokens'),
      nodir: true,
    }),
    glob('**/tokens/tokens.ts', {
      cwd: path.join(REPO_ROOT, 'src', 'components'),
      nodir: true,
    }),
  ]);

  return [
    ...languageTokens.sort().map((file) => path.join('tokens', file)),
    ...componentTokens.sort().map((file) => path.join('components', file)),
  ];
}

async function readSnapshot(directory: string): Promise<{
  manifest: SnapshotManifest;
  documents: Record<string, Record<string, unknown>>;
}> {
  const manifest = (await fs.readJson(path.join(directory, 'manifest.json'))) as SnapshotManifest;
  const documents: Record<string, Record<string, unknown>> = {};
  for (const module of manifest.modules) {
    documents[module.key] = (await fs.readJson(
      path.join(directory, module.file)
    )) as Record<string, unknown>;
  }
  return { manifest, documents };
}

function firstDifference(actual: unknown, expected: unknown, at = '$'): string {
  if (Object.is(actual, expected)) return '';
  if (
    actual === null ||
    expected === null ||
    typeof actual !== 'object' ||
    typeof expected !== 'object'
  ) {
    return `${at}: ${JSON.stringify(actual)} !== ${JSON.stringify(expected)}`;
  }

  const actualRecord = actual as Record<string, unknown>;
  const expectedRecord = expected as Record<string, unknown>;
  const keys = new Set([...Object.keys(actualRecord), ...Object.keys(expectedRecord)]);
  for (const key of keys) {
    if (!(key in actualRecord)) return `${at}.${key}: missing from actual`;
    if (!(key in expectedRecord)) return `${at}.${key}: unexpected in actual`;
    const difference = firstDifference(actualRecord[key], expectedRecord[key], `${at}.${key}`);
    if (difference) return difference;
  }
  return '';
}

function assertEqual(actual: unknown, expected: unknown, message: string): void {
  if (!isDeepStrictEqual(actual, expected)) {
    throw new Error(`${message}\n${firstDifference(actual, expected)}`);
  }
}

async function assertArtifactParity(): Promise<void> {
  const tokenFiles = await gatherSourceTokenFiles();
  const builtInThemes = await getBuiltInThemeNames();
  const themes = [
    DEFAULT_THEME_NAME,
    ...builtInThemes.filter((theme) => theme !== DEFAULT_THEME_NAME),
  ];
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'zebkit-artifact-parity-'));

  try {
    for (const theme of themes) {
      const overridePath = resolveSourceThemeOverridePath(theme);
      const source = await buildZebkitTokens(
        theme,
        tokenFiles,
        path.join(tmpDir, theme),
        undefined,
        [],
        {
          splitMode: 'combined',
          overridePaths: overridePath ? [overridePath] : [],
        },
        false
      );
      const snapshotDir =
        theme === DEFAULT_THEME_NAME ? DEFAULTS_DIR : path.join(PRESETS_DIR, theme);
      if (theme === DEFAULT_THEME_NAME) {
        assertEqual(
          await fs.readJson(path.join(DEFAULTS_DIR, 'css-properties.json')),
          await deriveDirectTokenCssDestinations(source.tokens),
          'css-properties.json does not match shipped CSS bindings'
        );
      }
      const { manifest, documents } = await readSnapshot(snapshotDir);
      const sourceDocuments = toDtcgDocuments({
        tokens: source.tokens,
        layers: source.layers,
        groupExtensions: source.groupExtensions,
        externalModules: source.externalModules,
        moduleMetadata: source.moduleMetadata,
      });
      const validationProblems = validateDtcgDocuments(documents, `published/${theme}`);
      if (validationProblems.length > 0) {
        throw new Error(validationProblems.join('\n'));
      }
      assertEqual(
        manifest.modules.map((module) => module.key),
        Object.keys(source.tokens),
        `${theme}: snapshot manifest module order does not match the source build`
      );

      for (const module of manifest.modules) {
        const parsed = fromDtcgDocument(documents[module.key], { mode: 'runtime' });
        const expected = fromDtcgDocument(sourceDocuments[module.key], { mode: 'runtime' });
        assertEqual(
          parsed.entries,
          expected.entries,
          `${theme}/${module.key}: bundled snapshot does not round-trip to the source tokens`
        );
        assertEqual(
          parsed.meta.layer,
          source.layers[module.key],
          `${theme}/${module.key}: bundled layer metadata differs from source`
        );
        assertEqual(
          parsed.meta.cssEmission,
          source.externalModules.has(module.key) ? 'external' : undefined,
          `${theme}/${module.key}: bundled CSS-emission metadata differs from source`
        );
      }
    }
  } finally {
    await fs.remove(tmpDir);
  }
}

async function readBundleGraph(entryPath: string, visited = new Set<string>()): Promise<string> {
  if (visited.has(entryPath)) return '';
  visited.add(entryPath);

  const source = await fs.readFile(entryPath, 'utf8');
  const imports = [...source.matchAll(/(?:import|export)\s+(?:[^'";]*?from\s+)?["']([^"']+)["']/g)]
    .map((match) => match[1])
    .filter((specifier) => specifier.startsWith('.'));
  const dependencies = await Promise.all(
    imports.map((specifier) => readBundleGraph(path.resolve(path.dirname(entryPath), specifier), visited))
  );

  return [source, ...dependencies].join('\n');
}

async function assertComponentTokenArtifact(): Promise<void> {
  if (!(await fs.pathExists(COMPONENT_TOKENS_FILE))) {
    throw new Error(
      'missing dist/cli/defaults/component-tokens.json; run build:components before validating package artifacts'
    );
  }
  if (!(await fs.pathExists(COMPONENT_BUNDLE))) {
    throw new Error(
      'missing dist/components/index.js; run build:components before validating package artifacts'
    );
  }

  const actual = await fs.readJson(COMPONENT_TOKENS_FILE);
  const expected = extractZbkTokens(await readBundleGraph(COMPONENT_BUNDLE));
  assertEqual(
    actual,
    expected,
    'component-tokens.json does not match the tokens referenced by the built component bundle'
  );
}

async function assertNoStaleArtifacts(): Promise<void> {
  const defaults = await readSnapshot(DEFAULTS_DIR);
  const expectedDefaultFiles = new Set([
    'manifest.json',
    'components.json',
    'component-tokens.json',
    'css-properties.json',
    'variants.json',
    ...defaults.manifest.modules.map((module) => module.file),
  ]);
  const actualDefaultFiles = (await fs.readdir(DEFAULTS_DIR, { withFileTypes: true }))
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .sort();
  assertEqual(
    actualDefaultFiles,
    [...expectedDefaultFiles].sort(),
    'default snapshots contain an unmanifested or missing file'
  );

  const presetManifest = (await fs.readJson(path.join(PRESETS_DIR, 'manifest.json'))) as {
    themes: string[];
  };
  const actualPresetDirs = (await fs.readdir(PRESETS_DIR, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .map((entry) => entry.name)
    .sort();
  assertEqual(
    actualPresetDirs,
    [...presetManifest.themes].sort(),
    'preset snapshots contain an unmanifested or missing theme directory'
  );

  for (const theme of presetManifest.themes) {
    const snapshotDir = path.join(PRESETS_DIR, theme);
    const snapshot = await readSnapshot(snapshotDir);
    const expectedFiles = new Set([
      'manifest.json',
      ...snapshot.manifest.modules.map((module) => module.file),
    ]);
    const actualFiles = (await fs.readdir(snapshotDir, { withFileTypes: true }))
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .sort();
    assertEqual(
      actualFiles,
      [...expectedFiles].sort(),
      `${theme}: preset snapshots contain an unmanifested or missing file`
    );

    const sourceDir = resolveSourceThemeOverridePath(theme);
    const expectedVariantFiles = sourceDir
      ? (await glob('**/*.json', { cwd: sourceDir, absolute: true, nodir: true }))
          .filter(isVariantOverrideFile)
          .map((file) => path.basename(file))
          .sort()
      : [];
    const variantDir = path.join(snapshotDir, 'variant-overrides');
    const actualVariantFiles = (await fs.pathExists(variantDir))
      ? (await fs.readdir(variantDir, { withFileTypes: true }))
          .filter((entry) => entry.isFile())
          .map((entry) => entry.name)
          .sort()
      : [];
    assertEqual(
      actualVariantFiles,
      expectedVariantFiles,
      `${theme}: preset variant overrides contain an unmanifested or missing file`
    );
  }
}

async function main(): Promise<void> {
  process.chdir(REPO_ROOT);
  await assertArtifactParity();
  await assertComponentTokenArtifact();
  await assertNoStaleArtifacts();
  console.log('DTCG default and preset artifact parity OK.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
