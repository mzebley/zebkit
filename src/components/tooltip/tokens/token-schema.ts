import { z } from 'zod';
import { tokenObjectSchema } from '@definitions/tokens';
import type { TooltipTokenKey } from './tokens';

/**
 * Strict schema for tooltip tokens. Keep this in sync with tokens.ts so
 * compile-tokens can validate the module before writing CSS variables.
 */
export const tokenSchema = z.object({
  display: tokenObjectSchema,

  canvas: tokenObjectSchema,
  ink: tokenObjectSchema,
  'border-color': tokenObjectSchema,
  'border-width': tokenObjectSchema,
  'border-style': tokenObjectSchema,
  'border-radius': tokenObjectSchema,

  'font-family': tokenObjectSchema,
  'font-size': tokenObjectSchema,
  'font-weight': tokenObjectSchema,
  'line-height': tokenObjectSchema,
  'letter-spacing': tokenObjectSchema,

  'padding-inline': tokenObjectSchema,
  'padding-block': tokenObjectSchema,
  'max-width': tokenObjectSchema,
  'arrow-size': tokenObjectSchema,
  offset: tokenObjectSchema,

  'box-shadow': tokenObjectSchema,
  'z-index': tokenObjectSchema,

  'transition-duration': tokenObjectSchema,
  'transition-timing-function': tokenObjectSchema,
  'show-delay': tokenObjectSchema,
  'hide-grace': tokenObjectSchema,

  opacity: tokenObjectSchema,
} satisfies Record<TooltipTokenKey, typeof tokenObjectSchema>);

export type TooltipTokenSchema = typeof tokenSchema;
