import { z } from "zod";
import { tokenObjectSchema } from "@definitions/tokens";

export const tokenSchema = z.object({
  "width-xs": tokenObjectSchema,
  "width-sm": tokenObjectSchema,
  "width-md": tokenObjectSchema,
  "width-lg": tokenObjectSchema,
  "width-xl": tokenObjectSchema,
  "radius-xs": tokenObjectSchema,
  "radius-sm": tokenObjectSchema,
  "radius-md": tokenObjectSchema,
  "radius-lg": tokenObjectSchema,
  "radius-xl": tokenObjectSchema,
  "style": tokenObjectSchema,
});
