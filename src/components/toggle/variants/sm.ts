import type { ToggleVariantConfig } from './types';

/**
 * Small: tighter track and type. The thumb and pill radius derive from
 * track-height, so resizing the track is the whole recipe. The tap target
 * stays generous because the native input stretches across the whole label.
 */
const sm: ToggleVariantConfig = {
  component: 'toggle',
  name: 'sm',
  axis: 'size',
  description: 'Smaller track and label type; thumb follows the track.',
  overrides: {
    'track-width': '{spacing.lg}',
    'track-height': '{spacing.md}',
    'font-size': '{font-size.sm}',
  },
};

export default sm;
