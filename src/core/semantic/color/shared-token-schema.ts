// src/core/color-family/tokens/color-family-schema.ts
import { z } from 'zod';
import { tokenObjectSchema } from '@definitions/tokens';

/**
 * Generic schema for a semantic color family:
 * - roles: canvas, ink, border
 * - prominence: subtle, muted, base, emphasis
 * - variants: base, inverse, inverse-subtle, inverse-muted, inverse-emphasis
 *
 * This schema is reused for:
 * - action
 * - app
 * - caution
 * - critical
 * - info
 * - positive
 */

const slots = [
  "canvas",
  "canvas-subtle",
  "canvas-muted",
  "canvas-emphasis",
  "canvas-inverse",
  "canvas-inverse-subtle",
  "canvas-inverse-muted",
  "canvas-inverse-emphasis",
  "ink",
  "ink-subtle",
  "ink-muted",
  "ink-emphasis",
  "ink-inverse",
  "ink-inverse-subtle",
  "ink-inverse-muted",
  "ink-inverse-emphasis",
  "border",
  "border-subtle",
  "border-muted",
  "border-emphasis",
  "border-inverse",
  "border-inverse-subtle",
  "border-inverse-muted",
  "border-inverse-emphasis",
] as const;

type ColorSlot = (typeof slots)[number];
type ColorFamilyShape = {
  [K in `${ColorSlot}`]: typeof tokenObjectSchema;
};

export const buildColorFamilySchema = () => {
  const shape = {} as ColorFamilyShape;

  for (const slot of slots) {
    shape[`${slot}` as `${ColorSlot}`] = tokenObjectSchema;
  }

  return z.object(shape);
};
