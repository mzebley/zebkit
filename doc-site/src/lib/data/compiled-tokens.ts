import defaultTokens from './generated/default-tokens.json';

export type CompiledToken = {
  type: string;
  description: string;
  value?: string | number;
  index?: number;
  a11y?: boolean | string;
  variable?: boolean;
  weights?: string;
};

export type CompiledTokenRegistry = Record<string, Record<string, CompiledToken>>;

export const compiledTokens = defaultTokens as CompiledTokenRegistry;
