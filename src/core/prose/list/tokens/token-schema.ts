import { z } from "zod";
import { tokenObjectSchema } from "@definitions/tokens";

export const tokenSchema = z.object({
  "font-family": tokenObjectSchema,
  "font-size": tokenObjectSchema,
  "font-weight": tokenObjectSchema,
  "line-height": tokenObjectSchema,
  "letter-spacing": tokenObjectSchema,
  "measure": tokenObjectSchema,
  "spacing-before": tokenObjectSchema,
  "spacing-after": tokenObjectSchema,
  "padding-block-start": tokenObjectSchema,
  "padding-block-end": tokenObjectSchema,
  "color": tokenObjectSchema,
  "font-style": tokenObjectSchema,
  "text-transform": tokenObjectSchema,
});
