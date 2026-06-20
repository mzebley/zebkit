/**
 * @jest-environment node
 */

import {
  OverlayThemeConfig,
  resolveOverlayRootSelector,
  validateOverlays,
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
