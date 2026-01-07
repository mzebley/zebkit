import type { LayerName } from "@definitions/layers";
import { z } from "zod";
import { tokenSchema } from "./token-schema";

export const key = "font-weight";
export const layer: LayerName = "theme";
export type FontWeightTokens = z.infer<typeof tokenSchema>;

const tokens = {
  thin: {
    value: `100`,
    type: "fontWeight",
    description: "Lightest font weight.",
    a11y: true,
  },
  extralight: {
    value: `200`,
    type: "fontWeight",
    description: "Lighter font weight.",
    a11y: true,
  },
  light: {
    value: `300`,
    type: "fontWeight",
    description: "Light font weight.",
    a11y: true,
  },
  normal: {
    value: `400`,
    type: "fontWeight",
    description: "Default font weight.",
    a11y: true,
  },
  medium: {
    value: `500`,
    type: "fontWeight",
    description: "Medium font weight.",
    a11y: true,
  },
  semibold: {
    value: `600`,
    type: "fontWeight",
    description: "Semibold font weight.",
    a11y: true,
  },
  bold: {
    value: `700`,
    type: "fontWeight",
    description: "Bold font weight.",
    a11y: true,
  },
  extrabold: {
    value: `800`,
    type: "fontWeight",
    description: "Bolder font weight.",
    a11y: true,
  },
  black: {
    value: `900`,
    type: "fontWeight",
    description: "Boldest font weight.",
    a11y: true,
  },
} as const satisfies FontWeightTokens;

export default tokens;
