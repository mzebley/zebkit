/**
 * @jest-environment node
 */

import { execFile } from 'node:child_process';
import fs from 'fs-extra';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const PROJECT_ROOT = process.cwd();
const COMPONENT_TOKENS_FILE = path.join(
  PROJECT_ROOT,
  'dist',
  'cli',
  'defaults',
  'component-tokens.json'
);
const RETIRED_MODULE_FILE = path.join(
  PROJECT_ROOT,
  'dist',
  'cli',
  'defaults',
  'zbk-retired-module.json'
);
const DEFAULT_MANIFEST_FILE = path.join(
  PROJECT_ROOT,
  'dist',
  'cli',
  'defaults',
  'manifest.json'
);

async function runScript(name: string): Promise<void> {
  await execFileAsync('npm', ['run', name], {
    cwd: PROJECT_ROOT,
    env: { ...process.env, CI: 'true', FORCE_COLOR: '0' },
  });
}

describe('published DTCG token artifacts', () => {
  jest.setTimeout(360000);

  it('preserves component roots while reconciling and validating token snapshots', async () => {
    await runScript('build:defaults');
    await runScript('build:components');
    const componentTokens = await fs.readFile(COMPONENT_TOKENS_FILE, 'utf8');
    await fs.writeJson(RETIRED_MODULE_FILE, { retired: true });
    const manifest = await fs.readJson(DEFAULT_MANIFEST_FILE);
    manifest.modules.push({
      key: 'zbk-retired-module',
      layer: 'base',
      file: path.basename(RETIRED_MODULE_FILE),
    });
    await fs.writeJson(DEFAULT_MANIFEST_FILE, manifest, { spaces: 2 });

    try {
      await runScript('build:defaults');

      await expect(fs.readFile(COMPONENT_TOKENS_FILE, 'utf8')).resolves.toBe(componentTokens);
      await expect(fs.pathExists(RETIRED_MODULE_FILE)).resolves.toBe(false);
      await expect(
        execFileAsync(process.execPath, ['--import', 'tsx', 'scripts/check-dtcg-artifacts.ts'], {
          cwd: PROJECT_ROOT,
          env: { ...process.env, CI: 'true', FORCE_COLOR: '0' },
        })
      ).resolves.toMatchObject({ stdout: expect.stringContaining('artifact parity OK') });
    } finally {
      await fs.remove(RETIRED_MODULE_FILE);
    }
  });
});
