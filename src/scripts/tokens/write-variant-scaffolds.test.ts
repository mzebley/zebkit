/**
 * @jest-environment node
 */

import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { writeVariantScaffolds } from './write-variant-scaffolds';
import {
  extractVariantOverrideEntries,
  isVariantOverrideFile,
  type VariantRegistryLike as VariantRegistry,
} from './compile-variant-helpers';

describe('writeVariantScaffolds', () => {
  let tmpDir: string;

  const registry: VariantRegistry = {
    button: {
      ghost: {
        component: 'button',
        name: 'ghost',
        className: 'zbk-button--ghost',
        axis: 'style',
        description: 'Transparent canvas.',
        overrides: { canvas: 'transparent' },
      },
    },
    tooltip: {
      inverse: {
        component: 'tooltip',
        name: 'inverse',
        className: 'zbk-tooltip--inverse',
        overrides: { canvas: '{app.ink}' },
      },
    },
  };

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'zbk-scaffold-'));
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  it('writes per-module files whose names round-trip as override input', async () => {
    await writeVariantScaffolds(registry, tmpDir, ['JSON'], 'acme', 'per-module');

    const buttonPath = path.join(tmpDir, 'zbk-button.variants.json');
    expect(await fs.pathExists(buttonPath)).toBe(true);
    expect(await fs.pathExists(path.join(tmpDir, 'zbk-tooltip.variants.json'))).toBe(true);
    expect(isVariantOverrideFile(buttonPath)).toBe(true);

    // The payload is the authorable shape the variant override loader reads.
    const data = await fs.readJson(buttonPath);
    const entries = extractVariantOverrideEntries(data);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      component: 'button',
      name: 'ghost',
      overrides: { canvas: 'transparent' },
      axis: 'style',
    });
    // Default class names are derived, not persisted.
    expect(data.button.ghost.className).toBeUndefined();
  });

  it('writes one combined file per format with a header on TS/JS', async () => {
    await writeVariantScaffolds(
      registry,
      tmpDir,
      ['JSON', 'TypeScript', 'JavaScript'],
      'acme',
      'combined'
    );

    const jsonPath = path.join(tmpDir, 'acme-variants.json');
    expect(isVariantOverrideFile(jsonPath)).toBe(true);
    const data = await fs.readJson(jsonPath);
    expect(Object.keys(data).sort()).toEqual(['button', 'tooltip']);

    const ts = await fs.readFile(path.join(tmpDir, 'acme-variants.ts'), 'utf8');
    expect(ts).toMatch(/^\/\/ .*JSON/);
    expect(ts).toContain('export default');

    const js = await fs.readFile(path.join(tmpDir, 'acme-variants.js'), 'utf8');
    expect(js).toContain('module.exports');
  });

  it('persists a non-default class name', async () => {
    const custom: VariantRegistry = {
      button: {
        pill: {
          component: 'button',
          name: 'pill',
          className: 'zbk-custom-pill',
          overrides: {},
        },
      },
    };
    await writeVariantScaffolds(custom, tmpDir, ['JSON'], 'acme', 'combined');
    const data = await fs.readJson(path.join(tmpDir, 'acme-variants.json'));
    expect(data.button.pill.className).toBe('zbk-custom-pill');
  });
});
