import type { TokenInterface } from "../../../src/definitions/tokens";

export interface TokenRow {
  token: string;
  type: string;
  value: string | number;
  description: string;
}

export function buildTokenRows(tokenKey: string, tokens: TokenInterface): TokenRow[] {
  return Object.entries(tokens).map(([name, token]) => ({
    token: `${tokenKey}.${name}`,
    type: token.type,
    value: token.value,
    description: token.description,
  }));
}
