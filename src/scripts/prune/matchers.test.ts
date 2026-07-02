/**
 * @jest-environment node
 */

import { compileMatchers, matchAny } from './matchers';

describe('compileMatchers', () => {
  it('treats a plain entry as an exact match', () => {
    const [matcher] = compileMatchers(['button']);
    expect(matcher.source).toBe('button');
    expect(matcher.test('button')).toBe(true);
    expect(matcher.test('button-primary')).toBe(false);
  });

  it('compiles a `/regex/` entry to a RegExp', () => {
    const [matcher] = compileMatchers(['/^swiper/']);
    expect(matcher.test('swiper-slide')).toBe(true);
    expect(matcher.test('not-swiper')).toBe(false);
  });

  it('supports regex flags', () => {
    const [matcher] = compileMatchers(['/^BTN/i']);
    expect(matcher.test('btn-primary')).toBe(true);
  });

  it('throws, naming the offending entry, on an invalid regex', () => {
    expect(() => compileMatchers(['/^valid-[a-z]+/'])).not.toThrow();
    expect(() => compileMatchers(['/[/'])).toThrow(/Invalid regex in prune list: "\/\[\/"/);
  });
});

describe('matchAny', () => {
  it('returns true when any matcher fires', () => {
    const matchers = compileMatchers(['a', '/^b/']);
    expect(matchAny(matchers, 'a')).toBe(true);
    expect(matchAny(matchers, 'bee')).toBe(true);
    expect(matchAny(matchers, 'c')).toBe(false);
  });

  it('records the sources of firing matchers into hits', () => {
    const matchers = compileMatchers(['/^b/', 'bat']);
    const hits = new Set<string>();
    matchAny(matchers, 'bat', hits);
    expect([...hits].sort()).toEqual(['/^b/', 'bat']);
  });
});
