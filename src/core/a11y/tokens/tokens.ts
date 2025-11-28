import type { LayerName } from "@definitions/layers";
import { z } from "zod";
import { tokenSchema } from "./token-schema";

export const key = "a11y";
export const layer: LayerName = "base";
export type A11yTokens = z.infer<typeof tokenSchema>;

const tokens = {
  "spacing-modifier": {
    value: `1`,
    type: "utility",
    description: "Amount to multiple spacing variables by.",
  },
  "line-height-modifier": {
    value: `1`,
    type: "utility",
    description: "Amount to multiple line height variables by.",
  },
  "letter-spacing-modifier": {
    value: `1`,
    type: "utility",
    description: "Amount to multiple letter spacing variables by.",
  },
  "fallback-font-size-modifier": {
    value: `1`,
    type: "utility",
    description:
      "Fallback amount to multiple font size variables by in the event their specific modifier isn't set.",
  },
} as const satisfies A11yTokens;

export default tokens;
