import { z } from "zod";
import { tokenObjectSchema } from "@definitions/tokens";
import {
  PALETTE_FAMILIES,
  PALETTE_GLOBALS,
  PALETTE_RAMP,
  paletteStepName,
} from "./palette-definition";

/**
 * Exact-shape schema for the primitive palette module: one entry per
 * family × ramp step plus each global — nothing more, nothing less.
 */
const shape: Record<string, typeof tokenObjectSchema> = {};

for (const family of PALETTE_FAMILIES) {
  for (const { step } of PALETTE_RAMP) {
    shape[paletteStepName(family, step)] = tokenObjectSchema;
  }
}
for (const global of PALETTE_GLOBALS) {
  shape[global.name] = tokenObjectSchema;
}

export const tokenSchema = z.object(shape).strict();
export type PaletteTokenSchema = typeof tokenSchema;
