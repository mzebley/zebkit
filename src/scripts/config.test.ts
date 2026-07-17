/**
 * @jest-environment node
 */

import fs from 'fs-extra';
import os from 'node:os';
import path from 'node:path';

import {
  loadZebkitConfig,
  OverlayThemeConfig,
  PruneConfig,
  validateKnownConfigItems,
  resolveOverlayRootSelector,
  validateOverlays,
  validatePruneConfig,
} from './config';
import {
  ZEBKIT_CONFIG_SCHEMA,
  ZEBKIT_CONFIG_SCHEMA_FILENAME,
} from './config-schema';

describe('validateKnownConfigItems', () => {
  it('accepts known keys throughout the config grammar', () => {
    expect(() =>
      validateKnownConfigItems({
        configVersion: 1,
        $schema: './node_modules/zebkit/dist/editor/schemas/zebkit.config.schema.json',
        tokens: {
          destinationPath: './dist',
          fonts: { strategy: 'link' },
          extendedTokens: { colors: 'smart', emitBreakpointVars: true },
          typeScale: { static: false },
          spaceScale: { fluid: true },
          prune: { enabled: true, output: { mode: 'alongside' } },
          overlays: [
            {
              themeName: 'dark',
              tokenPath: './dark',
              fonts: { strategy: 'manual' },
            },
          ],
        },
        components: { button: { variants: ['outline'] }, checkbox: false },
        context: { path: './zebkit/context' },
      })
    ).not.toThrow();
  });

  it('requires the config version used by this release', () => {
    expect(() => validateKnownConfigItems({ tokens: {} })).toThrow(
      'Missing required config item `configVersion`'
    );
    expect(() => validateKnownConfigItems({ configVersion: 2, tokens: {} })).toThrow(
      'Invalid config value at `configVersion`. Expected 1.'
    );
  });

  it('rejects a duplicate tokens wrapper and names the exact move', () => {
    expect(() =>
      validateKnownConfigItems({
        tokens: { tokens: { fonts: { strategy: 'link' } } },
      })
    ).toThrow(
      /Unknown config item `tokens\.tokens`.*Move `tokens\.tokens\.fonts` to `tokens\.fonts`/
    );
  });

  it('suggests the closest known key for a typo', () => {
    expect(() =>
      validateKnownConfigItems({ tokens: { fonts: { stratgy: 'link' } } })
    ).toThrow(
      /Unknown config item `tokens\.fonts\.stratgy`.*Did you mean `tokens\.fonts\.strategy`/
    );
  });

  it('rejects invalid enum values with the valid vocabulary', () => {
    expect(() =>
      validateKnownConfigItems({ tokens: { fonts: { strategy: 'fastest' } } })
    ).toThrow(
      /Invalid config value at `tokens\.fonts\.strategy`.*"import", "link", "preload", "manual"/
    );
  });

  it('rejects unknown keys in dynamic component entries', () => {
    expect(() =>
      validateKnownConfigItems({ components: { button: { varients: ['outline'] } } })
    ).toThrow(
      /Unknown config item `components\.button\.varients`.*Did you mean `components\.button\.variants`/
    );
  });

  it('runs unknown-key validation when loading a config file', async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'zebkit-config-'));
    const configPath = path.join(directory, 'zebkit.config.json');
    await fs.writeJson(configPath, {
      configVersion: 1,
      tokens: { fonst: { strategy: 'link' } },
    });

    try {
      await expect(loadZebkitConfig(configPath)).rejects.toThrow(
        /Unknown config item `tokens\.fonst`.*Did you mean `tokens\.fonts`/
      );
    } finally {
      await fs.remove(directory);
    }
  });

  it('keeps the tracked editor schema in sync with runtime validation', async () => {
    const schemaPath = path.resolve('schemas', ZEBKIT_CONFIG_SCHEMA_FILENAME);
    await expect(fs.readJson(schemaPath)).resolves.toEqual(ZEBKIT_CONFIG_SCHEMA);
  });
});

