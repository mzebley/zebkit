import type { LayerName } from "@definitions/layers";
import { z } from "zod";
import { tokenSchema } from "./token-schema";

export const key = "p";
export const layer: LayerName = "base";
export type PTokens = z.infer<typeof tokenSchema>;

const tokens = {
  "font-family": {
    $value: `{font-family.body}`,
    $type: "fontFamily",
    $description:
      "Font size for P elements with .prose applied directly or that are a child of a .prose container.",
  },
  "font-size": {
    $value: `{font-size.sm}`,
    $type: "cssDimension",
    $description:
      "Font size for P elements with .prose applied directly or that are a child of a .prose container.",
  },
  "font-weight": {
    $value: `{font-weight.normal}`,
    $type: "fontWeight",
    $description:
      "Font weight for P elements with .prose applied directly or that are a child of a .prose container.",
  },
  "line-height": {
    $value: `{line-height.3}`,
    $type: "number",
    $description:
      "Line height for P elements with .prose applied directly or that are a child of a .prose container.",
  },
  "letter-spacing": {
    $value: `{letter-spacing.normal}`,
    $type: "dimension",
    $description:
      "Tracking for P elements with .prose applied directly or that are a child of a .prose container.",
  },
  measure: {
    $value: `{text-measure.4}`,
    $type: "cssDimension",
    $description:
      "Maximum width for P elements with .prose applied directly or that are a child of a .prose container.",
  },
  "spacing-before": {
    $value: `{spacing.0}`,
    $type: "dimension",
    $description:
      "Amount of margin inline start for P elements with .prose applied directly or that are a child of a .prose container.",
  },
  "spacing-after": {
    $value: `{spacing.05}`,
    $type: "dimension",
    $description:
      "Amount of margin inline end for P elements with .prose applied directly or that are a child of a .prose container.",
  },
  color: {
    $value: `{app.ink}`,
    $type: "color",
    $description:
      "Color of P elements with .prose applied directly or that are a child of a .prose container.",
  },
  "font-style": {
    $value: `none`,
    $type: "fontStyle",
    $description:
      "Font style for P elements with .prose applied directly or that are a child of a .prose container.",
  },
  "text-transform": {
    $value: `none`,
    $type: "textTransform",
    $description:
      "Text transform for P elements with .prose applied directly or that are a child of a .prose container.",
  },
} as const satisfies PTokens;

export default tokens;
