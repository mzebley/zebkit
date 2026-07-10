import { z } from "zod";
import { tokenObjectSchema } from "@definitions/tokens";

export const tokenSchema = z.object({
  "none": tokenObjectSchema,
  "xs": tokenObjectSchema,
  "sm": tokenObjectSchema,
  "md": tokenObjectSchema,
  "lg": tokenObjectSchema,
  "xl": tokenObjectSchema,
  "2xl": tokenObjectSchema,
  "inner": tokenObjectSchema,
  "inner-sm": tokenObjectSchema,
  "inner-lg": tokenObjectSchema,
});
