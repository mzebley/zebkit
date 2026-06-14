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
    description: "Amount to multiply spacing variables by (independent density dial).",
  },
  "spacing-text-coupling": {
    value: `0.5`,
    type: "utility",
    description:
      "How hard spacing follows body (md) font-size growth: 1 = 1:1, 0 = decoupled. Lets containers grow with text without a separate density bump.",
  },
  "line-height-modifier": {
    value: `1`,
    type: "utility",
    description: "Amount to multiply line height variables by.",
  },
  "letter-spacing-modifier": {
    value: `1`,
    type: "utility",
    description: "Amount to multiply letter spacing variables by.",
  },
  "fallback-font-size-modifier": {
    value: `1`,
    type: "utility",
    description:
      "Fallback amount to multiply font size variables by in the event their specific modifier isn't set.",
  },
  "transition-duration-modifier": {
    value: `1`,
    type: "utility",
    description:
      "Amount to multiply transition durations by (automatically set to 0 with media query match for 'prefers-reduced-motion'",
  }
} as const satisfies A11yTokens;

export default tokens;
