import type { PaginationVariantConfig } from "./types";

/**
 * Small: tighter type; the glyphs follow via the icon-size default. min-width
 * and min-height are deliberately NOT reduced — the 44px tap target is an
 * accessibility floor, not a style choice.
 */
const sm: PaginationVariantConfig = {
  component: "pagination",
  name: "sm",
  axis: "size",
  description: "Smaller type; keeps the 44px minimum tap target.",
  overrides: {
    "font-size": "{font-size.sm}",
  },
};

export default sm;
