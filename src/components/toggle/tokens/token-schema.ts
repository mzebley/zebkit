import { z } from 'zod';
import { tokenObjectSchema } from '@definitions/tokens';
import type { ToggleTokenKey } from './tokens';

/**
 * Strict schema for toggle tokens. Keep this in sync with tokens.ts so
 * compile-tokens can validate the module before writing CSS variables.
 */
export const tokenSchema = z.object({
  // Host layout
  display: tokenObjectSchema,

  // Track geometry
  'track-width': tokenObjectSchema,
  'track-height': tokenObjectSchema,

  // Track background
  canvas: tokenObjectSchema,
  'canvas-hover': tokenObjectSchema,
  'canvas-active': tokenObjectSchema,
  'canvas-checked': tokenObjectSchema,
  'canvas-disabled': tokenObjectSchema,

  // Track border
  'border-color': tokenObjectSchema,
  'border-color-hover': tokenObjectSchema,
  'border-color-active': tokenObjectSchema,
  'border-color-checked': tokenObjectSchema,
  'border-color-disabled': tokenObjectSchema,
  'border-width': tokenObjectSchema,
  'border-style': tokenObjectSchema,
  'border-radius': tokenObjectSchema,

  // Track shadow
  'box-shadow': tokenObjectSchema,
  'box-shadow-hover': tokenObjectSchema,
  'box-shadow-active': tokenObjectSchema,
  'box-shadow-checked': tokenObjectSchema,
  'box-shadow-focus': tokenObjectSchema,

  // Thumb
  'thumb-size': tokenObjectSchema,
  'thumb-inset': tokenObjectSchema,
  'thumb-canvas': tokenObjectSchema,
  'thumb-canvas-hover': tokenObjectSchema,
  'thumb-canvas-checked': tokenObjectSchema,
  'thumb-canvas-disabled': tokenObjectSchema,
  'thumb-border-color': tokenObjectSchema,
  'thumb-border-color-checked': tokenObjectSchema,
  'thumb-border-width': tokenObjectSchema,
  'thumb-border-style': tokenObjectSchema,
  'thumb-radius': tokenObjectSchema,

  // Thumb physics
  'thumb-shadow': tokenObjectSchema,
  'thumb-shadow-hover': tokenObjectSchema,
  'thumb-shadow-active': tokenObjectSchema,
  'thumb-shadow-checked': tokenObjectSchema,
  'thumb-transform': tokenObjectSchema,
  'thumb-transform-hover': tokenObjectSchema,
  'thumb-transform-active': tokenObjectSchema,
  'thumb-transform-checked': tokenObjectSchema,

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
} satisfies Record<ToggleTokenKey, typeof tokenObjectSchema>);

export type ToggleTokenSchema = typeof tokenSchema;
