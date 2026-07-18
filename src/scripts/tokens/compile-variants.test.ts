/**
 * @jest-environment node
 */

import type { TokenInterface } from '@definitions/tokens';
import fs from 'fs-extra';
import os from 'node:os';
import path from 'node:path';
import {
  assertShippedVariantsAreTokenOnly,
  buildVariantMetaKey,
  extractVariantOverrideEntries,
  isVariantOverrideFile,
  mergeVariantOverrideEntry,
  filterShippedVariants,
  normalizeVariantOverrideEntry,
  readVariantOverrideFiles,
  throwVariantOverrideErrors,
} from './compile-variant-helpers';

describe('compile-variants helpers', () => {
  it('recognizes variant override filenames', () => {
    // Canonical per-component file, parallel to zbk-button.tokens.json.
    expect(isVariantOverrideFile('theme/acme/zbk-button.variants.json')).toBe(true);
    // Single-variant file (bundled theme presets use this form).
    expect(isVariantOverrideFile('theme/acme/zbk-button.variant.pill.json')).toBe(true);
    // Multi-component collection file.
    expect(isVariantOverrideFile('theme/acme/zbk-variants.json')).toBe(true);
    expect(isVariantOverrideFile('theme/acme/custom-variants.json')).toBe(true);

    expect(isVariantOverrideFile('theme/acme/zbk-button.tokens.json')).toBe(false);
    expect(isVariantOverrideFile('theme/acme/zbk-app.tokens.json')).toBe(false);
  });

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

  it('collects unknown override keys with the valid vocabulary while preserving valid overrides', () => {
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
        canvas: { $value: '#fff', $type: 'color', $description: 'canvas' },
        radius: { $value: '4px', $type: 'dimension', $description: 'radius' },
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

    const errors: string[] = [];
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
      'button.variant.outline.json',
      undefined,
      errors,
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
    expect(errors).toEqual([
      expect.stringContaining("unknown token 'missing'. Source: button.variant.outline.json. Valid token keys: canvas, radius."),
    ]);
  });

  it('fails the build with every collected variant override fix', () => {
    expect(() => throwVariantOverrideErrors([
      "[zbk-button] Variant 'outline' overrides unknown token 'canavs'. Source: theme.json. Valid token keys: canvas.",
    ])).toThrow("unknown token 'canavs'. Source: theme.json. Valid token keys: canvas.");
    expect(() => throwVariantOverrideErrors([])).not.toThrow();
  });
});

describe('variant grammar enforcement', () => {
  const tokens: Record<string, TokenInterface> = {
    'zbk-button': {
      canvas: { $value: '{brand.200}', $type: 'color', $description: 'bg' },
      ink: { $value: '{app.ink}', $type: 'color', $description: 'fg' },
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

describe('components-config variant filtering', () => {
  const shipped = [
    { component: 'button', name: 'ghost', axis: 'style', overrides: { canvas: 'transparent' } },
    { component: 'button', name: 'outline', axis: 'style', overrides: { canvas: 'transparent' } },
    { component: 'button', name: 'lg', axis: 'size', overrides: { 'font-size': '{font-size.lg}' } },
    { component: 'tooltip', name: 'inverse', overrides: { canvas: '{app.ink}' } },
  ];

  it('passes everything through without a filter', () => {
    const { activeConfigs, excludedShippedVariants } = filterShippedVariants(shipped);
    expect(activeConfigs).toHaveLength(4);
    expect(excludedShippedVariants.size).toBe(0);
  });

  it('drops all variants of an excluded component silently', () => {
    const { activeConfigs, excludedShippedVariants } = filterShippedVariants(shipped, {
      excluded: new Set(['tooltip']),
      variantAllowlists: new Map(),
    });
    expect(activeConfigs.map((v) => `${v.component}.${v.name}`)).toEqual([
      'button.ghost',
      'button.outline',
      'button.lg',
    ]);
    // Excluded-component variants are not "allowlist misses" — no patch warning applies.
    expect(excludedShippedVariants.size).toBe(0);
  });

  it('keeps only allowlisted shipped variants and records the dropped names', () => {
    const { activeConfigs, excludedShippedVariants } = filterShippedVariants(shipped, {
      excluded: new Set(),
      variantAllowlists: new Map([['button', new Set(['ghost'])]]),
    });
    expect(activeConfigs.map((v) => `${v.component}.${v.name}`)).toEqual([
      'button.ghost',
      'tooltip.inverse',
    ]);
    expect(excludedShippedVariants.get('button')).toEqual(new Set(['outline', 'lg']));
  });

  it('warns with the shipped vocabulary when an allowlist names an unknown variant', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    filterShippedVariants(shipped, {
      excluded: new Set(),
      variantAllowlists: new Map([['button', new Set(['ghots'])]]),
    });
    expect(warnSpy.mock.calls.some(
      (call) =>
        String(call[0]).includes('unknown shipped variant "ghots"') &&
        String(call[0]).includes('ghost, outline, lg')
    )).toBe(true);
    warnSpy.mockRestore();
  });
});

describe('variant build diagnostics', () => {
  it('reports parse failures from every override file in one rejection', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'zebkit-variant-errors-'));
    const overrideDir = path.join(root, 'overrides');

    try {
      await fs.ensureDir(overrideDir);
      const first = path.join(overrideDir, 'first-variants.json');
      const second = path.join(overrideDir, 'second-variants.json');
      await fs.writeFile(first, '{ invalid');
      await fs.writeFile(second, '{ also-invalid');

      const errors: string[] = [];
      await readVariantOverrideFiles([second, first], errors);
      expect(() => throwVariantOverrideErrors(errors)).toThrow(
        /Variant override validation failed:[\s\S]*first-variants\.json[\s\S]*second-variants\.json/
      );
    } finally {
      await fs.remove(root);
    }
  });
});
