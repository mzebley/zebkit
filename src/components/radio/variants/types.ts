import type { VariantConfig } from '@definitions/token-variants';
import type { RadioTokens } from '../tokens/tokens';

export type RadioVariantTokenKey = keyof RadioTokens;

/**
 * Radio-specific variant config. Strongly typed to radio token keys.
 */
export type RadioVariantConfig = VariantConfig<'radio', RadioVariantTokenKey>;
