/**
 * @jest-environment node
 */

import {
  serializeColorValue,
  serializeCubicBezierValue,
  serializeDurationValue,
  serializeShadowValue,
  type ShadowValue,
  type TokenInterface,
} from '@definitions/tokens';
import { convertDotNotation, convertTokensToCssVars } from './token-converter';

describe('convertDotNotation — bypass projection', () => {
  it('preserves unchecked references while qualifying local references when context exists', () => {
    expect(convertDotNotation('{external.value}', 'color', 'zbk', {}, true)).toBe(
      'var(--zbk-external-value)'
    );
    expect(convertDotNotation('{base}', 'color', 'zbk', {}, true)).toBe('var(--zbk-base)');
    expect(convertDotNotation('{base}', 'color', 'zbk', {}, true, undefined, undefined, 'test')).toBe(
      'var(--zbk-test-base)'
    );
  });
});

describe('convertTokensToCssVars — selector scoping (rootSelector)', () => {
  const tokens = {
    'zbk-app': {
      canvas: { $value: '#ffffff', $type: 'color', $description: 'canvas' },
    },
  } as unknown as { [key: string]: TokenInterface };

  it('defaults to :root when no selector is given', () => {
    const { css } = convertTokensToCssVars(tokens);
    expect(css).toContain(':root {');
    expect(css).toContain('--zbk-app-canvas: #ffffff;');
  });

  it('emits variables under a custom selector when one is provided', () => {
    const { css } = convertTokensToCssVars(tokens, {
      selector: '[data-zbk-theme="brutalist"]',
    });
    expect(css).toContain('[data-zbk-theme="brutalist"] {');
    expect(css).toContain('--zbk-app-canvas: #ffffff;');
    // Scoped output must not leak token vars onto :root.
    expect(css).not.toContain(':root {');
  });
});

describe('convertTokensToCssVars — referenceTokens (minimal overlay emission)', () => {
  it('emits only the passed subset but resolves references against referenceTokens', () => {
    const emitted = {
      'zbk-h1': {
        color: { $value: '{app.ink}', $type: 'color', $description: 'h1 color' },
      },
    } as unknown as { [key: string]: TokenInterface };
    const full = {
      ...emitted,
      'zbk-app': {
        ink: { $value: '#111111', $type: 'color', $description: 'ink' },
      },
    } as unknown as { [key: string]: TokenInterface };

    const { css } = convertTokensToCssVars(emitted, {
      selector: '[data-zbk-theme="dark"]',
      referenceTokens: full,
    });

    // Reference resolves to a var() (not "undefined") even though zbk-app is not emitted.
    expect(css).toContain('--zbk-h1-color: var(--zbk-app-ink);');
    expect(css).not.toContain('undefined');
    // Only the subset is emitted — the referenced module's own vars are absent.
    expect(css).not.toContain('--zbk-app-ink:');
  });

  it('emits "undefined" when a reference is unresolvable in the subset alone', () => {
    const emitted = {
      'zbk-h1': {
        color: { $value: '{app.ink}', $type: 'color', $description: 'h1 color' },
      },
    } as unknown as { [key: string]: TokenInterface };

    // No referenceTokens → validation fails against the subset → "undefined".
    const { css } = convertTokensToCssVars(emitted, {
      selector: '[data-zbk-theme="dark"]',
    });
    expect(css).toContain('--zbk-h1-color: undefined;');
  });
});

