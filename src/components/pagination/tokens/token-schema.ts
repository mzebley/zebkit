import { z } from "zod";
import { tokenObjectSchema } from "@definitions/tokens";
import type { PaginationTokenKey } from "./tokens";

/**
 * Strict schema for pagination tokens. Keep this in sync with tokens.ts so
 * compile-tokens can validate the module before writing CSS variables.
 */
export const tokenSchema = z.object({
  // Item ink
  ink: tokenObjectSchema,
  "ink-hover": tokenObjectSchema,
  "ink-active": tokenObjectSchema,
  "ink-disabled": tokenObjectSchema,
  "ink-selected": tokenObjectSchema,

  // Item canvas
  canvas: tokenObjectSchema,
  "canvas-hover": tokenObjectSchema,
  "canvas-active": tokenObjectSchema,
  "canvas-disabled": tokenObjectSchema,
  "canvas-selected": tokenObjectSchema,

  // Item border
  "border-color": tokenObjectSchema,
  "border-color-hover": tokenObjectSchema,
  "border-color-active": tokenObjectSchema,
  "border-color-disabled": tokenObjectSchema,
  "border-color-selected": tokenObjectSchema,
  "border-width": tokenObjectSchema,
  "border-style": tokenObjectSchema,
  "border-radius": tokenObjectSchema,

  // Typography
  "font-family": tokenObjectSchema,
  "font-size": tokenObjectSchema,
  "font-weight": tokenObjectSchema,
  "line-height": tokenObjectSchema,

  // Layout
  display: tokenObjectSchema,
  gap: tokenObjectSchema,
  "min-width": tokenObjectSchema,
  "min-height": tokenObjectSchema,
  "padding-inline": tokenObjectSchema,
  "padding-block": tokenObjectSchema,

  // Sub-elements
  "icon-size": tokenObjectSchema,
  "ellipsis-ink": tokenObjectSchema,
  "status-ink": tokenObjectSchema,

  // Focus
  "focus-color": tokenObjectSchema,
  "focus-width": tokenObjectSchema,
  "focus-offset": tokenObjectSchema,

  // Transitions
  "transition-property": tokenObjectSchema,
  "transition-duration": tokenObjectSchema,
  "transition-timing-function": tokenObjectSchema,

  // Interaction behavior
  cursor: tokenObjectSchema,
} satisfies Record<PaginationTokenKey, typeof tokenObjectSchema>);

export type PaginationTokenSchema = typeof tokenSchema;