describe('resolveOverlayRootSelector', () => {
  it('defaults to a data-attribute selector built from themeName', () => {
    expect(
      resolveOverlayRootSelector({ themeName: 'dark', tokenPath: './dark' })
    ).toBe('[data-zbk-theme="dark"]');
  });

  it('uses an explicit selector when provided', () => {
    expect(
      resolveOverlayRootSelector({
        themeName: 'dark',
        tokenPath: './dark',
        rootSelector: '.theme-dark',
      })
    ).toBe('.theme-dark');
  });

  it('treats a blank selector as omitted', () => {
    expect(
      resolveOverlayRootSelector({
        themeName: 'hc',
        tokenPath: './hc',
        rootSelector: '   ',
      })
    ).toBe('[data-zbk-theme="hc"]');
  });
});

describe('validateOverlays', () => {
  const overlay = (o: Partial<OverlayThemeConfig>): OverlayThemeConfig => ({
    themeName: 'dark',
    tokenPath: './dark',
    ...o,
  });

  it('passes valid overlays', () => {
    expect(() =>
      validateOverlays([overlay({}), overlay({ themeName: 'hc', tokenPath: './hc' })])
    ).not.toThrow();
  });

  it('accepts undefined (no overlays configured)', () => {
    expect(() => validateOverlays(undefined)).not.toThrow();
  });

  it('requires themeName', () => {
    expect(() =>
      validateOverlays([{ tokenPath: './x' } as OverlayThemeConfig])
    ).toThrow(/themeName` is required/);
  });

  it('requires tokenPath', () => {
    expect(() =>
      validateOverlays([{ themeName: 'x' } as OverlayThemeConfig])
    ).toThrow(/tokenPath` is required/);
  });

  it('rejects duplicate themeNames', () => {
    expect(() =>
      validateOverlays([overlay({}), overlay({})])
    ).toThrow(/duplicate overlay/);
  });

  it.each([':root', 'html', '*'])(
    'rejects a selector that resolves to "%s"',
    (selector) => {
      expect(() =>
        validateOverlays([overlay({ rootSelector: selector })])
      ).toThrow(/clobber the base theme/);
    }
  );
});

describe('validatePruneConfig', () => {
  it('accepts undefined (prune not configured)', () => {
    expect(() => validatePruneConfig(undefined)).not.toThrow();
  });

  it('accepts a fully specified prune block', () => {
    const prune: PruneConfig = {
      enabled: true,
      content: ['src/**/*.svelte'],
      safelist: ['button', '/^swiper/'],
      blocklist: ['debug-only'],
      output: { mode: 'alongside', path: 'dist/zbk.pruned.min.css' },
      tokens: true,
      keepLayers: ['theme', 'base'],
      componentCss: 'keep',
      report: true,
    };
    expect(() => validatePruneConfig(prune)).not.toThrow();
  });

  it('rejects a non-object prune block', () => {
    expect(() => validatePruneConfig([] as unknown as PruneConfig)).toThrow(
      /`tokens.prune` must be an object/
    );
  });

  it('rejects a non-string content entry', () => {
    expect(() =>
      validatePruneConfig({ content: [1] as unknown as string[] })
    ).toThrow(/`tokens.prune.content` must be an array of strings/);
  });

  it('rejects a non-boolean enabled', () => {
    expect(() =>
      validatePruneConfig({ enabled: 'yes' as unknown as boolean })
    ).toThrow(/`tokens.prune.enabled` must be a boolean/);
  });

  it('rejects an invalid output mode', () => {
    expect(() =>
      validatePruneConfig({ output: { mode: 'wipe' as unknown as 'replace' } })
    ).toThrow(/`tokens.prune.output.mode` must be "replace" or "alongside"/);
  });

  it('rejects an invalid componentCss value', () => {
    expect(() =>
      validatePruneConfig({ componentCss: 'purge' as unknown as 'keep' })
    ).toThrow(/`tokens.prune.componentCss` must be "keep" or "detect"/);
  });

  it('rejects an invalid regex safelist entry, naming it', () => {
    expect(() => validatePruneConfig({ safelist: ['/[/'] })).toThrow(
      /Invalid regex in prune list: "\/\[\/"/
    );
  });
});