describe('convertTokensToCssVars — font tokens', () => {
  const fontTokens = (
    props: Record<string, unknown>
  ): { [key: string]: TokenInterface } =>
    ({
      'zbk-font-family': { primary: { description: 'primary', ...props } },
    } as unknown as { [key: string]: TokenInterface });

  it('appends the canonical fallback stack to a concrete value', () => {
    const { css } = convertTokensToCssVars(
      fontTokens({ $value: 'Inter', $type: 'fontFamily', $extensions: { "dev.zebkit": { font: { source: 'system', fallback: 'sans' } } }, })
    );
    expect(css).toContain('--zbk-font-family-primary: "Inter", ui-sans-serif, system-ui');
  });

  it('serializes DTCG font-family arrays without losing family boundaries', () => {
    const { css } = convertTokensToCssVars(
      fontTokens({
        $value: ['Acme, Inc', 'Say "Hello"', 'Back\\Slash', 'serif'],
        $type: 'fontFamily',
        $extensions: { 'dev.zebkit': { font: { source: 'system' } } },
      })
    );

    expect(css).toContain(
      '--zbk-font-family-primary: "Acme, Inc", "Say \\"Hello\\"", "Back\\\\Slash", serif;'
    );
  });

  it('does not append a fallback to a reference value', () => {
    const { css } = convertTokensToCssVars({
      'zbk-font-family': {
        primary: { $value: 'Inter', $type: 'fontFamily', $extensions: { "dev.zebkit": { font: { source: 'system' } } } },
        body: {
          $value: '{font-family.primary}',
          $type: 'fontFamily',
          $extensions: { "dev.zebkit": { font: { fallback: 'sans' } } },
          $description: 'body',
        },
      },
    } as unknown as { [key: string]: TokenInterface });
    expect(css).toContain('--zbk-font-family-body: var(--zbk-font-family-primary);');
    expect(css).not.toContain('--zbk-font-family-body: var(--zbk-font-family-primary), ui-sans-serif');
  });

  it('system source emits a plain var with no @import or @font-face', () => {
    const result = convertTokensToCssVars(
      fontTokens({
        $value: 'ui-sans-serif, system-ui, sans-serif',
        $type: 'cssFontFamily',
        $extensions: { "dev.zebkit": { font: { source: 'system' } } },
      })
    );
    expect(result.css).not.toContain('@import');
    expect(result.css).not.toContain('@font-face');
    expect(result.fontImports).toHaveLength(0);
  });

  it('google variable range builds a wght@min..max css2 URL (import strategy)', () => {
    const result = convertTokensToCssVars(
      fontTokens({
        $value: 'Inter',
        $type: 'fontFamily',
        $extensions: { "dev.zebkit": { font: { source: 'google', weights: '200..800' } } },
      })
    );
    expect(result.fontImports[0]).toContain(
      "https://fonts.googleapis.com/css2?family=Inter:wght@200..800&display=swap"
    );
  });

  it('google static array builds a semicolon-joined wght list', () => {
    const result = convertTokensToCssVars(
      fontTokens({
        $value: 'Fira Code',
        $type: 'fontFamily',
        $extensions: { "dev.zebkit": { font: { source: 'google', weights: [400, 500, 700] } } },
      })
    );
    expect(result.fontImports[0]).toContain('family=Fira+Code:wght@400;500;700');
  });

  it('google italic composes the ital axis combinatorially with weights', () => {
    const result = convertTokensToCssVars(
      fontTokens({
        $value: 'Inter',
        $type: 'fontFamily',
        $extensions: { "dev.zebkit": { font: { source: 'google', weights: [400, 700], styles: ['normal', 'italic'] } } },
      })
    );
    expect(result.fontImports[0]).toContain('family=Inter:ital,wght@0,400;0,700;1,400;1,700');
  });

  it('link strategy emits no @import and populates fontHead', () => {
    const result = convertTokensToCssVars(
      fontTokens({
        $value: 'Inter',
        $type: 'fontFamily',
        $extensions: { "dev.zebkit": { font: { source: 'google', weights: '200..800' } } },
      }),
      { fontStrategy: 'link' }
    );
    expect(result.css).not.toContain('@import');
    expect(result.fontImports).toHaveLength(0);
    expect(result.fontHead.preconnect).toContain('https://fonts.gstatic.com');
    expect(result.fontHead.stylesheets[0]).toContain('css2?family=Inter:wght@200..800');
  });

  it('local source emits @font-face, resolving bare src against assetFilePath', () => {
    const result = convertTokensToCssVars(
      fontTokens({
        $value: 'Brand Sans',
        $type: 'fontFamily',
        $extensions: { "dev.zebkit": { font: { source: 'local', faces: [{ src: 'BrandSans.woff2', weight: '100 900', style: 'normal' }] } } },
      }),
      { assetFilePath: '/fonts/' }
    );
    expect(result.fontFaces[0]).toContain('font-family: "Brand Sans";');
    expect(result.fontFaces[0]).toContain('src: url("/fonts/BrandSans.woff2") format("woff2");');
    expect(result.fontFaces[0]).toContain('font-weight: 100 900;');
    expect(result.css).toContain('@font-face {');
  });

  it('local source uses verbatim src for absolute/remote URLs', () => {
    const result = convertTokensToCssVars(
      fontTokens({
        $value: 'Brand Sans',
        $type: 'fontFamily',
        $extensions: { "dev.zebkit": { font: { source: 'local', faces: [{ src: 'https://cdn.example/BrandSans.woff2' }] } } },
      }),
      { assetFilePath: '/fonts/' }
    );
    expect(result.fontFaces[0]).toContain('url("https://cdn.example/BrandSans.woff2")');
  });
});

