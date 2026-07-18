/**
 * @jest-environment node
 */

import type { TokenInterface } from '@definitions/tokens';
import { convertTokensToCssVars } from './token-converter';

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
      fontTokens({ $value: '"Inter"', $type: 'fontFamily', $extensions: { "dev.zebkit": { font: { source: 'system', fallback: 'sans' } } }, })
    );
    expect(css).toContain('--zbk-font-family-primary: "Inter", ui-sans-serif, system-ui');
  });

  it('does not append a fallback to a reference value', () => {
    const { css } = convertTokensToCssVars({
      'zbk-font-family': {
        primary: { $value: '"Inter"', $type: 'fontFamily', $extensions: { "dev.zebkit": { font: { source: 'system' } } } },
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
        $type: 'fontFamily',
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
        $value: '"Inter"',
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
        $value: '"Fira Code"',
        $type: 'fontFamily',
        $extensions: { "dev.zebkit": { font: { source: 'google', weights: [400, 500, 700] } } },
      })
    );
    expect(result.fontImports[0]).toContain('family=Fira+Code:wght@400;500;700');
  });

  it('google italic composes the ital axis combinatorially with weights', () => {
    const result = convertTokensToCssVars(
      fontTokens({
        $value: '"Inter"',
        $type: 'fontFamily',
        $extensions: { "dev.zebkit": { font: { source: 'google', weights: [400, 700], styles: ['normal', 'italic'] } } },
      })
    );
    expect(result.fontImports[0]).toContain('family=Inter:ital,wght@0,400;0,700;1,400;1,700');
  });

  it('link strategy emits no @import and populates fontHead', () => {
    const result = convertTokensToCssVars(
      fontTokens({
        $value: '"Inter"',
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
        $value: '"Brand Sans"',
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
        $value: '"Brand Sans"',
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

  it('rejects references that are not exactly two dot-separated segments', () => {
    const spy = errorSpy();
    const result = convertTokensToCssVars({
      'zbk-h1': {
        color: { $value: '{app.nested.ink}', $type: 'color', $description: '' },
      },
    } as unknown as { [key: string]: TokenInterface });

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("exactly '{module.entry}'");
    spy.mockRestore();
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
