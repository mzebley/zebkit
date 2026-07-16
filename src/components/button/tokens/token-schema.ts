import { z } from 'zod';
import { tokenObjectSchema } from '@definitions/tokens';
import type { ButtonTokenKey } from './tokens';

/**
 * Strict schema for button tokens. Keep this in sync with tokens.ts so
 * compile-tokens can validate the module before writing CSS variables.
 */
export const tokenSchema = z.object({
  // Core text & color
  ink: tokenObjectSchema,
  'ink-hover': tokenObjectSchema,
  'ink-active': tokenObjectSchema,
  'ink-disabled': tokenObjectSchema,
  'ink-loading': tokenObjectSchema,

  canvas: tokenObjectSchema,
  'canvas-hover': tokenObjectSchema,
  'canvas-active': tokenObjectSchema,
  'canvas-disabled': tokenObjectSchema,
  'canvas-loading': tokenObjectSchema,

  'border-color': tokenObjectSchema,
  'border-color-hover': tokenObjectSchema,
  'border-color-active': tokenObjectSchema,
  'border-color-disabled': tokenObjectSchema,
  'border-color-loading': tokenObjectSchema,

  // Border geometry
  'border-width': tokenObjectSchema,
  'border-style': tokenObjectSchema,
  'border-radius': tokenObjectSchema,

  // Typography
  'font-family': tokenObjectSchema,
  'font-size': tokenObjectSchema,
  'font-weight': tokenObjectSchema,
  'line-height': tokenObjectSchema,
  'letter-spacing': tokenObjectSchema,
  'text-transform': tokenObjectSchema,
  'text-decoration': tokenObjectSchema,
  'text-align': tokenObjectSchema,

  // Spacing (internal)
  'padding-inline': tokenObjectSchema,
  'padding-block': tokenObjectSchema,
  'padding-inline-start': tokenObjectSchema,
  'padding-block-start': tokenObjectSchema,
  'padding-inline-end': tokenObjectSchema,
  'padding-block-end': tokenObjectSchema,

  gap: tokenObjectSchema,
  'group-gap': tokenObjectSchema,

  // Spacing (external)
  'margin-block-start': tokenObjectSchema,
  'margin-inline-end': tokenObjectSchema,
  'margin-block-end': tokenObjectSchema,
  'margin-inline-start': tokenObjectSchema,
  'margin-inline': tokenObjectSchema,
  'margin-block': tokenObjectSchema,

  // Layout & sizing
  display: tokenObjectSchema,
  width: tokenObjectSchema,
  'min-width': tokenObjectSchema,
  'max-width': tokenObjectSchema,
  height: tokenObjectSchema,
  'min-height': tokenObjectSchema,
  'max-height': tokenObjectSchema,

  // Icon-related
  'icon-size': tokenObjectSchema,
  'icon-end-size': tokenObjectSchema,
  'icon-start-size': tokenObjectSchema,

  // Focus & interaction
  'focus-color': tokenObjectSchema,
  'focus-width': tokenObjectSchema,
  'focus-offset': tokenObjectSchema,

  // Shadow / elevation
  'box-shadow': tokenObjectSchema,
  'box-shadow-hover': tokenObjectSchema,
  'box-shadow-active': tokenObjectSchema,
  'box-shadow-focus': tokenObjectSchema,

  // Transformation
  'transform': tokenObjectSchema,
  'transform-hover': tokenObjectSchema,
  'transform-active': tokenObjectSchema,
  'transform-focus': tokenObjectSchema,

  // Interaction behavior
  cursor: tokenObjectSchema,
  'cursor-loading': tokenObjectSchema,
  'flex-direction': tokenObjectSchema,
  'justify-content': tokenObjectSchema,
  'align-items': tokenObjectSchema,

  // Transitions
  'transition-duration': tokenObjectSchema,
  'transition-timing-function': tokenObjectSchema,
  'transition-property': tokenObjectSchema,
  'transition-delay': tokenObjectSchema,

  // Other
  opacity: tokenObjectSchema,
  'opacity-loading': tokenObjectSchema
} satisfies Record<ButtonTokenKey, typeof tokenObjectSchema>);

export type ButtonTokenSchema = typeof tokenSchema;
