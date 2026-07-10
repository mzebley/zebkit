import type { VariantConfig } from '@definitions/token-variants';
import type { CheckboxTokens } from '../tokens/tokens';

export type CheckboxVariantTokenKey = keyof CheckboxTokens;

/**
 * Checkbox-specific variant config. Strongly typed to checkbox token keys.
 */
export type CheckboxVariantConfig = VariantConfig<
  'checkbox',
  CheckboxVariantTokenKey
>;
