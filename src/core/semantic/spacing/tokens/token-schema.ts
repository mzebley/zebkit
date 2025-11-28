import { z } from "zod";
import { tokenObjectSchema } from "@definitions/tokens";

export const tokenSchema = z.object({
  "2xs": tokenObjectSchema,
  "xs": tokenObjectSchema,
  "sm": tokenObjectSchema,
  "md": tokenObjectSchema,
  "lg": tokenObjectSchema,
  "xl": tokenObjectSchema,
  "2xl": tokenObjectSchema,
  "3xl": tokenObjectSchema,
  "card": tokenObjectSchema,
  "mobile": tokenObjectSchema,
  "mobile-lg": tokenObjectSchema,
  "tablet": tokenObjectSchema,
  "tablet-lg": tokenObjectSchema,
  "desktop": tokenObjectSchema,
  "desktop-lg": tokenObjectSchema,
  "widescreen": tokenObjectSchema,
  "section": tokenObjectSchema,
  "section-margin-block": tokenObjectSchema,
  "section-margin-inline": tokenObjectSchema,
  "aside": tokenObjectSchema,
  "page-padding-block": tokenObjectSchema,
  "page-padding-inline": tokenObjectSchema,
});
