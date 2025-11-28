import type { VariantConfig } from '@definitions/token-variants';

/**
 * Builds a lookup of variant name -> className given a component prefix and variants list.
 * Falls back to `${prefix}-${component}--${name}` when classNameOverride is absent.
 */
export function buildVariantClassMap(
  component: string,
  prefix: string,
  variants: VariantConfig[]
): Record<string, string> {
  return variants.reduce<Record<string, string>>((acc, variant) => {
    const normalized = variant.name.toLowerCase();
    const className =
      variant.classNameOverride || `${prefix}-${component}--${normalized}`;
    acc[normalized] = className;
    return acc;
  }, {});
}