describe('convertTokensToCssVars — error collection', () => {
  const errorSpy = () => jest.spyOn(console, 'error').mockImplementation(() => {});

  it('collects an error (and emits undefined) for a reference to a missing token', () => {
    const spy = errorSpy();
    const result = convertTokensToCssVars({
      'zbk-h1': {
        color: { $value: '{app.does-not-exist}', $type: 'color', $description: '' },
      },
    } as unknown as { [key: string]: TokenInterface });

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('{app.does-not-exist}');
    expect(result.css).toContain('--zbk-h1-color: undefined;');
    spy.mockRestore();
  });

  it('accepts arbitrary-depth reference syntax and rejects unknown exact targets', () => {
    const spy = errorSpy();
    const result = convertTokensToCssVars({
      'zbk-h1': {
        color: { $value: '{app.nested.ink}', $type: 'color', $description: '' },
      },
    } as unknown as { [key: string]: TokenInterface });

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('Ensure the target token or palette color exists');
    spy.mockRestore();
  });

  it('resolves arbitrary-depth and reserved $root references to flattened CSS variables', () => {
    const result = convertTokensToCssVars({
      'zbk-color': {
        'accent-root': {
          $value: { colorSpace: 'srgb', components: [1, 0, 0] },
          $type: 'color',
          $description: 'Accent.',
        },
      },
      'zbk-app': {
        nested: { $value: '{color.accent.$root}', $type: 'color', $description: 'Nested.' },
      },
    } as unknown as Record<string, TokenInterface>);
    expect(result.errors).toEqual([]);
    expect(result.css).toContain('--zbk-app-nested: var(--zbk-color-accent-root);');
  });

  it('reports no errors for a clean token map', () => {
    const result = convertTokensToCssVars({
      'zbk-app': {
        canvas: { $value: '#fff', $type: 'color', $description: '' },
        ink: { $value: '{app.canvas}', $type: 'color', $description: '' },
      },
    } as unknown as { [key: string]: TokenInterface });

    expect(result.errors).toEqual([]);
  });
});

describe('serializeColorValue — DTCG color serialization', () => {
  it('serializes the palette surfaces byte-exactly', () => {
    // Ramp steps: legacy comma hsl() notation.
    expect(serializeColorValue({ colorSpace: 'hsl', components: [0, 80, 58] })).toBe(
      'hsl(0, 80%, 58%)'
    );
    // Globals: hex fallback wins at full alpha.
    expect(
      serializeColorValue({
        colorSpace: 'srgb',
        components: [19 / 255, 19 / 255, 19 / 255],
        hex: '#131313',
      })
    ).toBe('#131313');
    // D8: fully-transparent black is the `transparent` keyword.
    expect(
      serializeColorValue({ colorSpace: 'srgb', components: [0, 0, 0], alpha: 0 })
    ).toBe('transparent');
  });

  it('covers the non-palette notations', () => {
    expect(
      serializeColorValue({ colorSpace: 'hsl', components: [200, 50, 40], alpha: 0.5 })
    ).toBe('hsla(200, 50%, 40%, 0.5)');
    expect(serializeColorValue({ colorSpace: 'srgb', components: [1, 0.5, 0] })).toBe(
      'rgb(255, 128, 0)'
    );
    expect(
      serializeColorValue({ colorSpace: 'oklch', components: [0.7, 0.1, 200] })
    ).toBe('oklch(0.7 0.1 200)');
  });

  it('emits structured color values through the converter', () => {
    const result = convertTokensToCssVars({
      'zbk-app': {
        canvas: {
          $value: { colorSpace: 'hsl', components: [48, 72, 98] },
          $type: 'color',
          $description: '',
        },
      },
    } as unknown as { [key: string]: TokenInterface });

    expect(result.errors).toEqual([]);
    expect(result.css).toContain('--zbk-app-canvas: hsl(48, 72%, 98%);');
  });
});

