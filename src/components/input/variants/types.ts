import type { VariantConfig } from '@definitions/token-variants';
import type { InputTokenKey } from '../tokens/tokens';

export type InputVariantTokenKey = InputTokenKey;

/**
 * Input-specific variant config. Strongly typed to input token keys.
 */
export type InputVariantConfig = VariantConfig<'input', InputVariantTokenKey>;
