import type { TextareaVariantConfig } from './types';

/**
 * Large: bigger type and padding for touch-first or high-visibility contexts.
 */
const lg: TextareaVariantConfig = {
  component: 'textarea',
  name: 'lg',
  axis: 'size',
  description: 'Larger type and padding.',
  overrides: {
    'font-size': '{font-size.lg}',
    'label-font-size': '{font-size.md}',
    'padding-inline': '{spacing.md}',
    'padding-block': '{spacing.xs}',
  },
};

export default lg;
