import type { CheckboxVariantConfig } from './types';

/**
 * Small: tighter control and type. The tap target stays generous because the
 * native input stretches across the whole label, not just the control.
 */
const sm: CheckboxVariantConfig = {
  component: 'checkbox',
  name: 'sm',
  axis: 'size',
  description: 'Smaller control and label type.',
  overrides: {
    'control-size': '{spacing.md}',
    'font-size': '{font-size.sm}',
  },
};

export default sm;
