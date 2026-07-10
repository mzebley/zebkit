import { z } from "zod";
import { tokenObjectSchema } from "@definitions/tokens";

export const tokenSchema = z.object({
  "auto": tokenObjectSchema,
  "0": tokenObjectSchema,
  "10": tokenObjectSchema,
  "20": tokenObjectSchema,
  "30": tokenObjectSchema,
  "40": tokenObjectSchema,
  "50": tokenObjectSchema,
  "60": tokenObjectSchema,
  "70": tokenObjectSchema,
  "80": tokenObjectSchema,
  "90": tokenObjectSchema,
  "100": tokenObjectSchema,
  "dropdown": tokenObjectSchema,
  "sticky": tokenObjectSchema,
  "fixed": tokenObjectSchema,
  "modal-backdrop": tokenObjectSchema,
  "modal": tokenObjectSchema,
  "popover": tokenObjectSchema,
  "tooltip": tokenObjectSchema,
});
