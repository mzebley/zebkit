/**
 * @jest-environment node
 */

import fs from 'fs-extra';
import os from 'node:os';
import path from 'node:path';
import {
  createPullState,
  getAuthorableTokenData,
  getPullStatePath,
  readTokenSnapshot,
  readVariantSnapshot,
  syncTokenSnapshot,
  writePullState,
  type PullStateDeps,
  type TokenSnapshot,
  type VariantSnapshot,
} from './pull-state';

const token = (value: string) => ({ value, type: 'color' });

function snapshot(modules: Record<string, Record<string, unknown>>): TokenSnapshot {
  return {
    manifest: {
      modules: Object.keys(modules).map((key) => ({ key, file: `${key}.json` })),
    },
    modules: Object.fromEntries(
      Object.entries(modules).map(([key, tokens]) => [
        key,
        { file: `${key}.tokens.json`, tokens },
      ])
    ),
  };
}

function variantSnapshot(
  components: Record<string, Record<string, unknown>>
): VariantSnapshot {
  return {
    components: Object.fromEntries(
      Object.entries(components).map(([component, variants]) => [
        component,
        { file: `zbk-${component}.variants.json`, variants },
      ])
    ),
  };
}

describe('pull state reconciliation', () => {
  let projectDir: string;
  let tokensDir: string;
  let configPath: string;
  let deps: PullStateDeps;

  beforeEach(async () => {
    projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'zebkit-pull-state-'));
    tokensDir = path.join(projectDir, 'tokens');
    configPath = path.join(projectDir, 'zebkit.config.json');
    await fs.ensureDir(tokensDir);
    deps = {
      pathExists: fs.pathExists,
      readJson: fs.readJson,
      readJsonSafe: async (target) => {
        try {
          return await fs.readJson(target);
        } catch {
          return undefined;
        }
      },
      writeJson: fs.writeJson,
      ensureDir: fs.ensureDir,
      remove: fs.remove,
    };
  });

  afterEach(async () => {
    await fs.remove(projectDir);
  });

  it('excludes generated index-only entries from authorable override data', () => {
    expect(
      getAuthorableTokenData({
        _key: 'zbk-font-size',
        generated: { index: 0, type: 'rootSize' },
        authorable: { value: '1rem', type: 'sizing' },
      })
    ).toEqual({ authorable: { value: '1rem', type: 'sizing' } });
  });

  it('rejects bundled manifests that do not use the internal zbk-*.json contract', async () => {
    const sourceDir = path.join(projectDir, 'snapshot');
    await fs.ensureDir(sourceDir);
    await fs.writeJson(path.join(sourceDir, 'manifest.json'), {
      modules: [{ key: 'zbk-app', file: '../zbk-app.json' }],
    });

    await expect(readTokenSnapshot(sourceDir, deps)).rejects.toThrow(
      'Invalid bundled token manifest'
    );
  });

  it('reads effective shipped variants, including preset patches and component filters', async () => {
    const defaultsDir = path.join(projectDir, 'defaults');
    const presetDir = path.join(projectDir, 'preset');
    const presetOverridesDir = path.join(presetDir, 'variant-overrides');
    await fs.ensureDir(defaultsDir);
    await fs.ensureDir(presetOverridesDir);
    await fs.writeJson(path.join(defaultsDir, 'variants.json'), [
      {
        component: 'button',
        name: 'ghost',
        axis: 'style',
        overrides: { canvas: 'transparent', ink: '{action.ink}' },
      },
      {
        component: 'button',
        name: 'lg',
        axis: 'size',
        overrides: { 'font-size': '{font-size.lg}' },
      },
      {
        component: 'checkbox',
        name: 'sm',
        overrides: { size: '{spacing.sm}' },
      },
    ]);
    await fs.writeJson(path.join(presetOverridesDir, 'zbk-button.variant.ghost.json'), {
      component: 'button',
      name: 'ghost',
      overrides: { ink: '{accent-primary.ink}' },
    });

    const result = await readVariantSnapshot(
      defaultsDir,
      presetDir,
      {
        excluded: new Set(['checkbox']),
        variantAllowlists: new Map([['button', new Set(['ghost'])]]),
      },
      { pathExists: fs.pathExists, readJson: fs.readJson, readdir: fs.readdir }
    );

    expect(result).toEqual({
      components: {
        button: {
          file: 'zbk-button.variants.json',
          variants: {
            ghost: {
              axis: 'style',
              overrides: { canvas: 'transparent', ink: '{accent-primary.ink}' },
            },
          },
        },
      },
    });
  });

  it('keeps a customization, adds missing keys, and establishes a baseline', async () => {
    await fs.writeJson(path.join(tokensDir, 'zbk-app.tokens.json'), {
      canvas: token('#custom'),
    });
    const current = snapshot({ 'zbk-app': { canvas: token('#fff'), ink: token('#000') } });

    const result = await syncTokenSnapshot({
      tokensDir,
      configPath,
      basePreset: 'default',
      snapshot: current,
      deps,
    });

    expect(await fs.readJson(path.join(tokensDir, 'zbk-app.tokens.json'))).toEqual({
      canvas: token('#custom'),
      ink: token('#000'),
    });
    expect(result).toMatchObject({ establishedBaseline: true, keysAdded: 1 });
    expect(await fs.pathExists(getPullStatePath(configPath))).toBe(true);
  });

  it('updates an untouched default while preserving a customized token', async () => {
    const old = snapshot({ 'zbk-app': { canvas: token('#old'), ink: token('#old-ink') } });
    const current = snapshot({ 'zbk-app': { canvas: token('#new'), ink: token('#new-ink') } });
    await writePullState(configPath, createPullState('default', old), deps);
    await fs.writeJson(path.join(tokensDir, 'zbk-app.tokens.json'), {
      canvas: token('#old'),
      ink: token('#custom'),
    });

    const result = await syncTokenSnapshot({
      tokensDir,
      configPath,
      basePreset: 'default',
      snapshot: current,
      deps,
    });

    expect(await fs.readJson(path.join(tokensDir, 'zbk-app.tokens.json'))).toEqual({
      canvas: token('#new'),
      ink: token('#custom'),
    });
    expect(result.defaultsUpdated).toBe(1);
  });

  it('removes untouched retirements and preserves customized retired values', async () => {
    const old = snapshot({
      'zbk-app': { canvas: token('#fff'), retired: token('#old') },
      'zbk-retired': { only: token('#gone') },
    });
    const current = snapshot({ 'zbk-app': { canvas: token('#fff') } });
    await writePullState(configPath, createPullState('default', old), deps);
    await fs.writeJson(path.join(tokensDir, 'zbk-app.tokens.json'), {
      canvas: token('#fff'),
      retired: token('#custom-retired'),
    });
    await fs.writeJson(path.join(tokensDir, 'zbk-retired.tokens.json'), {
      only: token('#gone'),
    });

    const result = await syncTokenSnapshot({
      tokensDir,
      configPath,
      basePreset: 'default',
      snapshot: current,
      deps,
    });

    expect(await fs.pathExists(path.join(tokensDir, 'zbk-retired.tokens.json'))).toBe(false);
    expect((await fs.readJson(path.join(tokensDir, 'zbk-app.tokens.json'))).retired).toEqual(
      token('#custom-retired')
    );
    expect(result.preservedRetired).toEqual(['zbk-app.retired']);
  });

  it('reconciles component variant files without overwriting customized variants', async () => {
    const oldTokens = snapshot({ 'zbk-button': { canvas: token('#fff') } });
    const oldVariants = variantSnapshot({
      button: {
        ghost: { axis: 'style', overrides: { canvas: 'transparent' } },
        retired: { overrides: { ink: '{action.ink}' } },
      },
    });
    const currentVariants = variantSnapshot({
      button: {
        ghost: { axis: 'style', overrides: { canvas: '{action.canvas-subtle}' } },
        outline: { axis: 'style', overrides: { canvas: 'transparent' } },
      },
    });
    await writePullState(
      configPath,
      createPullState('default', oldTokens, oldVariants),
      deps
    );
    await fs.writeJson(path.join(tokensDir, 'zbk-button.tokens.json'), {
      canvas: token('#fff'),
    });
    await fs.writeJson(path.join(tokensDir, 'zbk-button.variants.json'), {
      button: {
        ghost: { axis: 'style', overrides: { canvas: 'transparent' } },
        retired: { overrides: { ink: '{custom.ink}' } },
      },
    });

    const result = await syncTokenSnapshot({
      tokensDir,
      configPath,
      basePreset: 'default',
      snapshot: oldTokens,
      variantSnapshot: currentVariants,
      deps,
    });

    expect(await fs.readJson(path.join(tokensDir, 'zbk-button.variants.json'))).toEqual({
      button: {
        ghost: { axis: 'style', overrides: { canvas: '{action.canvas-subtle}' } },
        outline: { axis: 'style', overrides: { canvas: 'transparent' } },
        retired: { overrides: { ink: '{custom.ink}' } },
      },
    });
    expect(result).toMatchObject({
      variantsAdded: 1,
      variantDefaultsUpdated: 1,
      variantsRemoved: 0,
      preservedRetiredVariants: ['button.retired'],
    });
  });

  it('preserves variant files and their baseline when a package has no variant snapshot', async () => {
    const currentTokens = snapshot({ 'zbk-button': { canvas: token('#fff') } });
    const currentVariants = variantSnapshot({
      button: { ghost: { overrides: { canvas: 'transparent' } } },
    });
    await writePullState(
      configPath,
      createPullState('default', currentTokens, currentVariants),
      deps
    );
    await fs.writeJson(path.join(tokensDir, 'zbk-button.tokens.json'), {
      canvas: token('#fff'),
    });
    await fs.writeJson(path.join(tokensDir, 'zbk-button.variants.json'), {
      button: { ghost: { overrides: { canvas: 'transparent' } } },
    });

    await syncTokenSnapshot({
      tokensDir,
      configPath,
      basePreset: 'default',
      snapshot: currentTokens,
      deps,
    });

    expect(await fs.pathExists(path.join(tokensDir, 'zbk-button.variants.json'))).toBe(true);
    const state = await fs.readJson(getPullStatePath(configPath));
    expect(state.variants.button.variants.ghost).toBe(
      createPullState('default', currentTokens, currentVariants).variants?.button.variants.ghost
    );
  });

  it('rejects non-canonical filenames in pull state before touching token files', async () => {
    await fs.ensureDir(path.dirname(getPullStatePath(configPath)));
    await fs.writeJson(getPullStatePath(configPath), {
      stateVersion: 1,
      basePreset: 'default',
      modules: {
        'zbk-app': { file: 'zbk-app.json', tokens: { canvas: 'hash' } },
      },
    });

    await expect(
      syncTokenSnapshot({
        tokensDir,
        configPath,
        basePreset: 'default',
        snapshot: snapshot({ 'zbk-app': { canvas: token('#fff') } }),
        deps,
      })
    ).rejects.toThrow('Invalid pull state');
  });
});
