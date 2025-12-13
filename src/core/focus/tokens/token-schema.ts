import { z } from "zod";
import { tokenObjectSchema } from "@definitions/tokens";

export const tokenSchema = z.object({
  "color": tokenObjectSchema,
  "width": tokenObjectSchema,
  "offset": tokenObjectSchema
});
