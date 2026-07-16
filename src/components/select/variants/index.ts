import type { SelectVariantConfig } from './types';
import sm from './sm';
import lg from './lg';

/**
 * Zebkit's shipped select variants: structural recipes (shapes of token
 * remapping), never aesthetic choices. Colors and scales still flow from the
 * consumer's aliases; consumers can override or replace any of these via
 * variant JSON overlays.
 */
export const selectVariants: SelectVariantConfig[] = [sm, lg];

export default selectVariants;
