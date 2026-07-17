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
  syncTokenSnapshot,
  writePullState,
  type PullStateDeps,
  type TokenSnapshot,
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
