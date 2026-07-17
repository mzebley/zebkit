import type { PaginationVariantConfig } from "./types";
import sm from "./sm";
import lg from "./lg";

/**
 * Zebkit's shipped pagination variants: structural recipes (shapes of token
 * remapping), never aesthetic choices. Colors and scales still flow from the
 * consumer's aliases; consumers can override or replace any of these via
 * variant JSON overlays.
 */
export const paginationVariants: PaginationVariantConfig[] = [sm, lg];

export const paginationVariantsByName: Record<string, PaginationVariantConfig> =
  paginationVariants.reduce((acc, variant) => {
    acc[variant.name] = variant;
    return acc;
  }, {} as Record<string, PaginationVariantConfig>);
