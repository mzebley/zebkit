import type { VariantConfig } from '@definitions/token-variants';
import type { TextareaTokens } from '../tokens/tokens';

export type TextareaVariantTokenKey = keyof TextareaTokens;

/**
 * Textarea-specific variant config. Strongly typed to textarea token keys.
 */
export type TextareaVariantConfig = VariantConfig<'textarea', TextareaVariantTokenKey>;