describe('serializeShadowValue — DTCG shadow serialization', () => {
  const layer = (
    offsetX: number,
    offsetY: number,
    blur: number,
    spread: number,
    alpha: number,
    inset = false
  ): ShadowValue => ({
    color: { colorSpace: 'srgb', components: [0, 0, 0], alpha },
    offsetX: { value: offsetX, unit: 'px' },
    offsetY: { value: offsetY, unit: 'px' },
    blur: { value: blur, unit: 'px' },
    spread: { value: spread, unit: 'px' },
    ...(inset ? { inset: true } : {}),
  });

  it('reproduces the elevation ramp strings byte-exactly', () => {
    // Zero-magnitude offsets/spread drop the unit; srgb black renders in space notation.
    expect(serializeShadowValue([layer(0, 1, 2, 0, 0.05)])).toBe(
      '0 1px 2px 0 rgb(0 0 0 / 0.05)'
    );
    // Multiple layers join with ', '; negative spread keeps its unit.
    expect(
      serializeShadowValue([layer(0, 1, 3, 0, 0.1), layer(0, 1, 2, -1, 0.1)])
    ).toBe('0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)');
    // Inset prefix.
    expect(serializeShadowValue([layer(0, 2, 4, 0, 0.05, true)])).toBe(
      'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)'
    );
  });

  it('serializes the empty array as `none` and a bare object as one layer', () => {
    expect(serializeShadowValue([])).toBe('none');
    expect(serializeShadowValue(layer(0, 25, 50, -12, 0.25))).toBe(
      '0 25px 50px -12px rgb(0 0 0 / 0.25)'
    );
  });

  it('requires collection context for shadow references', () => {
    expect(() => serializeShadowValue(['{elevation.sm}'])).toThrow(
      /without a token collection resolver/
    );
  });

  it('emits structured shadow values through the converter', () => {
    const result = convertTokensToCssVars({
      'zbk-elevation': {
        sm: {
          $value: [layer(0, 1, 3, 0, 0.1), layer(0, 1, 2, -1, 0.1)],
          $type: 'shadow',
          $description: '',
        },
        none: { $value: [], $type: 'shadow', $description: '' },
      },
    } as unknown as { [key: string]: TokenInterface });

    expect(result.errors).toEqual([]);
    expect(result.css).toContain(
      '--zbk-elevation-sm: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);'
    );
    expect(result.css).toContain('--zbk-elevation-none: none;');
  });

  it('serializes and validates shadow composite references with the Zebkit prefix', () => {
    const result = convertTokensToCssVars({
      'zbk-color': {
        ink: {
          $value: { colorSpace: 'srgb', components: [0, 0, 0] },
          $type: 'color',
          $description: 'Ink.',
        },
      },
      'zbk-spacing': {
        '025': { $value: { value: 0.25, unit: 'rem' }, $type: 'dimension', $description: 'Space.' },
      },
      'zbk-elevation': {
        focus: {
          $type: 'shadow',
          $description: 'Focus.',
          $value: [{
            color: '{color.ink}',
            offsetX: { value: 0, unit: 'px' },
            offsetY: '{spacing.025}',
            blur: { value: 2, unit: 'px' },
            spread: { value: 0, unit: 'px' },
          }],
        },
      },
    } as unknown as Record<string, TokenInterface>);
    expect(result.errors).toEqual([]);
    expect(result.css).toContain(
      '--zbk-elevation-focus: 0 var(--zbk-spacing-025) 2px 0 var(--zbk-color-ink);'
    );
  });

  it('reports missing and incompatible shadow composite references', () => {
    const result = convertTokensToCssVars({
      'zbk-spacing': {
        sm: { $value: { value: 1, unit: 'rem' }, $type: 'dimension', $description: 'Space.' },
      },
      'zbk-elevation': {
        invalid: {
          $type: 'shadow',
          $description: 'Invalid.',
          $value: [{
            color: '{spacing.sm}',
            offsetX: '{spacing.missing}',
            offsetY: { value: 0, unit: 'px' },
            blur: { value: 2, unit: 'px' },
            spread: { value: 0, unit: 'px' },
          }],
        },
      },
    } as unknown as Record<string, TokenInterface>);
    expect(result.errors).toEqual(expect.arrayContaining([
      expect.stringContaining("type 'color' cannot reference 'dimension'"),
      expect.stringContaining('{spacing.missing}'),
    ]));
  });
});

describe('serializeDurationValue / serializeCubicBezierValue — DTCG transition split', () => {
  it('serializes durations, dropping the unit only at zero', () => {
    expect(serializeDurationValue({ value: 325, unit: 'ms' })).toBe('325ms');
    expect(serializeDurationValue({ value: 0, unit: 'ms' })).toBe('0ms');
    expect(serializeDurationValue({ value: 2, unit: 's' })).toBe('2s');
  });

  it('serializes cubic-bezier curves at two decimals (byte-exact)', () => {
    expect(serializeCubicBezierValue([0.38, 1.21, 0.22, 1.0])).toBe(
      'cubic-bezier(0.38, 1.21, 0.22, 1.00)'
    );
    expect(serializeCubicBezierValue([0.42, 1.67, 0.21, 0.9])).toBe(
      'cubic-bezier(0.42, 1.67, 0.21, 0.90)'
    );
  });

  it('emits structured duration/bezier values through the converter, wrapping a11y durations', () => {
    const result = convertTokensToCssVars({
      'zbk-transition': {
        'duration-default': {
          $value: { value: 325, unit: 'ms' },
          $type: 'duration',
          $description: '',
          $extensions: { 'dev.zebkit': { a11y: true } },
        },
        'calm-fx-function-default': {
          $value: [0.34, 0.8, 0.34, 1.0],
          $type: 'cubicBezier',
          $description: '',
        },
      },
    } as unknown as { [key: string]: TokenInterface });

    expect(result.errors).toEqual([]);
    expect(result.css).toContain(
      '--zbk-transition-duration-default: calc(325ms * var(--zbk-a11y-transition-duration-modifier));'
    );
    expect(result.css).toContain(
      '--zbk-transition-calm-fx-function-default: cubic-bezier(0.34, 0.80, 0.34, 1.00);'
    );
  });
});
