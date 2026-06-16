/**
 * @jest-environment node
 */

import type { TokenInterface } from '@definitions/tokens';
import { EXTENDED_TOKEN_BREAKPOINTS } from '../config';
import breakpointTokens from '../../core/breakpoint/tokens/tokens';
import {
  buildEnabledBreakpointsList,
  buildTokenLookup,
  extractReferencedColorFamilies,
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
      { value, type: 'dimension', description: '' },
    ])
  ) as unknown as TokenInterface,
});

describe('build-tokens helpers', () => {
  it('extracts referenced color families from token values', () => {
    const tokens = {
      'zbk-button': {
        canvas: { value: '{color.blue-500}', type: 'color', description: 'canvas' },
        ink: { value: '{color.red-100}', type: 'color', description: 'ink' },
        border: { value: 'currentColor', type: 'color', description: 'border' },
      },
      'zbk-app': {
        background: { value: '{color.blue-700}', type: 'color', description: 'background' },
      },
    } as Record<string, TokenInterface>;

    expect([...extractReferencedColorFamilies(tokens)].sort()).toEqual(['blue', 'red']);
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
        canvas: { value: '#000', type: 'color', description: 'canvas' },
      },
      spacing: {
        sm: { value: '0.5rem', type: 'dimension', description: 'small spacing' },
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
});
