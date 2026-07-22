import { z } from "zod";
import { fontSizeStepSchema } from "@definitions/tokens";

// The fluid scale controls (viewport anchors, base sizes, ratios) are group-level
// metadata under the module's `extensions` export — build-time only, never tokens.
export const tokenSchema = z.object({
  // Named steps. `md` is the base (index 0); negative indices step down, positive up.
  "3xs": fontSizeStepSchema,
  "2xs": fontSizeStepSchema,
  xs: fontSizeStepSchema,
  sm: fontSizeStepSchema,
  md: fontSizeStepSchema,
  lg: fontSizeStepSchema,
  xl: fontSizeStepSchema,
  "2xl": fontSizeStepSchema,
  "3xl": fontSizeStepSchema,
  "4xl": fontSizeStepSchema,
  "5xl": fontSizeStepSchema,
});
