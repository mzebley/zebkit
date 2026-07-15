import type { LayerName } from "@definitions/layers";
import { z } from "zod";
import { tokenSchema } from "./token-schema";

export const key = "lede";
export const layer: LayerName = "theme";
export type LedeTokens = z.infer<typeof tokenSchema>;

const tokens = {
  "font-family": {
    value: `{font-family.body}`,
    type: "fontFamily",
    description:
      "Font family for introductory lede text with .lede applied directly or as a child of a .prose container.",
  },
  "font-size": {
    value: `{font-size.lg}`,
    type: "fontSize",
    description:
      "Font size for introductory lede text with .lede applied directly or as a child of a .prose container.",
  },
  "font-weight": {
    value: `{font-weight.normal}`,
    type: "fontWeight",
    description:
      "Font weight for introductory lede text with .lede applied directly or as a child of a .prose container.",
  },
  "line-height": {
    value: `{line-height.3}`,
    type: "lineHeight",
    description:
      "Line height for introductory lede text with .lede applied directly or as a child of a .prose container.",
  },
  "letter-spacing": {
    value: `{letter-spacing.normal}`,
    type: "letterSpacing",
    description:
      "Tracking for introductory lede text with .lede applied directly or as a child of a .prose container.",
  },
  measure: {
    value: `{text-measure.3}`,
    type: "sizing",
    description:
      "Maximum width for introductory lede text with .lede applied directly or as a child of a .prose container.",
  },
  "spacing-before": {
    value: `{spacing.0}`,
    type: "spacing",
    description:
      "Block spacing before introductory lede text when it appears in a .prose flow.",
  },
  "spacing-after": {
    value: `{spacing.105}`,
    type: "spacing",
    description:
      "Block spacing after introductory lede text when it appears in a .prose flow.",
  },
  color: {
    value: `{app.ink-muted}`,
    type: "color",
    description:
      "Text color for introductory lede text with .lede applied directly or as a child of a .prose container.",
  },
  "font-style": {
    value: `none`,
    type: "fontStyle",
    description:
      "Font style for introductory lede text with .lede applied directly or as a child of a .prose container.",
  },
  "text-transform": {
    value: `none`,
    type: "textTransform",
    description:
      "Text transform for introductory lede text with .lede applied directly or as a child of a .prose container.",
  },
} as const satisfies LedeTokens;

export default tokens;
