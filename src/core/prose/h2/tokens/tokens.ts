import type { LayerName } from "@definitions/layers";
import { z } from "zod";
import { tokenSchema } from "./token-schema";

export const key = "h2";
export const layer: LayerName = "base";
export type H2Tokens = z.infer<typeof tokenSchema>;

const tokens = {
  "font-family": {
    value: `{font-family.heading}`,
    type: "fontFamily",
    description:
      "Font size for H2 elements with .prose applied directly or that are a child of a .prose container.",
  },
  "font-size": {
    value: `{font-size.xl}`,
    type: "fontSize",
    description:
      "Font size for H2 elements with .prose applied directly or that are a child of a .prose container.",
  },
  "font-weight": {
    value: `{font-weight.bold}`,
    type: "fontWeight",
    description:
      "Font weight for H2 elements with .prose applied directly or that are a child of a .prose container.",
  },
  "line-height": {
    value: `{line-height.3}`,
    type: "lineHeight",
    description:
      "Line height for H2 elements with .prose applied directly or that are a child of a .prose container.",
  },
  "letter-spacing": {
    value: `{letter-spacing.normal}`,
    type: "letterSpacing",
    description:
      "Tracking for H2 elements with .prose applied directly or that are a child of a .prose container.",
  },
  measure: {
    value: `{measure.3}`,
    type: "sizing",
    description:
      "Maximum width for H2 elements with .prose applied directly or that are a child of a .prose container.",
  },
  "spacing-before": {
    value: `{spacing.3}`,
    type: "spacing",
    description:
      "Amount of margin inline start for H2 elements with .prose applied directly or that are a child of a .prose container.",
  },
  "spacing-after": {
    value: `{spacing.2}`,
    type: "spacing",
    description:
      "Amount of margin inline end for H2 elements with .prose applied directly or that are a child of a .prose container.",
  },
  color: {
    value: `{ink}`,
    type: "color",
    description:
      "Color of H2 elements with .prose applied directly or that are a child of a .prose container.",
  },
  "font-style": {
    value: `none`,
    type: "fontStyle",
    description:
      "Font style for H2 elements with .prose applied directly or that are a child of a .prose container.",
  },
  "text-transform": {
    value: `none`,
    type: "textTransform",
    description:
      "Text transform for H2 elements with .prose applied directly or that are a child of a .prose container.",
  },
} as const satisfies H2Tokens;

export default tokens;
