/**
 * @jest-environment node
 */

import { getAtPath, setAtPath } from './config-paths';

describe('getAtPath', () => {
  const obj = { tokens: { fonts: { strategy: 'preload' }, destinationPath: './out' } };

  it('reads a nested value by dot-path', () => {
    expect(getAtPath(obj, 'tokens.fonts.strategy')).toBe('preload');
    expect(getAtPath(obj, 'tokens.destinationPath')).toBe('./out');
  });

  it('returns undefined for a missing segment', () => {
    expect(getAtPath(obj, 'tokens.spaceScale.static')).toBeUndefined();
    expect(getAtPath(obj, 'nope.at.all')).toBeUndefined();
  });
});

describe('setAtPath', () => {
  it('sets a nested value, creating intermediate objects', () => {
    const obj: Record<string, unknown> = {};
    setAtPath(obj, 'tokens.fonts.strategy', 'manual');
    expect(obj).toEqual({ tokens: { fonts: { strategy: 'manual' } } });
  });

  it('overwrites an existing value without clobbering siblings', () => {
    const obj = { tokens: { destinationPath: './dist', fonts: { strategy: 'import' } } };
    setAtPath(obj, 'tokens.fonts.strategy', 'preload');
    expect(obj).toEqual({
      tokens: { destinationPath: './dist', fonts: { strategy: 'preload' } },
    });
  });
});
