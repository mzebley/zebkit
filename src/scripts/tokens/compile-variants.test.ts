/**
 * @jest-environment node
 */

import type { TokenInterface } from '@definitions/tokens';
import {
  assertShippedVariantsAreTokenOnly,
  buildVariantMetaKey,
  extractVariantOverrideEntries,
  mergeVariantOverrideEntry,
  normalizeVariantOverrideEntry,
} from './compile-variant-helpers';

describe('compile-variants helpers', () => {
  it('normalizes variant override entry shapes', () => {
    expect(
      normalizeVariantOverrideEntry({
        component: 'button',
        name: 'outline',
        overrides: { canvas: '{color.blue-500}', radius: 4 },
      })
    ).toEqual({
      component: 'button',
      name: 'outline',
      className: 'zbk-button--outline',
      overrides: { canvas: '{color.blue-500}' },
    });

    expect(normalizeVariantOverrideEntry({ overrides: {} }, 'button', 'ghost')).toEqual({
      component: 'button',
      name: 'ghost',
      className: 'zbk-button--ghost',
      overrides: {},
    });
  });

  it('extracts entries from nested variant override data', () => {
    const entries = extractVariantOverrideEntries({
      button: {
        outline: {
          overrides: { canvas: '{color.blue-500}' },
        },
      },
      checkbox: [
        {
          name: 'dense',
          overrides: { gap: '0.25rem' },
        },
      ],
    });

    expect(entries).toEqual([
      {
        component: 'button',
        name: 'outline',
        className: 'zbk-button--outline',
        overrides: { canvas: '{color.blue-500}' },
      },
      {
        component: 'checkbox',
        name: 'dense',
        className: 'zbk-checkbox--dense',
        overrides: { gap: '0.25rem' },
      },
    ]);
  });

  it('merges sanitized overrides into the registry and metadata', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const registry = {
      button: {
        outline: {
          component: 'button',
          name: 'outline',
          className: 'zbk-button--outline',
          overrides: { radius: '4px' },
        },
      },
    };
    const tokens = {
      'zbk-button': {
        canvas: { value: '#fff', type: 'color', description: 'canvas' },
        radius: { value: '4px', type: 'dimension', description: 'radius' },
      },
    } as Record<string, TokenInterface>;
    const metadata = new Map([
      [
        buildVariantMetaKey('button', 'outline'),
        {
          component: 'button',
          name: 'outline',
          className: 'zbk-button--outline',
          inlineStyles: [],
          stylesheetPaths: [],
        },
      ],
    ]);

    mergeVariantOverrideEntry(
      {
        component: 'button',
        name: 'outline',
        className: 'zbk-button--outline-alt',
        overrides: {
          canvas: '{color.blue-500}',
          missing: 'bad',
        },
      },
      registry,
      tokens,
      metadata,
      'button.variant.outline.json'
    );

    expect(registry.button.outline).toEqual({
      component: 'button',
      name: 'outline',
      className: 'zbk-button--outline-alt',
      overrides: {
        radius: '4px',
        canvas: '{color.blue-500}',
      },
    });
    expect(metadata.get(buildVariantMetaKey('button', 'outline'))).toEqual({
      component: 'button',
      name: 'outline',
      className: 'zbk-button--outline-alt',
      inlineStyles: [],
      stylesheetPaths: [],
    });
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });
});

