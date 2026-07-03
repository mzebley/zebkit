/**
 * Safelist/blocklist entry compilation, shared by the prune engine and config
 * validation. An entry wrapped in `/…/` compiles to a RegExp; anything else is an
 * exact string match. Invalid regex is a hard error naming the offending entry so
 * a typo never silently degrades to "matches nothing".
 */

export interface CompiledMatcher {
  /** The original entry string, surfaced in the report's `safelist.hits`. */
  source: string;
  test: (value: string) => boolean;
}

const REGEX_ENTRY = /^\/(.*)\/([a-z]*)$/;

/** Compiles raw safelist/blocklist entries. Throws on an invalid `/regex/` entry. */
export function compileMatchers(entries: readonly string[]): CompiledMatcher[] {
  return entries.map((entry) => {
    const match = REGEX_ENTRY.exec(entry);
    if (!match) {
      return { source: entry, test: (value: string) => value === entry };
    }
    const [, pattern, flags] = match;
    try {
      const regex = new RegExp(pattern, flags);
      return { source: entry, test: (value: string) => regex.test(value) };
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new Error(`Invalid regex in prune list: "${entry}" (${detail}).`);
    }
  });
}

/**
 * Returns true if any matcher accepts `value`. When `hits` is provided, the
 * `source` of every matcher that fires is recorded (report `safelist.hits`).
 */
export function matchAny(
  matchers: readonly CompiledMatcher[],
  value: string,
  hits?: Set<string>
): boolean {
  let matched = false;
  for (const matcher of matchers) {
    if (matcher.test(value)) {
      matched = true;
      if (!hits) return true;
      hits.add(matcher.source);
    }
  }
  return matched;
}
