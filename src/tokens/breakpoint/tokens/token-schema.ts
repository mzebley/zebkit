import { z } from "zod";
import { dimensionValueSchema } from "@definitions/tokens";

// Breakpoints are consumed at build time (injected into the SCSS
// `$active-breakpoints` map), not emitted as CSS custom properties by default —
// `@media`/`@container` conditions cannot read `var()`. A breakpoint whose
// `value` is `null` is treated as disabled and is dropped everywhere (compiled
// media queries, config validation, and the optional CSS-var emission).
const breakpointToken = z.object({
  $value: z.union([dimensionValueSchema, z.string(), z.null()]),
  $type: z.literal("dimension"),
  $description: z.string().min(1, "$description must not be empty"),
});

export const tokenSchema = z.object({
  "tablet": breakpointToken,
  "tablet-lg": breakpointToken,
  "desktop": breakpointToken,
  "desktop-lg": breakpointToken,
  "widescreen": breakpointToken,
});
