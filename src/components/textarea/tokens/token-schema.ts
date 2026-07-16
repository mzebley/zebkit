import { z } from 'zod';
import { tokenObjectSchema } from '@definitions/tokens';

/**
 * Strict schema for textarea tokens. Keep this in sync with tokens.ts so
 * compile-tokens can validate the module before writing CSS variables.
 */
export const tokenSchema = z.object({
  // Host layout
  display: tokenObjectSchema,

  // Field box background
  canvas: tokenObjectSchema,
  'canvas-hover': tokenObjectSchema,
  'canvas-focus': tokenObjectSchema,
  'canvas-active': tokenObjectSchema,
  'canvas-disabled': tokenObjectSchema,
  'canvas-readonly': tokenObjectSchema,
  'canvas-invalid': tokenObjectSchema,

  // Entered text
  ink: tokenObjectSchema,
  'ink-disabled': tokenObjectSchema,
  'ink-readonly': tokenObjectSchema,
  'ink-invalid': tokenObjectSchema,
  'placeholder-ink': tokenObjectSchema,
  'placeholder-ink-disabled': tokenObjectSchema,
  'caret-color': tokenObjectSchema,

  // Field border
  'border-color': tokenObjectSchema,
  'border-color-hover': tokenObjectSchema,
  'border-color-focus': tokenObjectSchema,
  'border-color-active': tokenObjectSchema,
  'border-color-disabled': tokenObjectSchema,
  'border-color-readonly': tokenObjectSchema,
  'border-color-invalid': tokenObjectSchema,
  'border-width': tokenObjectSchema,
  'border-style': tokenObjectSchema,
  'border-radius': tokenObjectSchema,

  // Entered-text typography
  'font-family': tokenObjectSchema,
  'font-size': tokenObjectSchema,
  'font-weight': tokenObjectSchema,
  'line-height': tokenObjectSchema,
  'field-line-height': tokenObjectSchema,
  'letter-spacing': tokenObjectSchema,

  // Label
  'label-ink': tokenObjectSchema,
  'label-ink-disabled': tokenObjectSchema,
  'label-font-size': tokenObjectSchema,
  'label-font-weight': tokenObjectSchema,
  'label-gap': tokenObjectSchema,

  // Internal layout
  'padding-inline': tokenObjectSchema,
  'padding-block': tokenObjectSchema,

  // Field behavior
  resize: tokenObjectSchema,

  // Sizing
  width: tokenObjectSchema,
  'min-width': tokenObjectSchema,
  'max-width': tokenObjectSchema,
  'min-block-size': tokenObjectSchema,

  // Focus ring
  'focus-color': tokenObjectSchema,
  'focus-width': tokenObjectSchema,
  'focus-offset': tokenObjectSchema,

  // Shadow / elevation
  'box-shadow': tokenObjectSchema,
  'box-shadow-hover': tokenObjectSchema,
  'box-shadow-focus': tokenObjectSchema,
  'box-shadow-active': tokenObjectSchema,
  'box-shadow-invalid': tokenObjectSchema,

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

export type TextareaTokenSchema = typeof tokenSchema;
