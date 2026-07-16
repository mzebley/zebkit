import type { VariantConfig } from '@definitions/token-variants';
import type { SelectTokenKey } from '../tokens/tokens';

export type SelectVariantTokenKey = SelectTokenKey;

/**
 * Select-specific variant config. Strongly typed to select token keys.
 */
export type SelectVariantConfig = VariantConfig<'select', SelectVariantTokenKey>;
