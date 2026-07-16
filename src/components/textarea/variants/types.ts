import type { VariantConfig } from '@definitions/token-variants';
import type { TextareaTokenKey } from '../tokens/tokens';

export type TextareaVariantTokenKey = TextareaTokenKey;

/**
 * Textarea-specific variant config. Strongly typed to textarea token keys.
 */
export type TextareaVariantConfig = VariantConfig<'textarea', TextareaVariantTokenKey>;
