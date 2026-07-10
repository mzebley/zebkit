import type { ButtonVariantConfig } from './types';

/**
 * Subtle: a low-emphasis filled button on the muted action canvas — quieter
 * than the default, more present than ghost.
 */
const subtle: ButtonVariantConfig = {
  component: 'button',
  name: 'subtle',
  axis: 'style',
  description:
    'Low-emphasis fill on the subtle action canvas; no border.',
  overrides: {
    canvas: '{action.canvas-subtle}',
    'canvas-hover': '{action.canvas-muted}',
    'canvas-active': '{action.canvas-muted}',
    ink: '{action.ink}',
    'ink-hover': '{action.ink-emphasis}',
    'ink-active': '{action.ink-emphasis}',
    'border-color': 'transparent',
    'border-color-hover': 'transparent',
    'border-color-active': 'transparent',
  },
};

export default subtle;
