import type { SelectVariantConfig } from './types';

/**
 * Large: bigger type and padding for touch-first or high-visibility contexts.
 */
const lg: SelectVariantConfig = {
  component: 'select',
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
