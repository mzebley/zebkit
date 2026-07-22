import { z } from "zod";
import { fontFamilyTokenObjectSchema, tokenObjectSchema } from "@definitions/tokens";

// Every font token uses the unified font-family shape (`type: "fontFamily"`, discriminated by
// `source`). Aliases are the same shape with a `{...}` reference value.
const fontValueSchema = fontFamilyTokenObjectSchema;
const cssFontValueSchema = tokenObjectSchema.refine(
  (entry) => entry.$type === 'cssFontFamily',
  'expected cssFontFamily'
);

export const tokenSchema = z.object({
  "primary": fontValueSchema,
  "alt": fontValueSchema,
  "monospace": fontValueSchema,
  "system-sans": cssFontValueSchema,
  "system-serif": cssFontValueSchema,
  "system-mono": cssFontValueSchema,
  "interface": fontValueSchema,
  "heading": fontValueSchema,
  "body": fontValueSchema,
  "code": fontValueSchema,
});
