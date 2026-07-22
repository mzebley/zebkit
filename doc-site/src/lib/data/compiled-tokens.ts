import defaultTokens from './generated/default-tokens.json';

export type DimensionValue = { value: number; unit: 'px' | 'rem' };
export type DurationValue = { value: number; unit: 'ms' | 's' };
export type CubicBezierValue = [number, number, number, number];
export type ColorValue = {
  colorSpace: string;
  components: [number | 'none', number | 'none', number | 'none'];
  alpha?: number;
  hex?: string;
};
export type ShadowValue = {
  color: ColorValue | string;
  offsetX: DimensionValue | string;
  offsetY: DimensionValue | string;
  blur: DimensionValue | string;
  spread: DimensionValue | string;
  inset?: boolean;
};

export type CompiledToken = {
  $type: string;
  $description: string;
  $deprecated?: boolean | string;
  $value?:
    | string
    | number
    | boolean
    | string[]
    | DimensionValue
    | DurationValue
    | CubicBezierValue
    | ColorValue
    | ShadowValue
    | Array<ShadowValue | string>;
  /** Canonical source-side serialization for docs display and search. */
  $displayValue: string;
  /** CSS properties reached directly or through token aliases. */
  $cssProperties: string[];
  $extensions?: Record<string, unknown> & {
    'dev.zebkit'?: {
      a11y?: boolean | string;
      font?: Record<string, unknown>;
      scale?: { index?: number; valueSource?: 'generated' | 'pinned' };
    };
  };
};

export type CompiledTokenRegistry = Record<string, Record<string, CompiledToken>>;

export const compiledTokens = defaultTokens as CompiledTokenRegistry;
