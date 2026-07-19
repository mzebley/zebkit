import defaultTokens from './generated/default-tokens.json';

export type DimensionValue = { value: number; unit: 'px' | 'rem' };
export type DurationValue = { value: number; unit: 'ms' | 's' };
export type CubicBezierValue = [number, number, number, number];
export type ColorValue = {
  colorSpace: string;
  components: [number, number, number];
  alpha?: number;
  hex?: string;
};
export type ShadowValue = {
  color: ColorValue;
  offsetX: DimensionValue;
  offsetY: DimensionValue;
  blur: DimensionValue;
  spread: DimensionValue;
  inset?: boolean;
};

export type CompiledToken = {
  $type: string;
  $description: string;
  $value?:
    | string
    | number
    | DimensionValue
    | DurationValue
    | CubicBezierValue
    | ColorValue
    | ShadowValue
    | ShadowValue[];
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
