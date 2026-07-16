/**
 * @jest-environment node
 *
 * The breakpoint token module (src/tokens/breakpoint) is the single source of
 * truth for the responsive axis, but three fallback copies exist for contexts
 * that can't load it: EXTENDED_TOKEN_BREAKPOINTS (config typing/validation),
 * expand.ts BREAKPOINTS (utility generator fallback), and the `!default`
 * variables in _breakpoints.scss (standalone Sass compilation). This suite
 * pins each copy to the tokens so drift fails CI instead of shipping silently.
 */

import fs from 'fs';
import path from 'path';
import breakpointTokens from '../tokens/breakpoint/tokens/tokens';
import { EXTENDED_TOKEN_BREAKPOINTS } from './config';
import { BREAKPOINTS } from './utilities/expand';

const tokenEntries = Object.entries(breakpointTokens) as Array<
  [string, { value: string | null }]
>;
const tokenKeys = tokenEntries.map(([key]) => key);

describe('breakpoint fallback copies stay in sync with the token module', () => {
  it('EXTENDED_TOKEN_BREAKPOINTS matches the token keys in order', () => {
    expect([...EXTENDED_TOKEN_BREAKPOINTS]).toEqual(tokenKeys);
  });

  it('expand.ts BREAKPOINTS fallback matches the token keys in order', () => {
    expect([...BREAKPOINTS]).toEqual(tokenKeys);
  });

  it('_breakpoints.scss defaults match the token keys and widths', () => {
    const scss = fs.readFileSync(
      path.resolve(__dirname, '../tokens/styles/variables/_breakpoints.scss'),
      'utf8'
    );

    // $breakpoint-<key>: <width> !default;
    const defaults = new Map<string, string>();
    for (const match of scss.matchAll(/\$breakpoint-([a-z-]+):\s*([^\s;]+)\s+!default/g)) {
      defaults.set(match[1], match[2]);
    }
    expect([...defaults.keys()]).toEqual(tokenKeys);
    for (const [key, entry] of tokenEntries) {
      if (entry.value == null) continue; // token-disabled breakpoints carry no width
      expect(defaults.get(key)).toBe(entry.value);
    }

    // The $breakpoints fallback map must reference every key.
    const mapSection = scss.slice(scss.indexOf('$breakpoints:'));
    for (const key of tokenKeys) {
      expect(mapSection).toContain(`'${key}': $breakpoint-${key}`);
    }
  });
});
