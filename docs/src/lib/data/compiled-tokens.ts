import defaultTokens from './generated/default-tokens.json';

export type CompiledToken = {
  value: string | number;
  type: string;
  description: string;
};

export type CompiledTokenRegistry = Record<string, Record<string, CompiledToken>>;

export const compiledTokens = defaultTokens as CompiledTokenRegistry;
