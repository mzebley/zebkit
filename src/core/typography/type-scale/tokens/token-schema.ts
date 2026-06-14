import { z } from "zod";
import { tokenObjectSchema } from "@definitions/tokens";

export const tokenSchema = z.object({
  "viewport-font-size-modifier": tokenObjectSchema,
  "max-font-size-modifer": tokenObjectSchema,
  "3xs": tokenObjectSchema,
  "2xs": tokenObjectSchema,
  xs: tokenObjectSchema,
  sm: tokenObjectSchema,
  md: tokenObjectSchema,
  lg: tokenObjectSchema,
  xl: tokenObjectSchema,
  "2xl": tokenObjectSchema,
  "3xl": tokenObjectSchema,
  "4xl": tokenObjectSchema,
  "5xl": tokenObjectSchema,
});
