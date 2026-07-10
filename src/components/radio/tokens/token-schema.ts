import { z } from 'zod';
import { tokenObjectSchema } from '@definitions/tokens';

/**
 * Strict schema for radio tokens. Keep this in sync with tokens.ts so
 * compile-tokens can validate the module before writing CSS variables.
 */
export const tokenSchema = z.object({
  // Host layout
  display: tokenObjectSchema,

  // Control geometry
  'control-size': tokenObjectSchema,
  'control-width': tokenObjectSchema,
  'control-height': tokenObjectSchema,

  // Control background
  canvas: tokenObjectSchema,
  'canvas-hover': tokenObjectSchema,
  'canvas-active': tokenObjectSchema,
  'canvas-checked': tokenObjectSchema,
  'canvas-disabled': tokenObjectSchema,

  // Control border
  'border-color': tokenObjectSchema,
  'border-color-hover': tokenObjectSchema,
  'border-color-active': tokenObjectSchema,
  'border-color-checked': tokenObjectSchema,
  'border-color-disabled': tokenObjectSchema,
  'border-width': tokenObjectSchema,
  'border-style': tokenObjectSchema,
  'border-radius': tokenObjectSchema,

  // Indicator
  'indicator-color': tokenObjectSchema,
  'indicator-color-disabled': tokenObjectSchema,
  'indicator-size': tokenObjectSchema,
  'indicator-radius': tokenObjectSchema,

  // Label
  ink: tokenObjectSchema,
  'ink-disabled': tokenObjectSchema,
  'font-family': tokenObjectSchema,
  'font-size': tokenObjectSchema,
  'font-weight': tokenObjectSchema,
  'line-height': tokenObjectSchema,
  'letter-spacing': tokenObjectSchema,

  // Layout
  gap: tokenObjectSchema,
  'align-items': tokenObjectSchema,
  'group-gap': tokenObjectSchema,
  'group-direction': tokenObjectSchema,

  // Focus ring
  'focus-color': tokenObjectSchema,
  'focus-width': tokenObjectSchema,
  'focus-offset': tokenObjectSchema,

  // Shadow
  'box-shadow': tokenObjectSchema,
  'box-shadow-hover': tokenObjectSchema,
  'box-shadow-active': tokenObjectSchema,
  'box-shadow-checked': tokenObjectSchema,
  'box-shadow-focus': tokenObjectSchema,

  // Interaction behavior
  cursor: tokenObjectSchema,
  'cursor-disabled': tokenObjectSchema,

  // Transitions
  'transition-duration': tokenObjectSchema,
  'transition-timing-function': tokenObjectSchema,
  'transition-property': tokenObjectSchema,
  'transition-delay': tokenObjectSchema,

  // Other
  opacity: tokenObjectSchema,
  'opacity-disabled': tokenObjectSchema,
});

export type RadioTokenSchema = typeof tokenSchema;
