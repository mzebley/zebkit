/**
 * @jest-environment node
 */

import type { TokenInterface } from '@definitions/tokens';
import { EXTENDED_TOKEN_BREAKPOINTS } from '../config';
import breakpointTokens from '../../tokens/breakpoint/tokens/tokens';
import {
  buildEnabledBreakpointsList,
  buildTokenLookup,
  computeEmissionClosure,
  extractReferencedColorFamilies,
  findChangedTokenEntries,
  resolveActiveBreakpointMap,
  resolveLookupOutputPath,
  slugifyFileSegment,
} from './build-helpers';

const breakpointTokensFor = (
  entries: Record<string, string | null>
): Record<string, TokenInterface> => ({
  'zbk-breakpoint': Object.fromEntries(
    Object.entries(entries).map(([key, value]) => [
      key,
      { $value: value, $type: 'dimension', $description: '' },
    ])
  ) as unknown as TokenInterface,
});

describe('build-tokens helpers', () => {
  it('extracts referenced color families from token values', () => {
    const tokens = {
      'zbk-button': {
        canvas: { $value: '{color.blue-500}', $type: 'color', $description: 'canvas' },
        ink: { $value: '{color.red-100}', $type: 'color', $description: 'ink' },
        border: { $value: 'currentColor', $type: 'color', $description: 'border' },
      },
      'zbk-app': {
        background: { $value: '{color.blue-700}', $type: 'color', $description: 'background' },
      },
    } as Record<string, TokenInterface>;

    expect([...extractReferencedColorFamilies(tokens)].sort()).toEqual(['blue', 'red']);
    expect([...extractReferencedColorFamilies({}, ['mint-500', 'global-black'])]).toEqual([
      'mint',
    ]);
  });

  it('finds effective token changes against a bundled default module', () => {
    const baseline = {
      red: { $value: '#ff0000', $type: 'color', $description: 'Red.' },
      blue: { $value: '#0000ff', $type: 'color', $description: 'Blue.' },
    } as unknown as TokenInterface;
    const current = {
      ...baseline,
      red: { ...baseline.red, $value: '#cc0000' },
    } as unknown as TokenInterface;

    expect([...findChangedTokenEntries(current, baseline)]).toEqual(['red']);
    expect(findChangedTokenEntries(baseline, baseline).size).toBe(0);
  });

  it('normalizes breakpoint config', () => {
    expect(buildEnabledBreakpointsList(undefined)).toBeUndefined();
    expect(buildEnabledBreakpointsList(true)).toBeUndefined();
    expect(buildEnabledBreakpointsList(false)).toBe(false);
    expect(buildEnabledBreakpointsList(['tablet', 'desktop'])).toEqual(['tablet', 'desktop']);
  });

  it('throws for invalid breakpoint values', () => {
    expect(() =>
      buildEnabledBreakpointsList(['tablet', 'watch'] as Array<'tablet' | 'watch'>)
    ).toThrow('Invalid extendedTokens.breakpoints value(s): watch.');
  });

  it('keeps EXTENDED_TOKEN_BREAKPOINTS in sync with the breakpoint token module', () => {
    expect([...EXTENDED_TOKEN_BREAKPOINTS]).toEqual(Object.keys(breakpointTokens));
  });

  it('resolves the active breakpoint map from tokens, excluding disabled (null) entries', () => {
    const tokens = breakpointTokensFor({
      tablet: '40rem',
      desktop: '70rem',
      widescreen: null,
    });

    // undefined/true => all enabled, in token order; disabled excluded.
    expect(resolveActiveBreakpointMap(tokens, undefined)).toEqual({
      tablet: '40rem',
      desktop: '70rem',
    });
    expect(resolveActiveBreakpointMap(tokens, true)).toEqual({
      tablet: '40rem',
      desktop: '70rem',
    });
    // false => none.
    expect(resolveActiveBreakpointMap(tokens, false)).toEqual({});
    // subset filter, preserving token order.
    expect(resolveActiveBreakpointMap(tokens, ['desktop'])).toEqual({
      desktop: '70rem',
    });
    // naming a token-disabled breakpoint is rejected.
    expect(() => resolveActiveBreakpointMap(tokens, ['widescreen'])).toThrow(
      'Invalid extendedTokens.breakpoints value(s): widescreen.'
    );
  });

  it('builds token lookup aliases and css variable names', () => {
    const lookup = buildTokenLookup({
      'zbk-button': {
        canvas: { $value: '#000', $type: 'color', $description: 'canvas' },
      },
      spacing: {
        sm: { $value: '0.5rem', $type: 'dimension', $description: 'small spacing' },
      },
    } as Record<string, TokenInterface>);

    expect(lookup['button.canvas']).toBe('--zbk-button-canvas');
    expect(lookup['{button.canvas}']).toBe('--zbk-button-canvas');
    expect(lookup['spacing.sm']).toBe('--spacing-sm');
  });

  it('resolves lookup output paths and slugifies file segments', () => {
    const destinationPath = '/tmp/zebkit-dist';
    expect(resolveLookupOutputPath(undefined, destinationPath)).toBe(
      '/tmp/zebkit-dist/token-lookup.json'
    );
    expect(resolveLookupOutputPath('./artifacts/lookup.json', destinationPath)).toContain(
      '/artifacts/lookup.json'
    );
    expect(slugifyFileSegment(' Button / Large  ')).toBe('button-large');
  });

  describe('computeEmissionClosure', () => {
    // Post-scale-resolution shape: control settings (min-ratio, max-scale,
    // viewport anchors) are already stripped; steps carry resolved clamp values.
    const scaled = {
      'zbk-font-size': {
        md: { $value: 'clamp(1rem, 2vw, 1.2rem)', $type: 'cssDimension', $description: '' },
        lg: { $value: 'clamp(1.2rem, 3vw, 1.6rem)', $type: 'cssDimension', $description: '' },
      },
      'zbk-spacing': {
        sm: { $value: 'clamp(0.5rem, 1vw, 0.6rem)', $type: 'cssDimension', $description: '' },
      },
      'zbk-h1': {
        'font-size': { $value: '{font-size.lg}', $type: 'cssDimension', $description: '' },
      },
    } as unknown as Record<string, TokenInterface>;

    it('includes overridden leaves and their transitive referrers', () => {
      const closure = computeEmissionClosure(scaled, {
        'zbk-font-size': new Set(['lg']),
      });
      expect(closure.has('zbk-font-size.lg')).toBe(true);
      expect(closure.has('zbk-h1.font-size')).toBe(true);
      expect(closure.has('zbk-font-size.md')).toBe(false);
      expect(closure.has('zbk-spacing.sm')).toBe(false);
    });

    it('re-emits a whole scale module when a consumed control was overridden', () => {
      // min-ratio was stripped during scale resolution, so it is absent from
      // `scaled` — that marks it as a control every step depends on.
      const closure = computeEmissionClosure(scaled, {
        'zbk-font-size': new Set(['min-ratio']),
      });
      expect(closure.has('zbk-font-size.md')).toBe(true);
      expect(closure.has('zbk-font-size.lg')).toBe(true);
      // …and referrers of the re-emitted steps follow.
      expect(closure.has('zbk-h1.font-size')).toBe(true);
      // Spacing is untouched: no viewport anchor changed.
      expect(closure.has('zbk-spacing.sm')).toBe(false);
    });

    it('re-emits spacing too when a shared viewport anchor was overridden', () => {
      const closure = computeEmissionClosure(scaled, {
        'zbk-font-size': new Set(['min-viewport']),
      });
      expect(closure.has('zbk-font-size.md')).toBe(true);
      expect(closure.has('zbk-spacing.sm')).toBe(true);
    });

    it('re-emits the spacing module when its max-scale control was overridden', () => {
      const closure = computeEmissionClosure(scaled, {
        'zbk-spacing': new Set(['max-scale']),
      });
      expect(closure.has('zbk-spacing.sm')).toBe(true);
      expect(closure.has('zbk-font-size.md')).toBe(false);
    });

    it('follows self-referencing component tokens (the variant-scope re-anchor case)', () => {
      // The variant compiler feeds a variant's overridden keys through this
      // closure so derived tokens (thumb follows track) re-resolve inside the
      // variant class instead of staying locked to their :root substitution.
      const componentTokens = {
        'zbk-toggle': {
          'track-height': { $value: '{spacing.105}', $type: 'dimension', $description: '' },
          'thumb-size': { $value: '{toggle.track-height}', $type: 'dimension', $description: '' },
          'border-radius': { $value: '{toggle.track-height}', $type: 'dimension', $description: '' },
          'thumb-inset': { $value: '{spacing.neg-2px}', $type: 'dimension', $description: '' },
        },
      } as unknown as Record<string, TokenInterface>;

      const closure = computeEmissionClosure(componentTokens, {
        'zbk-toggle': new Set(['track-height']),
      });
      expect(closure.has('zbk-toggle.thumb-size')).toBe(true);
      expect(closure.has('zbk-toggle.border-radius')).toBe(true);
      expect(closure.has('zbk-toggle.thumb-inset')).toBe(false);
    });

    it('follows reverse dependencies through shadow composite references', () => {
      const tokens = {
        'zbk-app': {
          ink: {
            $type: 'color',
            $value: { colorSpace: 'srgb', components: [0, 0, 0] },
            $description: 'Ink.',
          },
        },
        'zbk-elevation': {
          focus: {
            $type: 'shadow',
            $description: 'Focus.',
            $value: [{
              color: '{app.ink}',
              offsetX: { value: 0, unit: 'px' },
              offsetY: { value: 0, unit: 'px' },
              blur: { value: 2, unit: 'px' },
              spread: { value: 0, unit: 'px' },
            }],
          },
        },
      } as unknown as Record<string, TokenInterface>;
      const closure = computeEmissionClosure(tokens, { 'zbk-app': new Set(['ink']) });
      expect(closure.has('zbk-elevation.focus')).toBe(true);
    });
  });
});
