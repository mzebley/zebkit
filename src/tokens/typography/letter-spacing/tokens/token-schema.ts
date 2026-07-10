import { z } from "zod";
import {tokenObjectSchema } from "@definitions/tokens";


export const tokenSchema = z.object({
  tighter: tokenObjectSchema,
  tight: tokenObjectSchema,
  normal: tokenObjectSchema,
  wide: tokenObjectSchema,
  wider: tokenObjectSchema,
});
