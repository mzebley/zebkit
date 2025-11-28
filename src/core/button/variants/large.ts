import type { ButtonVariantConfig } from './types';

/**
 * Large sizing variant that leans on the size-specific token entries.
 */
const large: ButtonVariantConfig = {
  component: 'button',
  name: 'large',
  overrides: {
    'font-size': '{button.font-size}',
    'line-height': '{button.line-height}',
    'padding-inline': '{button.padding-inline}',
    'padding-block': '{button.padding-block}',
    'icon-size': '{button.icon-size}',
    'border-radius': '{button.border-radius}',
    'border-width': '{button.border-width}',
  },
};

export default large;
