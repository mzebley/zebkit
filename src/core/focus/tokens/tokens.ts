import type { LayerName } from "@definitions/layers";
import { z } from "zod";
import { tokenSchema } from "./token-schema";

export const key = "focus";
export const layer: LayerName = "base";
export type FocusTokens = z.infer<typeof tokenSchema>;

const tokens = {
  "color": {
    value: `{color.cyan-600}`,
    type: "color",
    description:
      "Color of focus outline",
  },
    "width": {
    value: `{spacing.025}`,
    type: "sizing",
    description:
      "Width of focus outline",
  },
    "offset": {
    value: `{spacing.025}`,
    type: "spacing",
    description:
      "Offset distance of focus outline",
  },
} as const satisfies FocusTokens;

export default tokens;
