import type { ToggleVariantConfig } from './types';

/**
 * Large: bigger track and label type for touch-first UIs. The thumb and pill
 * radius derive from track-height, so resizing the track is the whole recipe.
 */
const lg: ToggleVariantConfig = {
  component: 'toggle',
  name: 'lg',
  axis: 'size',
  description: 'Larger track and label type; thumb follows the track.',
  overrides: {
    'track-width': '{spacing.xl}',
    'track-height': '{spacing.lg}',
    'font-size': '{font-size.lg}',
  },
};

export default lg;
