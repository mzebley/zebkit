import { z } from "zod";
import {tokenObjectSchema } from "@definitions/tokens";


export const tokenSchema = z.object({
  1: tokenObjectSchema,
  2: tokenObjectSchema,
  3: tokenObjectSchema,
  4: tokenObjectSchema,
  5: tokenObjectSchema,
});
