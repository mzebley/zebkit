import { z } from "zod";
import { googleFontTokenObjectSchema, tokenObjectSchema } from "@definitions/tokens";

const fontValueSchema = z.union([tokenObjectSchema, googleFontTokenObjectSchema]);

export const tokenSchema = z.object({
  "primary": fontValueSchema,
  "alt": fontValueSchema,
  "monospace": fontValueSchema,
  "interface": fontValueSchema,
  "heading": fontValueSchema,
  "body": fontValueSchema,
  "code": fontValueSchema,
});
