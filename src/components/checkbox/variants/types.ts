import type { VariantConfig } from '@definitions/token-variants';
import type { CheckboxTokenKey } from '../tokens/tokens';

export type CheckboxVariantTokenKey = CheckboxTokenKey;

/**
 * Checkbox-specific variant config. Strongly typed to checkbox token keys.
 */
export type CheckboxVariantConfig = VariantConfig<
  'checkbox',
  CheckboxVariantTokenKey
>;
