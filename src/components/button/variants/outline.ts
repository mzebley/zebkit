import type { ButtonVariantConfig } from './types';

/**
 * Outline: transparent canvas with a visible action border. The hover/press
 * wash matches ghost so the two read as one family.
 */
const outline: ButtonVariantConfig = {
  component: 'button',
  name: 'outline',
  axis: 'style',
  description:
    'Transparent canvas with an action-colored border; subtle wash on hover.',
  overrides: {
    canvas: 'transparent',
    'canvas-hover': '{action.canvas-subtle}',
    'canvas-active': '{action.canvas-muted}',
    'canvas-disabled': 'transparent',
    ink: '{action.ink}',
    'ink-hover': '{action.ink-emphasis}',
    'ink-active': '{action.ink-emphasis}',
    'border-color': '{action.border}',
    'border-color-hover': '{action.border-emphasis}',
    'border-color-active': '{action.border-emphasis}',
  },
};

export default outline;
