import type { LayerName } from "@definitions/layers";
import type { TokenInterface } from "@definitions/tokens";

export const key = "h1";
export const layer: LayerName = "theme";

const tokens = {
  "font-family": {
    $value: `{font-family.heading}`,
    $type: "fontFamily",
    $description:
      "Font size for H1 elements with .prose applied directly or that are a child of a .prose container.",
  },
  "font-size": {
    $value: `{font-size.3xl}`,
    $type: "cssDimension",
    $description:
      "Font size for H1 elements with .prose applied directly or that are a child of a .prose container.",
  },
  "font-weight": {
    $value: `{font-weight.bold}`,
    $type: "fontWeight",
    $description:
      "Font weight for H1 elements with .prose applied directly or that are a child of a .prose container.",
  },
  "line-height": {
    $value: `{line-height.2}`,
    $type: "number",
    $description:
      "Line height for H1 elements with .prose applied directly or that are a child of a .prose container.",
  },
  "letter-spacing": {
    $value: `{letter-spacing.normal}`,
    $type: "dimension",
    $description:
      "Tracking for H1 elements with .prose applied directly or that are a child of a .prose container.",
  },
  measure: {
    $value: `{text-measure.3}`,
    $type: "cssDimension",
    $description:
      "Maximum width for H1 elements with .prose applied directly or that are a child of a .prose container.",
  },
  "spacing-before": {
    $value: `{spacing.0}`,
    $type: "dimension",
    $description:
      "Amount of margin inline start for H1 elements with .prose applied directly or that are a child of a .prose container.",
  },
  "spacing-after": {
    $value: `{spacing.1}`,
    $type: "dimension",
    $description:
      "Amount of margin inline end for H1 elements with .prose applied directly or that are a child of a .prose container.",
  },
  color: {
    $value: `{app.ink}`,
    $type: "color",
    $description:
      "Color of H1 elements with .prose applied directly or that are a child of a .prose container.",
  },
  "font-style": {
    $value: `none`,
    $type: "fontStyle",
    $description:
      "Font style for H1 elements with .prose applied directly or that are a child of a .prose container.",
  },
  "text-transform": {
    $value: `none`,
    $type: "textTransform",
    $description:
      "Text transform for H1 elements with .prose applied directly or that are a child of a .prose container.",
  },
} as const satisfies TokenInterface;

export default tokens;
