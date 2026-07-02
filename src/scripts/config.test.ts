/**
 * @jest-environment node
 */

import {
  OverlayThemeConfig,
  PruneConfig,
  resolveOverlayRootSelector,
  validateOverlays,
  validatePruneConfig,
} from './config';

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
