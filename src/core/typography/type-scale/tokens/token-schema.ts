import { z } from "zod";
import { settingTokenSchema, rootFontSizeStepSchema } from "@definitions/tokens";

export const tokenSchema = z.object({
  // Fluid scale controls (build-time only — never emitted as CSS vars).
  // The only literals in the type system; the named steps derive from these.
  "min-viewport": settingTokenSchema,
  "max-viewport": settingTokenSchema,
  "min-base": settingTokenSchema,
  "max-base": settingTokenSchema,
  "min-ratio": settingTokenSchema,
  "max-ratio": settingTokenSchema,
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
