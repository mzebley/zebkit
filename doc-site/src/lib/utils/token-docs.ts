import type { CompiledToken } from '../data/compiled-tokens';

export interface TokenRow {
  token: string;
  type: string;
  value: string | number;
  description: string;
}

export type { CompiledToken };
export type CompiledTokenMap = Record<string, CompiledToken>;

/** Structured `{value, unit}` dimensions render as their canonical CSS string
 * (leading zero dropped below 1, matching the emitted form). */
export function formatTokenValue(value: CompiledToken['$value']): string | number {
  if (value !== null && typeof value === 'object') {
    return `${String(value.value).replace(/^(-?)0\./, '$1.')}${value.unit}`;
  }
  return value ?? '';
}

export function buildTokenRows(
  tokenKey: string,
  tokens: CompiledTokenMap | undefined
): TokenRow[] {
  if (!tokens) return [];

  return Object.entries(tokens)
    // The group-level $extensions member is scale metadata, not a token.
    .filter(([name]) => !name.startsWith('$'))
    .map(([name, token]) => ({
      token: `${tokenKey}.${name}`,
      type: token.$type,
      value:
        token.$value != null
          ? formatTokenValue(token.$value)
          : token.$extensions?.['dev.zebkit']?.scale?.index ?? '',
      description: token.$description,
    }));
}
