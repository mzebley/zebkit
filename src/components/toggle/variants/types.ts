import type { VariantConfig } from '@definitions/token-variants';
import type { ToggleTokenKey } from '../tokens/tokens';

export type ToggleVariantTokenKey = ToggleTokenKey;

/**
 * Toggle-specific variant config. Strongly typed to toggle token keys.
 */
export type ToggleVariantConfig = VariantConfig<'toggle', ToggleVariantTokenKey>;
