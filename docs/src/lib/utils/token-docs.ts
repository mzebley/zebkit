import type { CompiledToken } from '../data/compiled-tokens';

export interface TokenRow {
  token: string;
  type: string;
  value: string | number;
  description: string;
}

export type { CompiledToken };
export type CompiledTokenMap = Record<string, CompiledToken>;

export function buildTokenRows(
  tokenKey: string,
  tokens: CompiledTokenMap | undefined
): TokenRow[] {
  if (!tokens) return [];

  return Object.entries(tokens).map(([name, token]) => ({
    token: `${tokenKey}.${name}`,
    type: token.type,
    value: token.value ?? token.index ?? '',
    description: token.description,
  }));
}
