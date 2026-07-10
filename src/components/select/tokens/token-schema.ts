import { z } from 'zod';
import { tokenObjectSchema } from '@definitions/tokens';

/**
 * Strict schema for select tokens. Keep this in sync with tokens.ts so
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
  'canvas-invalid': tokenObjectSchema,

  // Selected-option text
  ink: tokenObjectSchema,
  'ink-disabled': tokenObjectSchema,
  'ink-invalid': tokenObjectSchema,

  // Field border
  'border-color': tokenObjectSchema,
  'border-color-hover': tokenObjectSchema,
  'border-color-focus': tokenObjectSchema,
  'border-color-active': tokenObjectSchema,
  'border-color-disabled': tokenObjectSchema,
  'border-color-invalid': tokenObjectSchema,
  'border-width': tokenObjectSchema,
  'border-style': tokenObjectSchema,
  'border-radius': tokenObjectSchema,

  // Selected-option typography
  'font-family': tokenObjectSchema,
  'font-size': tokenObjectSchema,
  'font-weight': tokenObjectSchema,
  'line-height': tokenObjectSchema,
  'letter-spacing': tokenObjectSchema,

  // Label
  'label-ink': tokenObjectSchema,
  'label-ink-disabled': tokenObjectSchema,
  'label-font-size': tokenObjectSchema,
  'label-font-weight': tokenObjectSchema,
  'label-gap': tokenObjectSchema,

  // Affixes
  'affix-ink': tokenObjectSchema,
  'affix-ink-disabled': tokenObjectSchema,
  'icon-size': tokenObjectSchema,

  // Indicator (drawn chevron)
  'indicator-color': tokenObjectSchema,
  'indicator-color-disabled': tokenObjectSchema,
  'indicator-size': tokenObjectSchema,
  'indicator-stroke-width': tokenObjectSchema,

  // Internal layout
  'padding-inline': tokenObjectSchema,
  'padding-block': tokenObjectSchema,
  gap: tokenObjectSchema,

  // Sizing
  width: tokenObjectSchema,
  'min-width': tokenObjectSchema,
  'max-width': tokenObjectSchema,
  'min-height': tokenObjectSchema,

  // Grouping
  'group-gap': tokenObjectSchema,
  'group-direction': tokenObjectSchema,

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

export type SelectTokenSchema = typeof tokenSchema;
