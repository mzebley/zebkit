// src/core/color-family/tokens/color-family-schema.ts
import { z } from 'zod';
import { tokenObjectSchema } from '@definitions/tokens';

/**
 * Generic schema for a single color family:
 * - roles: canvas, ink, border
 * - intensities: base, soft, muted, strong
 * - variants: base, inverse, inverse-soft, inverse-muted, inverse-strong
 *
 * This schema is reused for:
 * - brand
 * - accent-primary
 * - accent-secondary
 */

const slots = [
  "canvas",
  "canvas-soft",
  "canvas-muted",
  "canvas-strong",
  "canvas-inverse",
  "canvas-inverse-soft",
  "canvas-inverse-muted",
  "canvas-inverse-strong",
  "ink",
  "ink-soft",
  "ink-muted",
  "ink-strong",
  "ink-inverse",
  "ink-inverse-soft",
  "ink-inverse-muted",
  "ink-inverse-strong",
  "border",
  "border-soft",
  "border-muted",
  "border-strong",
  "border-inverse",
  "border-inverse-soft",
  "border-inverse-muted",
  "border-inverse-strong",
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
