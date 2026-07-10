import type { VariantConfig } from '@definitions/token-variants';
import type { ToggleTokens } from '../tokens/tokens';

export type ToggleVariantTokenKey = keyof ToggleTokens;

/**
 * Toggle-specific variant config. Strongly typed to toggle token keys.
 */
export type ToggleVariantConfig = VariantConfig<'toggle', ToggleVariantTokenKey>;
