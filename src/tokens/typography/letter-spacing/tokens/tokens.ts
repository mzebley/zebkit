import type { LayerName } from "@definitions/layers";
import { z } from "zod";
import { tokenSchema } from "./token-schema";

// TODO: Add descriptions

export const key = "letter-spacing";
export const layer: LayerName = "theme";
export type LetterSpacingTokens = z.infer<typeof tokenSchema>;

const tokens = {
  tighter: {
    $value: { value: -0.05, unit: "rem" },
    $type: "letterSpacing",
    $description: "",
    $extensions: { "dev.zebkit": { a11y: true } }
  },
  tight: {
    $value: { value: -0.025, unit: "rem" },
    $type: "letterSpacing",
    $description: "",
    $extensions: { "dev.zebkit": { a11y: true } }
  },
  normal: {
    $value: { value: 0, unit: "rem" },
    $type: "letterSpacing",
    $description: "",
    $extensions: { "dev.zebkit": { a11y: true } }
  },
  wide: {
    $value: { value: 0.025, unit: "rem" },
    $type: "letterSpacing",
    $description: "",
    $extensions: { "dev.zebkit": { a11y: true } }
  },
  wider: {
    $value: { value: 0.05, unit: "rem" },
    $type: "letterSpacing",
    $description: "",
    $extensions: { "dev.zebkit": { a11y: true } }
  },
} as const satisfies LetterSpacingTokens;

export default tokens;
