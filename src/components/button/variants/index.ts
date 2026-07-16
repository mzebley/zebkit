import type { ButtonVariantConfig } from './types';
import ghost from './ghost';
import outline from './outline';
import subtle from './subtle';
import sm from './sm';
import lg from './lg';

/**
 * Zebkit's shipped button variants: structural recipes (shapes of token
 * remapping), never aesthetic choices. Colors and scales still flow from the
 * consumer's aliases; consumers can override or replace any of these via
 * variant JSON overlays.
 */
export const buttonVariants: ButtonVariantConfig[] = [
  ghost,
  outline,
  subtle,
  sm,
  lg,
];

export const buttonVariantsByName: Record<string, ButtonVariantConfig> =
  buttonVariants.reduce((acc, variant) => {
    acc[variant.name] = variant;
    return acc;
  }, {} as Record<string, ButtonVariantConfig>);
