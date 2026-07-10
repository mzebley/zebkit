// src/core/color-family/tokens/color-family-schema.ts
import { z } from 'zod';
import { tokenObjectSchema } from '@definitions/tokens';

/**
 * Palette schema for a semi-semantic color family:
 * - intensity: 50-950
 *
 * This schema is reused for:
 * - brand
 * - accent-primary
 * - accent-secondary
 */

const slots = [
  50,
  100,
  200,
  300,
  400,
  500,
  600,
  700,
  800,
  900,
  950
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
