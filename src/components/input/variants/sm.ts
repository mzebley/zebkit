import type { InputVariantConfig } from './types';

/**
 * Small: tighter type and padding. min-height is deliberately NOT reduced —
 * the 44px tap target is an accessibility floor, not a style choice.
 */
const sm: InputVariantConfig = {
  component: 'input',
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
