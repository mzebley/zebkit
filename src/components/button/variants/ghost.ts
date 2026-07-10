import type { ButtonVariantConfig } from './types';

/**
 * Ghost: no canvas, no border — the label alone carries the affordance, with a
 * subtle action wash on hover/press. A structural recipe: every color still
 * flows from the consumer's `action` aliases.
 */
const ghost: ButtonVariantConfig = {
  component: 'button',
  name: 'ghost',
  axis: 'style',
  description:
    'Transparent canvas and border; ink takes the action role with a subtle hover wash.',
  overrides: {
    canvas: 'transparent',
    'canvas-hover': '{action.canvas-subtle}',
    'canvas-active': '{action.canvas-muted}',
    'canvas-disabled': 'transparent',
    ink: '{action.ink}',
    'ink-hover': '{action.ink-emphasis}',
    'ink-active': '{action.ink-emphasis}',
    'border-color': 'transparent',
    'border-color-hover': 'transparent',
    'border-color-active': 'transparent',
    'border-color-disabled': 'transparent',
  },
};

export default ghost;
