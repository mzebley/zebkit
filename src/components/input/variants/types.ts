import type { VariantConfig } from '@definitions/token-variants';
import type { InputTokens } from '../tokens/tokens';

export type InputVariantTokenKey = keyof InputTokens;

/**
 * Input-specific variant config. Strongly typed to input token keys.
 */
export type InputVariantConfig = VariantConfig<'input', InputVariantTokenKey>;
