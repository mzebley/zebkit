import defaultTokens from './generated/default-tokens.json';

export type DimensionValue = { value: number; unit: 'px' | 'rem' };

export type CompiledToken = {
  $type: string;
  $description: string;
  $value?: string | number | DimensionValue;
  $extensions?: {
    'dev.zebkit'?: {
      a11y?: boolean | string;
      font?: Record<string, unknown>;
      scale?: { index?: number };
    };
  };
};

export type CompiledTokenRegistry = Record<string, Record<string, CompiledToken>>;

export const compiledTokens = defaultTokens as CompiledTokenRegistry;
