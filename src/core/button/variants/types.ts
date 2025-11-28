// src/core/button/variants/types.ts

import type { VariantConfig } from '@definitions/token-variants';
import type { ButtonTokens } from '../tokens/tokens';

export type ButtonVariantTokenKey = keyof ButtonTokens;

/**
 * Button-specific variant config. Strongly typed to button token keys.
 */
export type ButtonVariantConfig = VariantConfig<'button', ButtonVariantTokenKey>;