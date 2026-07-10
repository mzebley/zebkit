import { z } from "zod";
import { tokenObjectSchema } from "@definitions/tokens";

export const tokenSchema = z.object({
  "0": tokenObjectSchema,
  "5": tokenObjectSchema,
  "10": tokenObjectSchema,
  "15": tokenObjectSchema,
  "20": tokenObjectSchema,
  "25": tokenObjectSchema,
  "30": tokenObjectSchema,
  "40": tokenObjectSchema,
  "50": tokenObjectSchema,
  "60": tokenObjectSchema,
  "70": tokenObjectSchema,
  "75": tokenObjectSchema,
  "80": tokenObjectSchema,
  "85": tokenObjectSchema,
  "90": tokenObjectSchema,
  "95": tokenObjectSchema,
  "100": tokenObjectSchema,
});
