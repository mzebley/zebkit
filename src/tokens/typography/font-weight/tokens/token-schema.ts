import { z } from "zod";
import {tokenObjectSchema } from "@definitions/tokens";


export const tokenSchema = z.object({
  'thin': tokenObjectSchema,
  'extralight': tokenObjectSchema,
  'light': tokenObjectSchema,
  'normal': tokenObjectSchema,
  'medium': tokenObjectSchema,
  'semibold': tokenObjectSchema,
  'bold': tokenObjectSchema,
  'extrabold': tokenObjectSchema,
  'black': tokenObjectSchema,
});
