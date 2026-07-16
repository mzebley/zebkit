import type { ButtonVariantConfig } from './types';

/**
 * Small: tighter type and padding. min-height is deliberately NOT reduced —
 * the 44px tap target is an accessibility floor, not a style choice.
 */
const sm: ButtonVariantConfig = {
  component: 'button',
  name: 'sm',
  axis: 'size',
  description: 'Smaller type and padding; keeps the 44px minimum tap target.',
  overrides: {
    'font-size': '{font-size.sm}',
    'padding-inline': '{spacing.xs}',
    'padding-block': '{spacing.2xs}',
    'icon-size': '1rem',
  },
};

export default sm;
