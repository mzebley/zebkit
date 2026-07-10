import type { CheckboxVariantConfig } from './types';

/**
 * Large: bigger control and label type for dense-pointer-hostile contexts
 * (touch-first UIs, kiosk screens).
 */
const lg: CheckboxVariantConfig = {
  component: 'checkbox',
  name: 'lg',
  axis: 'size',
  description: 'Larger control and label type.',
  overrides: {
    'control-size': '{spacing.lg}',
    'font-size': '{font-size.lg}',
  },
};

export default lg;
