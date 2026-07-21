#!/usr/bin/env tsx

import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';

import { readTokenSnapshot } from '../src/cli/pull-state.js';
import { buildZebkitTokens } from '../src/scripts/tokens/compile-tokens.js';

async function main(): Promise<void> {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'zebkit-metadata-'));
  const basePath = path.join(tmpDir, 'zbk-probe.json');
  const overrideDir = path.join(tmpDir, 'overrides');
  const firstOutput = path.join(tmpDir, 'first');
  const snapshotDir = path.join(tmpDir, 'snapshot');
  const rebuildOverrides = path.join(tmpDir, 'rebuild-overrides');
  const secondOutput = path.join(tmpDir, 'second');

  const baseDocument = {
    $type: 'number',
    $description: 'Base root.',
    $deprecated: 'Base root deprecation.',
    $extensions: {
      'dev.zebkit': { layer: 'base' },
      'com.example.root': { base: true, nested: { left: 1 } },
    },
    'a-b': {
      $description: 'Literal hyphen group.',
      $deprecated: true,
      $extensions: {
        'com.example.hyphen': { base: true, nested: { left: 1 } },
      },
      c: { $value: 1, $description: 'C.' },
    },
    a: {
      $description: 'Outer group.',
      $extensions: { 'com.example.outer': { retained: true } },
      b: {
        $description: 'Segmented group.',
        $deprecated: 'Keep this metadata.',
        $extensions: { 'com.example.segmented': { retained: true } },
        d: { $value: 2, $description: 'D.' },
      },
    },
  };
  const overrideDocument = {
    $description: 'Override root.',
    $deprecated: false,
    $extensions: {
      'com.example.root': { override: true, nested: { right: 2 } },
      'com.example.override': { retained: true },
    },
    'a-b': {
      $description: 'Updated literal hyphen group.',
      $deprecated: false,
      $extensions: {
        'com.example.hyphen': { override: true, nested: { right: 2 } },
      },
      c: { $value: 3 },
    },
    a: { b: { d: { $value: 4 } } },
  };

  try {
    await fs.writeJson(basePath, baseDocument, { spaces: 2 });
    await fs.ensureDir(overrideDir);
    await fs.writeJson(
      path.join(overrideDir, 'zbk-probe.tokens.json'),
      overrideDocument,
      { spaces: 2 }
    );

    const first = await buildZebkitTokens(
      'metadata',
      [basePath],
      firstOutput,
      overrideDir,
      ['JSON'],
      { splitMode: 'per-module' },
      true
    );
    assert.deepEqual(first.moduleMetadata['zbk-probe'].entryPaths, {
      'a-b-c': ['a-b', 'c'],
      'a-b-d': ['a', 'b', 'd'],
    });

    const firstDocument = await fs.readJson(path.join(firstOutput, 'zbk-probe.tokens.json'));
    assert.deepEqual(firstDocument, {
      $type: 'number',
      $description: 'Override root.',
      $deprecated: false,
      $extensions: {
        'dev.zebkit': { layer: 'base' },
        'com.example.root': {
          base: true,
          override: true,
          nested: { left: 1, right: 2 },
        },
        'com.example.override': { retained: true },
      },
      'a-b': {
        $description: 'Updated literal hyphen group.',
        $deprecated: false,
        $extensions: {
          'com.example.hyphen': {
            base: true,
            override: true,
            nested: { left: 1, right: 2 },
          },
        },
        c: { $value: 3, $description: 'C.' },
      },
      a: {
        $description: 'Outer group.',
        $extensions: { 'com.example.outer': { retained: true } },
        b: {
          $description: 'Segmented group.',
          $deprecated: 'Keep this metadata.',
          $extensions: { 'com.example.segmented': { retained: true } },
          d: { $value: 4, $description: 'D.' },
        },
      },
    });

    await fs.ensureDir(snapshotDir);
    await fs.writeJson(path.join(snapshotDir, 'manifest.json'), {
      modules: [{ key: 'zbk-probe', file: 'zbk-probe.json' }],
    });
    await fs.writeJson(path.join(snapshotDir, 'zbk-probe.json'), firstDocument);
    const pulled = await readTokenSnapshot(snapshotDir, { readJson: fs.readJson });
    assert.deepEqual(pulled.modules['zbk-probe'].tokens, firstDocument);

    await fs.ensureDir(rebuildOverrides);
    await fs.writeJson(
      path.join(rebuildOverrides, 'zbk-probe.tokens.json'),
      pulled.modules['zbk-probe'].tokens,
      { spaces: 2 }
    );
    await buildZebkitTokens(
      'metadata-rebuild',
      [basePath],
      secondOutput,
      rebuildOverrides,
      ['JSON'],
      { splitMode: 'per-module' },
      true
    );
    assert.deepEqual(
      await fs.readJson(path.join(secondOutput, 'zbk-probe.tokens.json')),
      firstDocument
    );
    console.log('DTCG metadata export, pull, and rebuild round trip OK.');
  } finally {
    await fs.remove(tmpDir);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
