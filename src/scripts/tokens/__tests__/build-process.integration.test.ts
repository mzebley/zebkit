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

describe('build smoke tests', () => {
  jest.setTimeout(180000);

  it('produces CSS that reflects token + variant overrides', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'zebkit-build-'));
    const destinationPath = path.join(tmpDir, 'dist');
    const configPath = path.join(tmpDir, 'zebkit.config.json');
    const themeName = 'new-test';

    const config = {
      configVersion: 1,
      tokens: {
        destinationPath,
        assetFilePath: '/assets/',
        basePreset: 'default',
        tokenPath: CUSTOM_THEME_PATH,
        themeName: themeName,
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

  it('emits a scoped overlay with the transitive closure of an overridden token', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'zebkit-overlay-build-'));
    const destinationPath = path.join(tmpDir, 'dist');
    const configPath = path.join(tmpDir, 'zebkit.config.json');
    const overlayDir = path.join(tmpDir, 'overlay');

    // Override only the leaf `font-family.alt`. The base aliases `heading -> {font-family.alt}`
    // and `h1.font-family -> {font-family.heading}`, declared at :root, would NOT pick this up
    // (custom properties inherit their substituted value). The overlay must re-emit that whole
    // chain under its selector so it re-resolves in-scope.
    await fs.ensureDir(overlayDir);
    await fs.writeJson(
      path.join(overlayDir, 'zbk-font-family.tokens.json'),
      {
        alt: {
          value: '"Inter"',
          type: 'fontFamily',
          source: 'system',
          fallback: 'sans',
        },
      },
      { spaces: 2 }
    );

    const config = {
      configVersion: 1,
      tokens: {
        destinationPath,
        assetFilePath: '/assets/',
        basePreset: 'default',
        themeName: 'overlay-base',
        exportTokens: false,
        writeVariantRegistry: false,
        overlays: [
          {
            themeName: 'dark',
            tokenPath: overlayDir,
          },
        ],
      },
    };

    await fs.writeJson(configPath, config, { spaces: 2 });

    try {
      await execFileAsync(
        'npm',
        ['run', 'build:tokens', '--', '--config', configPath],
        {
          cwd: PROJECT_ROOT,
          env: { ...process.env, CI: 'true', FORCE_COLOR: '0' },
        }
      );

      // Base CSS still emitted at :root.
      const basePath = path.join(destinationPath, 'zbk-overlay-base.min.css');
      expect(await fs.pathExists(basePath)).toBe(true);

      // Overlay file emitted and scoped.
      const overlayPath = path.join(destinationPath, 'zbk-dark.css');
      expect(await fs.pathExists(overlayPath)).toBe(true);
      const overlayCss = await fs.readFile(overlayPath, 'utf8');

      // cssnano drops the quotes when the attribute value is an identifier.
      expect(overlayCss).toMatch(/\[data-zbk-theme="?dark"?\]/);
      expect(overlayCss).not.toContain(':root');
      expect(overlayCss).not.toContain('undefined');

      // The overridden leaf is emitted.
      expect(overlayCss).toMatch(/--zbk-font-family-alt:\s*"Inter"/);
      // Closure: the dependent alias is re-emitted so it re-resolves in-scope…
      expect(overlayCss).toMatch(/--zbk-font-family-heading:\s*var\(--zbk-font-family-alt\)/);
      // …as is the component token that depends on the alias.
      expect(overlayCss).toMatch(/--zbk-h1-font-family:\s*var\(--zbk-font-family-heading\)/);

      // Still minimal: an unrelated token that does not reference the override is absent.
      expect(overlayCss).not.toContain('--zbk-z-index-');
      // No utility classes / primitive ramps leak into the overlay.
      expect(overlayCss).not.toContain('.zbk-');
    } finally {
      await fs.remove(tmpDir);
    }
  });

  it('applies project overrides when building through the bundled CLI', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'zebkit-bundled-build-'));
    const destinationPath = path.join(tmpDir, 'dist');
    const configPath = path.join(tmpDir, 'zebkit.config.json');
    const overrideDir = path.join(tmpDir, 'tokens');

    await fs.ensureDir(overrideDir);
    await fs.writeJson(
      path.join(overrideDir, 'zbk-button.tokens.json'),
      {
        'font-size': {
          value: '{font-size.3xl}',
        },
      },
      { spaces: 2 }
    );

    const config = {
      configVersion: 1,
      tokens: {
        destinationPath,
        assetFilePath: '/assets/',
        basePreset: 'default',
        tokenPath: overrideDir,
        themeName: 'bundled-test',
        exportTokens: false,
        writeVariantRegistry: false,
      },
    };

    await fs.writeJson(configPath, config, { spaces: 2 });

    try {
      await execFileAsync('npm', ['run', 'build:defaults'], {
        cwd: PROJECT_ROOT,
        env: {
          ...process.env,
          CI: 'true',
          FORCE_COLOR: '0',
        },
      });

      await execFileAsync('npm', ['run', 'build:cli'], {
        cwd: PROJECT_ROOT,
        env: {
          ...process.env,
          CI: 'true',
          FORCE_COLOR: '0',
        },
      });

      await execFileAsync(
        'node',
        ['dist/cli/zebkit.mjs', 'build', '--config', configPath],
        {
          cwd: PROJECT_ROOT,
          env: {
            ...process.env,
            CI: 'true',
            FORCE_COLOR: '0',
          },
        }
      );

      const cssPath = path.join(destinationPath, 'zbk-bundled-test.min.css');
      const css = await fs.readFile(cssPath, 'utf8');

      expect(css).toContain('--zbk-button-font-size:var(--zbk-font-size-3xl)');
      expect(css).toContain('--zbk-a11y-spacing-modifier:1');
    } finally {
      await fs.remove(tmpDir);
    }
  });

  it('rejects non-canonical token override filenames with a rename instruction', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'zebkit-invalid-token-name-'));
    const configPath = path.join(tmpDir, 'zebkit.config.json');
    const overrideDir = path.join(tmpDir, 'tokens');
    await fs.ensureDir(overrideDir);
    await fs.writeJson(path.join(overrideDir, 'zbk-button.json'), {
      'font-size': { value: '{font-size.3xl}' },
    });
    await fs.writeJson(configPath, {
      configVersion: 1,
      tokens: {
        destinationPath: path.join(tmpDir, 'dist'),
        tokenPath: overrideDir,
        themeName: 'invalid-name',
      },
    });

    try {
      await expect(
        execFileAsync('npm', ['run', 'build:tokens', '--', '--config', configPath], {
          cwd: PROJECT_ROOT,
          env: { ...process.env, CI: 'true', FORCE_COLOR: '0' },
        })
      ).rejects.toMatchObject({
        stderr: expect.stringContaining(
          "Token override files must use 'zbk-<module>.tokens.json'; rename it to 'zbk-button.tokens.json'."
        ),
      });
    } finally {
      await fs.remove(tmpDir);
    }
  });

  it('delivers the agent context through the bundled CLI pull', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'zebkit-context-pull-'));
    const configPath = path.join(tmpDir, 'zebkit.config.json');

    // Simulates what `zebkit init` records; pull refreshes this directory.
    await fs.writeJson(
      configPath,
      {
        configVersion: 1,
        context: { path: './zebkit/context' },
        components: { checkbox: false },
      },
      { spaces: 2 }
    );

    try {
      // build:cli copies doc-site/static/zebkit/context -> dist/cli/context and bundles the CLI.
      await execFileAsync('npm', ['run', 'build:cli'], {
        cwd: PROJECT_ROOT,
        env: { ...process.env, CI: 'true', FORCE_COLOR: '0' },
      });

      await execFileAsync('node', [path.join(PROJECT_ROOT, 'dist/cli/zebkit.mjs'), 'pull'], {
        cwd: tmpDir,
        env: { ...process.env, CI: 'true', FORCE_COLOR: '0' },
      });

      const contextDir = path.join(tmpDir, 'zebkit', 'context');
      expect(await fs.pathExists(path.join(contextDir, 'llms.txt'))).toBe(true);
      expect(await fs.pathExists(path.join(contextDir, 'zbk-button.md'))).toBe(true);
      // Excluded component's per-component doc is skipped.
      expect(await fs.pathExists(path.join(contextDir, 'zbk-checkbox.md'))).toBe(false);
    } finally {
      await fs.remove(tmpDir);
    }
  });
});
