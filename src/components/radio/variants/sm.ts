import type { RadioVariantConfig } from './types';

/**
 * Small: tighter control and type. The tap target stays generous because the
 * native input stretches across the whole label, not just the control.
 */
const sm: RadioVariantConfig = {
  component: 'radio',
  name: 'sm',
  axis: 'size',
  description: 'Smaller control and label type.',
  overrides: {
    'control-width': '{spacing.md}',
    'control-height': '{spacing.md}',
    'font-size': '{font-size.sm}',
  },
};

export default sm;
