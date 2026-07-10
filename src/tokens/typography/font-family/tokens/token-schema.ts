import { z } from "zod";
import { fontFamilyTokenObjectSchema } from "@definitions/tokens";

// Every font token uses the unified font-family shape (`type: "fontFamily"`, discriminated by
// `source`). Aliases are the same shape with a `{...}` reference value.
const fontValueSchema = fontFamilyTokenObjectSchema;

export const tokenSchema = z.object({
  "primary": fontValueSchema,
  "alt": fontValueSchema,
  "monospace": fontValueSchema,
  "system-sans": fontValueSchema,
  "system-serif": fontValueSchema,
  "system-mono": fontValueSchema,
  "interface": fontValueSchema,
  "heading": fontValueSchema,
  "body": fontValueSchema,
  "code": fontValueSchema,
});
