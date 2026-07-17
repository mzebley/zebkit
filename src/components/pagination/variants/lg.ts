import type { PaginationVariantConfig } from "./types";

/**
 * Large: bigger type and roomier items; the glyphs follow via the icon-size
 * default.
 */
const lg: PaginationVariantConfig = {
  component: "pagination",
  name: "lg",
  axis: "size",
  description: "Larger type and roomier item padding.",
  overrides: {
    "font-size": "{font-size.lg}",
    "padding-inline": "{spacing.xs}",
    "padding-block": "{spacing.xs}",
  },
};

export default lg;
