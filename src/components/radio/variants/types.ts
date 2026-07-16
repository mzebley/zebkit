import type { VariantConfig } from '@definitions/token-variants';
import type { RadioTokenKey } from '../tokens/tokens';

export type RadioVariantTokenKey = RadioTokenKey;

/**
 * Radio-specific variant config. Strongly typed to radio token keys.
 */
export type RadioVariantConfig = VariantConfig<'radio', RadioVariantTokenKey>;
