// src/components/button/variants/types.ts

import type { VariantConfig } from '@definitions/token-variants';
import type { ButtonTokenKey } from '../tokens/tokens';

export type ButtonVariantTokenKey = ButtonTokenKey;

/**
 * Button-specific variant config. Strongly typed to button token keys.
 */
export type ButtonVariantConfig = VariantConfig<'button', ButtonVariantTokenKey>;
