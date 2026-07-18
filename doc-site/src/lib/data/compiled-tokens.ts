import defaultTokens from './generated/default-tokens.json';

export type CompiledToken = {
  $type: string;
  $description: string;
  $value?: string | number;
  index?: number;
  $extensions?: {
    'dev.zebkit'?: {
      a11y?: boolean | string;
      font?: Record<string, unknown>;
    };
  };
};

export type CompiledTokenRegistry = Record<string, Record<string, CompiledToken>>;

export const compiledTokens = defaultTokens as CompiledTokenRegistry;