describe('variant grammar enforcement', () => {
  const tokens: Record<string, TokenInterface> = {
    'zbk-button': {
      canvas: { value: '{brand.200}', type: 'color', description: 'bg' },
      ink: { value: '{app.ink}', type: 'color', description: 'fg' },
    } as unknown as TokenInterface,
  };

  it('carries axis and description through normalization', () => {
    const entry = normalizeVariantOverrideEntry({
      component: 'button',
      name: 'brand-cta',
      axis: 'style',
      description: 'Brand call-to-action.',
      overrides: { canvas: '{action.canvas}' },
    });
    expect(entry?.axis).toBe('style');
    expect(entry?.description).toBe('Brand call-to-action.');
  });

  it('accepts the consumer styles escape hatch with a guarantees warning', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const registry = {};
    const variantMetadata = new Map();

    const entry = normalizeVariantOverrideEntry({
      component: 'button',
      name: 'promo',
      overrides: { canvas: '{action.canvas}' },
      styles: { inline: 'text-wrap: balance;' },
    });
    expect(entry?.styles?.inline).toBe('text-wrap: balance;');

    mergeVariantOverrideEntry(
      entry!,
      registry,
      tokens,
      variantMetadata,
      'zbk-button.variant.promo.json',
      '/tmp/theme'
    );

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('bypass zebkit’s token and accessibility guarantees'.replace('’', "'"))
    );
    const meta = variantMetadata.get(buildVariantMetaKey('button', 'promo'));
    expect(meta.inlineStyles).toEqual(['text-wrap: balance;']);
    warnSpy.mockRestore();
  });

  it('resolves consumer stylesheetPaths against the override file directory', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const registry = {};
    const variantMetadata = new Map();

    const entry = normalizeVariantOverrideEntry({
      component: 'button',
      name: 'promo',
      overrides: {},
      styles: { stylesheetPaths: ['promo.scss'] },
    });

    mergeVariantOverrideEntry(
      entry!,
      registry,
      tokens,
      variantMetadata,
      'zbk-button.variant.promo.json',
      '/projects/app/theme'
    );

    const meta = variantMetadata.get(buildVariantMetaKey('button', 'promo'));
    expect(meta.stylesheetPaths).toEqual(['/projects/app/theme/promo.scss']);
    warnSpy.mockRestore();
  });

  it('keeps axis when a consumer override layers onto a shipped variant', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const registry = {
      button: {
        lg: {
          component: 'button',
          name: 'lg',
          className: 'zbk-button--lg',
          overrides: { canvas: '{action.canvas}' },
          axis: 'size',
        },
      },
    };
    const variantMetadata = new Map();

    mergeVariantOverrideEntry(
      normalizeVariantOverrideEntry({
        component: 'button',
        name: 'lg',
        overrides: { ink: '{action.ink}' },
      })!,
      registry,
      tokens,
      variantMetadata,
      'overrides.json'
    );

    expect(registry.button.lg.axis).toBe('size');
    expect(registry.button.lg.overrides).toEqual({
      canvas: '{action.canvas}',
      ink: '{action.ink}',
    });
    warnSpy.mockRestore();
  });
});

describe('shipped-variant token-only lint', () => {

  it('passes token-only shipped variants', () => {
    expect(() =>
      assertShippedVariantsAreTokenOnly([
        { component: 'button', name: 'ghost', overrides: { canvas: 'transparent' } },
      ])
    ).not.toThrow();
  });

  it('fails the build when a shipped variant uses styles.inline', () => {
    expect(() =>
      assertShippedVariantsAreTokenOnly([
        {
          component: 'button',
          name: 'fancy',
          overrides: {},
          styles: { inline: 'text-wrap: balance;' },
        },
      ])
    ).toThrow(/token-only \(GRAMMAR\.md §6\)[\s\S]*button\.fancy uses styles\.inline/);
  });

  it('fails the build when a shipped variant uses styles.stylesheetPaths', () => {
    expect(() =>
      assertShippedVariantsAreTokenOnly([
        {
          component: 'button',
          name: 'fancy',
          overrides: {},
          styles: { stylesheetPaths: ['x.scss'] },
        },
      ])
    ).toThrow(/component token-surface gap/);
  });

  it('ignores empty styles objects', () => {
    expect(() =>
      assertShippedVariantsAreTokenOnly([
        { component: 'button', name: 'ghost', overrides: {}, styles: {} },
      ])
    ).not.toThrow();
  });
});
