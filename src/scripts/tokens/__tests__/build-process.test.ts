/**
 * @jest-environment node
 */

import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const PROJECT_ROOT = process.cwd();
const CUSTOM_THEME_PATH = path.resolve(PROJECT_ROOT, 'theme/dynamowaves');

describe('full build CLI', () => {
  jest.setTimeout(120000);

  it('produces CSS that reflects token + variant overrides', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'zebkit-build-'));
    const destinationPath = path.join(tmpDir, 'dist');
    const configPath = path.join(tmpDir, 'zebkit.config.json');
    const themeName = 'new-test';

    const config = {
      tokens: {
        includeAllComponents: true,
        destinationPath,
        assetFilePath: '/assets/',
        theme: 'custom',
        customTokenPath: CUSTOM_THEME_PATH,
        customThemeName: themeName,
        exportTokens: false,
        writeVariantRegistry: false,
        splitMode: 'per-module',
      },
    };

    await fs.writeJson(configPath, config, { spaces: 2 });

    try {
      await execFileAsync(
        'npm',
        ['run', 'build:tokens', '--', '--config', configPath],
        {
          cwd: PROJECT_ROOT,
          env: {
            ...process.env,
            CI: 'true',
            FORCE_COLOR: '0',
          },
        }
      );

      const cssPath = path.join(destinationPath, `zbk-${themeName}.min.css`);
      expect(await fs.pathExists(cssPath)).toBe(true);
      const css = await fs.readFile(cssPath, 'utf8');

      expect(css).toContain('--zbk-a11y-spacing-modifier:1');
      expect(css).toContain('--zbk-button-font-size:var(--zbk-font-size-3xl)');
    } finally {
      await fs.remove(tmpDir);
    }
  });
});
