import type { TextareaVariantConfig } from './types';

/**
 * Small: tighter type and padding. min-block-size is deliberately NOT reduced —
 * the 44px tap target is an accessibility floor, not a style choice.
 */
const sm: TextareaVariantConfig = {
  component: 'textarea',
  name: 'sm',
  axis: 'size',
  description: 'Smaller type and padding; keeps the 44px minimum tap target.',
  overrides: {
    'font-size': '{font-size.sm}',
    'label-font-size': '{font-size.xs}',
    'padding-inline': '{spacing.xs}',
  },
};

export default sm;
