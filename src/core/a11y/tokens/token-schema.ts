import { z } from "zod";
import { tokenObjectSchema } from "@definitions/tokens";

export const tokenSchema = z.object({
  "spacing-modifier": tokenObjectSchema,
  "line-height-modifier": tokenObjectSchema,
  "letter-spacing-modifier": tokenObjectSchema,
  "fallback-font-size-modifier": tokenObjectSchema,
  "transition-duration-modifier": tokenObjectSchema
});
