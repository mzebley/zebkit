import type { LayerName } from "@definitions/layers";
import { z } from "zod";
import { tokenSchema } from "./token-schema";

export const key = "list";
export const layer: LayerName = "base";
export type ListTokens = z.infer<typeof tokenSchema>;

const tokens = {
  "font-family": {
    $value: `{font-family.heading}`,
    $type: "fontFamily",
    $description:
      "Font size for H6 elements with .prose applied directly or that are a child of a .prose container.",
  },
  "font-size": {
    $value: `{font-size.sm}`,
    $type: "cssDimension",
    $description:
      "Font size for H6 elements with .prose applied directly or that are a child of a .prose container.",
  },
  "font-weight": {
    $value: `{font-weight.semibold}`,
    $type: "fontWeight",
    $description:
      "Font weight for H6 elements with .prose applied directly or that are a child of a .prose container.",
  },
  "line-height": {
    $value: `{line-height.3}`,
    $type: "number",
    $description:
      "Line height for H6 elements with .prose applied directly or that are a child of a .prose container.",
  },
  "letter-spacing": {
    $value: `{letter-spacing.normal}`,
    $type: "dimension",
    $description:
      "Tracking for H6 elements with .prose applied directly or that are a child of a .prose container.",
  },
  measure: {
    $value: `{text-measure.3}`,
    $type: "cssDimension",
    $description:
      "Maximum width for H6 elements with .prose applied directly or that are a child of a .prose container.",
  },
  "spacing-before": {
    $value: `{spacing.2}`,
    $type: "dimension",
    $description:
      "Amount of margin inline start for H6 elements with .prose applied directly or that are a child of a .prose container.",
  },
  "spacing-after": {
    $value: `{spacing.1}`,
    $type: "dimension",
    $description:
      "Amount of margin inline end for H6 elements with .prose applied directly or that are a child of a .prose container.",
  },
  "padding-block-start": {
    $value: `{spacing.105}`,
    $type: "dimension",
    $description:
      "Amount of spacing before list items.",
  },
  "padding-block-end": {
    $value: `{spacing.0}`,
    $type: "dimension",
    $description:
      "Amount of spacing after list items.",
  },
 color: {
    $value: `{app.ink}`,
    $type: "color",
    $description:
      "Color of H6 elements with .prose applied directly or that are a child of a .prose container.",
  },
  "font-style": {
    $value: `none`,
    $type: "fontStyle",
    $description:
      "Font style for H6 elements with .prose applied directly or that are a child of a .prose container.",
  },
  "text-transform": {
    $value: `uppercase`,
    $type: "textTransform",
    $description:
      "Text transform for H6 elements with .prose applied directly or that are a child of a .prose container.",
  },
} as const satisfies ListTokens;

export default tokens;
