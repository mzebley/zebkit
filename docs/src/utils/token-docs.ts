export interface TokenRow {
  token: string;
  type: string;
  value: string | number;
  description: string;
}

export interface CompiledToken {
  value: string | number;
  type: string;
  description: string;
}

export type CompiledTokenMap = Record<string, CompiledToken>;

export function buildTokenRows(
  tokenKey: string,
  tokens: CompiledTokenMap | undefined
): TokenRow[] {
  if (!tokens) return [];

  return Object.entries(tokens).map(([name, token]) => ({
    token: `${tokenKey}.${name}`,
    type: token.type,
    value: token.value,
    description: token.description,
  }));
}
