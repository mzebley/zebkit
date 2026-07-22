/**
 * @jest-environment node
 */

import fs from 'fs-extra';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { hashToken } from '../../cli/pull-state';

const execFileAsync = promisify(execFile);
const PROJECT_ROOT = process.cwd();
const CLI_PATH = path.join(PROJECT_ROOT, 'dist', 'cli', 'zebkit.mjs');
const DEFAULTS_DIR = path.join(PROJECT_ROOT, 'dist', 'cli', 'defaults');

describe('published pull command', () => {
  jest.setTimeout(120000);

  beforeAll(async () => {
    for (const script of ['build:defaults', 'build:editor', 'build:cli']) {
      await execFileAsync('npm', ['run', script], {
        cwd: PROJECT_ROOT,
        env: { ...process.env, CI: 'true', FORCE_COLOR: '0' },
      });
    }
  });

  it('ships real zebkit-docs app border aliases without empty-placeholder markers', async () => {
    const app = await fs.readJson(
      path.join(PROJECT_ROOT, 'dist', 'cli', 'presets', 'zebkit-docs', 'zbk-app.json')
    );
    const names = [
      'border',
      'border-subtle',
      'border-muted',
      'border-emphasis',
      'border-inverse',
      'border-inverse-subtle',
      'border-inverse-muted',
      'border-inverse-emphasis',
    ];
    for (const name of names) {
      expect(app[name].$value).toMatch(/^\{brand\./);
      expect(app[name].$extensions?.['dev.zebkit']?.emptyColorPlaceholder).toBeUndefined();
    }
  });

  it('validates config and safely reconciles defaults through the compiled CLI', async () => {
    const projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'zebkit-pull-cli-'));
    const configPath = path.join(projectDir, 'zebkit.config.json');
    const tokensDir = path.join(projectDir, 'tokens');

    try {
      const manifest = await fs.readJson(path.join(DEFAULTS_DIR, 'manifest.json')) as {
        modules: Array<{ key: string; file: string }>;
      };
      const module = manifest.modules[0];
      const rawDefault = await fs.readJson(path.join(DEFAULTS_DIR, module.file)) as Record<string, any>;
      const firstTokenKey = Object.keys(rawDefault).find(
        (key) => !key.startsWith('_') && !key.startsWith('$')
      )!;
      const currentDefault = rawDefault[firstTokenKey];
      const customValue = { ...currentDefault, $value: '__custom__' };
      const projectTokenFile = `${module.key}.tokens.json`;

      await fs.ensureDir(tokensDir);
      await fs.writeJson(configPath, {
        configVersion: 1,
        $schema: './node_modules/zebkit/dist/editor/schemas/zebkit.config.schema.json',
        tokens: {
          basePreset: 'default',
          tokenPath: './tokens',
          themeName: 'integration',
        },
      });
      await fs.writeJson(path.join(tokensDir, projectTokenFile), {
        [firstTokenKey]: customValue,
      });

      const firstRun = await execFileAsync(process.execPath, [CLI_PATH, 'pull', '--config', configPath], {
        cwd: projectDir,
        env: { ...process.env, FORCE_COLOR: '0' },
      });

      const config = await fs.readJson(configPath);
      expect(config).toMatchObject({
        configVersion: 1,
        $schema: './node_modules/zebkit/dist/editor/schemas/zebkit.config.schema.json',
        tokens: { basePreset: 'default', tokenPath: './tokens', themeName: 'integration' },
      });
      expect(firstRun.stdout).toContain('Established .zebkit/pull-state.json baseline');
      expect(
        (await fs.readJson(path.join(tokensDir, projectTokenFile)))[firstTokenKey]
      ).toEqual(customValue);
      expect(await fs.pathExists(path.join(projectDir, '.zebkit', 'pull-state.json'))).toBe(true);

      const buttonVariants = await fs.readJson(
        path.join(tokensDir, 'zbk-button.variants.json')
      );
      expect(buttonVariants.button).toEqual(
        expect.objectContaining({
          ghost: expect.objectContaining({
            axis: 'style',
            overrides: expect.objectContaining({ canvas: 'transparent' }),
          }),
          outline: expect.any(Object),
          subtle: expect.any(Object),
          sm: expect.any(Object),
          lg: expect.any(Object),
        })
      );

      const settings = await fs.readJson(path.join(projectDir, '.vscode', 'settings.json'));
      expect(settings['json.schemas']).toHaveLength(manifest.modules.length);

      // Make the state describe an older package default. The compiled command can
      // now prove one key is untouched, retire another, and preserve a customized retirement.
      const statePath = path.join(projectDir, '.zebkit', 'pull-state.json');
      const state = await fs.readJson(statePath);
      const projectTokensPath = path.join(tokensDir, projectTokenFile);
      const projectFile = await fs.readJson(projectTokensPath);
      const oldDefault = { ...currentDefault, $value: '__old-default__' };
      const retiredDefault = {
        $value: '__retired__',
        $type: 'color',
        $description: 'Retired.',
      };
      const retiredCustom = { ...retiredDefault, $value: '__retired-custom__' };

      state.modules[module.key].tokens[firstTokenKey] = hashToken(oldDefault);
      state.modules[module.key].tokens['integration-retired'] = hashToken(retiredDefault);
      state.modules[module.key].tokens['integration-retired-custom'] = hashToken(retiredDefault);
      projectFile[firstTokenKey] = oldDefault;
      projectFile['integration-retired'] = retiredDefault;
      projectFile['integration-retired-custom'] = retiredCustom;
      await fs.writeJson(statePath, state, { spaces: 2 });
      await fs.writeJson(projectTokensPath, projectFile, { spaces: 2 });

      const secondRun = await execFileAsync(process.execPath, [CLI_PATH, 'pull', '-c', configPath], {
        cwd: projectDir,
        env: { ...process.env, FORCE_COLOR: '0' },
      });
      const reconciled = await fs.readJson(projectTokensPath);

      expect(reconciled[firstTokenKey]).toEqual(currentDefault);
      expect(reconciled).not.toHaveProperty('integration-retired');
      expect(reconciled['integration-retired-custom']).toEqual(retiredCustom);
      expect(secondRun.stdout).toContain('1 untouched default updated');
      expect(secondRun.stdout).toContain(
        `preserved customized retired token ${module.key}.integration-retired-custom`
      );
    } finally {
      await fs.remove(projectDir);
    }
  });

  it('validates an explicit config path before syncing', async () => {
    const projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'zebkit-pull-invalid-'));
    const configPath = path.join(projectDir, 'zebkit.config.json');
    try {
      await fs.writeJson(configPath, {
        configVersion: 1,
        tokens: { fonts: { stratgy: 'link' } },
      });
      await expect(
        execFileAsync(process.execPath, [CLI_PATH, 'pull', '--config', configPath], {
          cwd: projectDir,
          env: { ...process.env, FORCE_COLOR: '0' },
        })
      ).rejects.toMatchObject({
        stderr: expect.stringContaining('Unknown config item `tokens.fonts.stratgy`'),
      });
    } finally {
      await fs.remove(projectDir);
    }
  });

  it('round-trips the pulled primitive palette through the bundled build', async () => {
    const projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'zebkit-pull-palette-'));
    const configPath = path.join(projectDir, 'zebkit.config.json');
    const tokensDir = path.join(projectDir, 'tokens');
    const destinationPath = path.join(projectDir, 'dist');
    try {
      await fs.writeJson(configPath, {
        configVersion: 1,
        tokens: {
          basePreset: 'default',
          tokenPath: './tokens',
          destinationPath: './dist',
          themeName: 'pull-palette',
          exportTokens: false,
          writeVariantRegistry: false,
        },
      });

      await execFileAsync(process.execPath, [CLI_PATH, 'pull', '--config', configPath], {
        cwd: projectDir,
        env: { ...process.env, CI: 'true', FORCE_COLOR: '0' },
      });

      const palettePath = path.join(tokensDir, 'zbk-color.tokens.json');
      const palette = await fs.readJson(palettePath);
      expect(palette.$extensions?.['dev.zebkit']?.cssEmission).toBeUndefined();
      expect(palette['red-500'].$value).toBeDefined();

      await execFileAsync(process.execPath, [CLI_PATH, 'build', '--config', configPath], {
        cwd: projectDir,
        env: { ...process.env, CI: 'true', FORCE_COLOR: '0' },
      });
      const cssPath = path.join(destinationPath, 'zbk-pull-palette.min.css');
      const untouchedCss = await fs.readFile(cssPath, 'utf8');
      expect(untouchedCss.split('--zbk-color-red-500:').length - 1).toBe(1);

      palette['red-500'].$value = {
        colorSpace: 'srgb',
        components: [0.070588, 0.203922, 0.337255],
        hex: '#123456',
      };
      await fs.writeJson(palettePath, palette, { spaces: 2 });

      await execFileAsync(process.execPath, [CLI_PATH, 'build', '--config', configPath], {
        cwd: projectDir,
        env: { ...process.env, CI: 'true', FORCE_COLOR: '0' },
      });
      const overriddenCss = await fs.readFile(cssPath, 'utf8');
      const declarations = [...overriddenCss.matchAll(/--zbk-color-red-500:([^;}]+)/g)];
      expect(declarations).toHaveLength(2);
      expect(declarations[1][1]).toContain('#123456');
    } finally {
      await fs.remove(projectDir);
    }
  });
});
