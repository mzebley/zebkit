import type { LayerName } from "@definitions/layers";
import { z } from "zod";
import { tokenSchema } from "./token-schema";

/**
 * Zebkit primary accent color design tokens. 
 */
export const key = "accent-primary";
export const layer: LayerName = "theme";

export type AccentPrimaryTokenSchema = z.infer<typeof tokenSchema>;

const tokens = {
  50: {
    $value: "{color.violet-50}",
    $type: "color",
    $description: "For primary accent surfaces."
  },
    100: {
    $value: "{color.violet-100}",
    $type: "color",
    $description: "For primary accent surfaces."
  },
    200: {
    $value: "{color.violet-200}",
    $type: "color",
    $description: "For primary accent surfaces."
  },
    300: {
    $value: "{color.violet-300}",
    $type: "color",
    $description: "For primary accent surfaces."
  },
    400: {
    $value: "{color.violet-400}",
    $type: "color",
    $description: "For primary accent surfaces."
  },
    500: {
    $value: "{color.violet-500}",
    $type: "color",
    $description: "For primary accent surfaces."
  },
    600: {
    $value: "{color.violet-600}",
    $type: "color",
    $description: "For primary accent surfaces."
  },
    700: {
    $value: "{color.violet-700}",
    $type: "color",
    $description: "For primary accent surfaces."
  },
    800: {
    $value: "{color.violet-800}",
    $type: "color",
    $description: "For primary accent surfaces."
  },
    900: {
    $value: "{color.violet-900}",
    $type: "color",
    $description: "For primary accent surfaces."
  },
    950: {
    $value: "{color.violet-950}",
    $type: "color",
    $description: "For primary accent surfaces."
  },
} as const satisfies AccentPrimaryTokenSchema;

export default tokens;