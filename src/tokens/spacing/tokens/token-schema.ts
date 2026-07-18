import { z } from "zod";
import { tokenObjectSchema } from "@definitions/tokens";

// Spacing-scoped entry: a normal token entry plus an optional `growth` escape hatch that
// pins the token's max-anchor multiplier, bypassing the build-time growth curve. Optional
// and absent on every normal token (the curve handles them), so authoring stays clean. It
// is consumed at build time and never emitted as a CSS variable. Scoped here rather than on
// the shared token schema so the field doesn't leak into unrelated modules.
const spacingEntrySchema = tokenObjectSchema.extend({
  growth: z.number().positive().optional(),
});

// The `max-scale` growth ceiling is group-level metadata under the module's
// `extensions` export — build-time only, never a token.
export const tokenSchema = z.object({
  "neg-15": spacingEntrySchema,
  "neg-10": spacingEntrySchema,
  "neg-9": spacingEntrySchema,
  "neg-8": spacingEntrySchema,
  "neg-7": spacingEntrySchema,
  "neg-6": spacingEntrySchema,
  "neg-5": spacingEntrySchema,
  "neg-4": spacingEntrySchema,
  "neg-3": spacingEntrySchema,
  "neg-205": spacingEntrySchema,
  "neg-2": spacingEntrySchema,
  "neg-105": spacingEntrySchema,
  "neg-1": spacingEntrySchema,
  "neg-05": spacingEntrySchema,
  "neg-025": spacingEntrySchema,
  "neg-2px": spacingEntrySchema,
  "neg-1px": spacingEntrySchema,
  "0": spacingEntrySchema,
  "1px": spacingEntrySchema,
  "2px": spacingEntrySchema,
  "025": spacingEntrySchema,
  "05": spacingEntrySchema,
  "1": spacingEntrySchema,
  "105": spacingEntrySchema,
  "2": spacingEntrySchema,
  "205": spacingEntrySchema,
  "3": spacingEntrySchema,
  "4": spacingEntrySchema,
  "5": spacingEntrySchema,
  "6": spacingEntrySchema,
  "7": spacingEntrySchema,
  "8": spacingEntrySchema,
  "9": spacingEntrySchema,
  "10": spacingEntrySchema,
  "15": spacingEntrySchema,
  "20": spacingEntrySchema,
  "25": spacingEntrySchema,
  "30": spacingEntrySchema,
  "40": spacingEntrySchema,
  "50": spacingEntrySchema,
  "60": spacingEntrySchema,
  "70": spacingEntrySchema,
  "80": spacingEntrySchema,
  "90": spacingEntrySchema,
  "100": spacingEntrySchema,
});
