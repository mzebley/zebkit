import type { ButtonVariantConfig } from './types';

/**
 * Large: bigger type, roomier padding.
 */
const lg: ButtonVariantConfig = {
  component: 'button',
  name: 'lg',
  axis: 'size',
  description: 'Larger type and padding.',
  overrides: {
    'font-size': '{font-size.lg}',
    'padding-inline': '{spacing.lg}',
    'padding-block': '{spacing.sm}',
    'icon-size': '1.5rem',
  },
};

export default lg;
