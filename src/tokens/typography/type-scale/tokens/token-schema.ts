import { z } from "zod";
import { rootFontSizeStepSchema } from "@definitions/tokens";

// The fluid scale controls (viewport anchors, base sizes, ratios) are group-level
// metadata under the module's `extensions` export — build-time only, never tokens.
export const tokenSchema = z.object({
  // Named steps. `md` is the base (index 0); negative indices step down, positive up.
  "3xs": rootFontSizeStepSchema,
  "2xs": rootFontSizeStepSchema,
  xs: rootFontSizeStepSchema,
  sm: rootFontSizeStepSchema,
  md: rootFontSizeStepSchema,
  lg: rootFontSizeStepSchema,
  xl: rootFontSizeStepSchema,
  "2xl": rootFontSizeStepSchema,
  "3xl": rootFontSizeStepSchema,
  "4xl": rootFontSizeStepSchema,
  "5xl": rootFontSizeStepSchema,
});
