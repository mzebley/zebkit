import type { LayerName } from "@definitions/layers";
import { z } from "zod";
import { ZEBKIT_PREFIX } from "@config";
import { tokenSchema } from "./token-schema";

// TODO: Add descriptions

export const key = "letter-spacing";
export const layer: LayerName = "theme";
export type LetterSpacingTokens = z.infer<typeof tokenSchema>;

const tokens = {
  tighter: {
    $value: { value: -0.05, unit: "rem" },
    $type: "dimension",
    $description: "",
    $extensions: { "dev.zebkit": { a11y: `--${ZEBKIT_PREFIX}-a11y-letter-spacing-modifier` } }
  },
  tight: {
    $value: { value: -0.025, unit: "rem" },
    $type: "dimension",
    $description: "",
    $extensions: { "dev.zebkit": { a11y: `--${ZEBKIT_PREFIX}-a11y-letter-spacing-modifier` } }
  },
  normal: {
    $value: { value: 0, unit: "rem" },
    $type: "dimension",
    $description: "",
    $extensions: { "dev.zebkit": { a11y: `--${ZEBKIT_PREFIX}-a11y-letter-spacing-modifier` } }
  },
  wide: {
    $value: { value: 0.025, unit: "rem" },
    $type: "dimension",
    $description: "",
    $extensions: { "dev.zebkit": { a11y: `--${ZEBKIT_PREFIX}-a11y-letter-spacing-modifier` } }
  },
  wider: {
    $value: { value: 0.05, unit: "rem" },
    $type: "dimension",
    $description: "",
    $extensions: { "dev.zebkit": { a11y: `--${ZEBKIT_PREFIX}-a11y-letter-spacing-modifier` } }
  },
} as const satisfies LetterSpacingTokens;

export default tokens;
