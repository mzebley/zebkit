import type { LayerName } from "@definitions/layers";
import { z } from "zod";
import { tokenSchema } from "./token-schema";

/**
 * Zebkit neutral color design tokens. 
 */
export const key = "neutral";
export const layer: LayerName = "theme";

export type NeutralTokenSchema = z.infer<typeof tokenSchema>;

const tokens = {
  50: {
    value: "{color.stone-50}",
    type: "color",
    description: "For neutral surfaces."
  },
    100: {
    value: "{color.stone-100}",
    type: "color",
    description: "For neutral surfaces."
  },
    200: {
    value: "{color.stone-200}",
    type: "color",
    description: "For neutral surfaces."
  },
    300: {
    value: "{color.stone-300}",
    type: "color",
    description: "For neutral surfaces."
  },
    400: {
    value: "{color.stone-400}",
    type: "color",
    description: "For neutral surfaces."
  },
    500: {
    value: "{color.stone-500}",
    type: "color",
    description: "For neutral surfaces."
  },
    600: {
    value: "{color.stone-600}",
    type: "color",
    description: "For neutral surfaces."
  },
    700: {
    value: "{color.stone-700}",
    type: "color",
    description: "For neutral surfaces."
  },
    800: {
    value: "{color.stone-800}",
    type: "color",
    description: "For neutral surfaces."
  },
    900: {
    value: "{color.stone-900}",
    type: "color",
    description: "For neutral surfaces."
  },
    950: {
    value: "{color.stone-950}",
    type: "color",
    description: "For neutral surfaces."
  },
} as const satisfies NeutralTokenSchema;

export default tokens;