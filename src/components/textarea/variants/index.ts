import type { TextareaVariantConfig } from './types';
import sm from './sm';
import lg from './lg';

/**
 * Zebkit's shipped textarea variants: structural recipes (shapes of token
 * remapping), never aesthetic choices. Colors and scales still flow from the
 * consumer's aliases; consumers can override or replace any of these via
 * variant JSON overlays.
 */
export const textareaVariants: TextareaVariantConfig[] = [sm, lg];

export default textareaVariants;
