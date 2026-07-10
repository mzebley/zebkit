import type { VariantConfig } from '@definitions/token-variants';
import type { SelectTokens } from '../tokens/tokens';

export type SelectVariantTokenKey = keyof SelectTokens;

/**
 * Select-specific variant config. Strongly typed to select token keys.
 */
export type SelectVariantConfig = VariantConfig<'select', SelectVariantTokenKey>;
