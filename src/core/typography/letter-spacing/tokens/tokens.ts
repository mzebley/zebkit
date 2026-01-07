import type { LayerName } from "@definitions/layers";
import { z } from "zod";
import { tokenSchema } from "./token-schema";

// TODO: Add descriptions

export const key = "letter-spacing";
export const layer: LayerName = "theme";
export type LetterSpacingTokens = z.infer<typeof tokenSchema>;

const tokens = {
  tighter: {
    value: `-.05rem`,
    type: "letterSpacing",
    description: "",
    a11y: true
  },
  tight: {
    value: `-.025rem`,
    type: "letterSpacing",
    description: "",
    a11y: true
  },
  normal: {
    value: `0rem`,
    type: "letterSpacing",
    description: "",
    a11y: true
  },
  wide: {
    value: `.025rem`,
    type: "letterSpacing",
    description: "",
    a11y: true
  },
  wider: {
    value: `.05rem'`,
    type: "letterSpacing",
    description: "",
    a11y: true
  },
} as const satisfies LetterSpacingTokens;

export default tokens;
