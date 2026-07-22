/**
 * @jest-environment node
 */

import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import postcss, { type Node } from 'postcss';

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

      // The primitive palette is emitted exactly once (by the generated palette
      // SCSS) — the emission-external token module must not double-emit it.
      expect(css.split('--zbk-color-red-hue:').length - 1).toBe(1);
      expect(css.split('--zbk-color-red-500:').length - 1).toBe(1);
      expect(css).toMatch(
        /--zbk-color-red-500:\s*hsl\(var\(--zbk-color-red-hue\),\s*var\(--zbk-color-red-saturation\),\s*58%\)/
      );
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
          $value: 'Inter',
          $extensions: {
            'dev.zebkit': { font: { source: 'system', fallback: 'sans' } },
          },
        },
      },
      { spaces: 2 }
    );
    await fs.writeJson(
      path.join(overlayDir, 'zbk-color.tokens.json'),
      {
        'merlot-500': {
          $value: {
            colorSpace: 'srgb',
            components: [0.1, 0.2, 0.3],
            hex: '#1a334d',
          },
        },
      },
      { spaces: 2 }
    );
    await fs.writeJson(
      path.join(overlayDir, 'zbk-app.tokens.json'),
      { canvas: { $value: '{color.merlot-500}' } },
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
        extendedTokens: { colors: 'smart' },
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
      const baseCss = await fs.readFile(basePath, 'utf8');
      expect(baseCss.split('--zbk-color-merlot-500:').length - 1).toBe(1);

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

      // A primitive override and its dependent alias chain are emitted in the
      // same scoped overlay. The primitive declaration itself must be unlayered
      // so it outranks the generated unlayered palette in the base bundle.
      expect(overlayCss).toContain('--zbk-color-merlot-500:#1a334d');
      expect(overlayCss).toContain(
        '--zbk-app-canvas:var(--zbk-color-merlot-500)'
      );
      const parsedOverlay = postcss.parse(overlayCss);
      let paletteDeclarationParent: Node | undefined;
      parsedOverlay.walkDecls('--zbk-color-merlot-500', (declaration) => {
        paletteDeclarationParent = declaration.parent?.parent;
      });
      expect(paletteDeclarationParent?.type).toBe('root');

      // Still minimal: an unrelated token that does not reference the override is absent.
      expect(overlayCss).not.toContain('--zbk-z-index-');
      // No utility classes / primitive ramps leak into the overlay.
      expect(overlayCss).not.toContain('.zbk-');
    } finally {
      await fs.remove(tmpDir);
    }
  });

  it('emits and exports primitive overrides after a smart-retained palette family', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'zebkit-palette-override-'));
    const destinationPath = path.join(tmpDir, 'dist');
    const configPath = path.join(tmpDir, 'zebkit.config.json');
    const overrideDir = path.join(tmpDir, 'tokens');

    await fs.ensureDir(overrideDir);
    await fs.writeJson(
      path.join(overrideDir, 'zbk-color.tokens.json'),
      {
        'merlot-500': {
          $value: {
            colorSpace: 'hsl',
            components: [10, 90, 50],
            hex: '#f2330d',
          },
        },
        'merlot-600': { $value: '{color.blue-500}' },
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
        themeName: 'palette-override',
        exportTokens: true,
        exportStrict: true,
        outputFormats: ['JSON'],
        splitMode: 'combined',
        extendedTokens: { colors: 'smart' },
        writeVariantRegistry: false,
      },
    };

    await fs.writeJson(configPath, config, { spaces: 2 });

    try {
      await execFileAsync('npm', ['run', 'build:tokens', '--', '--config', configPath], {
          cwd: PROJECT_ROOT,
          env: { ...process.env, CI: 'true', FORCE_COLOR: '0' },
        });

      const css = await fs.readFile(path.join(destinationPath, 'zbk-palette-override.min.css'), 'utf8');
      const declarations = [...css.matchAll(/--zbk-color-merlot-500:([^;}]+)/g)];
      expect(declarations).toHaveLength(2);
      expect(declarations[0][1]).toContain('var(--zbk-color-merlot-hue)');
      expect(declarations[1][1]).toContain('#f2330d');

      const parsedCss = postcss.parse(css);
      const declarationParents: Array<Node | undefined> = [];
      parsedCss.walkDecls('--zbk-color-merlot-500', (declaration) => {
        declarationParents.push(declaration.parent?.parent);
      });
      expect(declarationParents).toHaveLength(2);
      expect(declarationParents[1]?.type).toBe('root');

      const full = await fs.readJson(
        path.join(destinationPath, 'palette-override-tokens.json')
      );
      const strict = await fs.readJson(
        path.join(destinationPath, 'palette-override-tokens.strict.json')
      );
      expect(full.color['merlot-500'].$value).toEqual({
        colorSpace: 'hsl',
        components: [10, 90, 50],
        hex: '#f2330d',
      });
      expect(strict.color['merlot-500'].$value).toEqual(
        full.color['merlot-500'].$value
      );
      expect(strict.color['merlot-600'].$value).toBe('{color.blue-500}');
    } finally {
      await fs.remove(tmpDir);
    }
  });

  it('fails the build for malformed configured overrides without default fallback', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'zebkit-invalid-override-'));
    const configPath = path.join(tmpDir, 'zebkit.config.json');
    const overrideDir = path.join(tmpDir, 'tokens');
    await fs.ensureDir(overrideDir);
    await fs.writeJson(path.join(overrideDir, 'zbk-color.tokens.json'), {
      'red-500': { $value: 'definitely-not-a-color' },
    });
    await fs.writeJson(path.join(overrideDir, 'zbk-spacing.tokens.json'), {
      'not-a-token': { $value: '1rem' },
    });
    await fs.writeJson(configPath, {
      configVersion: 1,
      tokens: {
        destinationPath: path.join(tmpDir, 'dist'),
        tokenPath: overrideDir,
        themeName: 'invalid-override',
      },
    });

    try {
      await expect(
        execFileAsync('npm', ['run', 'build:tokens', '--', '--config', configPath], {
          cwd: PROJECT_ROOT,
          env: { ...process.env, CI: 'true', FORCE_COLOR: '0' },
        })
      ).rejects.toMatchObject({
        stderr: expect.stringMatching(
          /zbk-spacing\.tokens\.json[\s\S]*zbk-spacing\.not-a-token[\s\S]*CSS destination validation: zbk-color\.red-500[\s\S]*fails background[\s\S]*color/
        ),
      });
      expect(
        await fs.pathExists(path.join(tmpDir, 'dist', 'zbk-invalid-override.min.css'))
      ).toBe(false);
    } finally {
      await fs.remove(tmpDir);
    }
  });

  it('rejects reference cycles in CSS-only builds before writing output', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'zebkit-reference-cycle-'));
    const destinationPath = path.join(tmpDir, 'dist');
    const configPath = path.join(tmpDir, 'zebkit.config.json');
    const overrideDir = path.join(tmpDir, 'tokens');
    await fs.ensureDir(overrideDir);
    await fs.writeJson(path.join(overrideDir, 'zbk-app.tokens.json'), {
      canvas: { $value: '{app.ink}' },
      ink: { $value: '{app.canvas}' },
    });
    await fs.writeJson(configPath, {
      configVersion: 1,
      tokens: {
        destinationPath,
        tokenPath: overrideDir,
        themeName: 'reference-cycle',
        exportTokens: false,
        writeVariantRegistry: false,
        writeTokenLookup: false,
        writeAllowedTokenTypes: false,
      },
    });

    try {
      await expect(
        execFileAsync('npm', ['run', 'build:tokens', '--', '--config', configPath], {
          cwd: PROJECT_ROOT,
          env: { ...process.env, CI: 'true', FORCE_COLOR: '0' },
        })
      ).rejects.toMatchObject({
        stderr: expect.stringMatching(
          /Token collection validation failed:[\s\S]*reference cycle app\.canvas -> app\.ink -> app\.canvas/
        ),
      });
      expect(await fs.pathExists(destinationPath)).toBe(false);
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
          $value: '{font-size.3xl}',
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
      'font-size': { $value: '{font-size.3xl}' },
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
