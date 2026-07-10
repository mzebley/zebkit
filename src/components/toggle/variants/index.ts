import type { ToggleVariantConfig } from './types';
import sm from './sm';
import lg from './lg';

/**
 * Zebkit's shipped toggle variants: structural recipes (shapes of token
 * remapping), never aesthetic choices. Colors and scales still flow from the
 * consumer's aliases; consumers can override or replace any of these via
 * variant JSON overlays.
 */
export const toggleVariants: ToggleVariantConfig[] = [sm, lg];

export default toggleVariants;
