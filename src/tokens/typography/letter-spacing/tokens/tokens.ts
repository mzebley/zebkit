import type { LayerName } from "@definitions/layers";
import type { TokenInterface } from "@definitions/tokens";
import { ZEBKIT_PREFIX } from "@config";

export const key = "letter-spacing";
export const layer: LayerName = "theme";

const tokens = {
  tighter: {
    $value: { value: -0.05, unit: "rem" },
    $type: "dimension",
    $description: "Strongly condensed tracking for short display text.",
    $extensions: { "dev.zebkit": { a11y: `--${ZEBKIT_PREFIX}-a11y-letter-spacing-modifier` } }
  },
  tight: {
    $value: { value: -0.025, unit: "rem" },
    $type: "dimension",
    $description: "Condensed tracking for headings and compact labels.",
    $extensions: { "dev.zebkit": { a11y: `--${ZEBKIT_PREFIX}-a11y-letter-spacing-modifier` } }
  },
  normal: {
    $value: { value: 0, unit: "rem" },
    $type: "dimension",
    $description: "Neutral tracking that preserves the font's default spacing.",
    $extensions: { "dev.zebkit": { a11y: `--${ZEBKIT_PREFIX}-a11y-letter-spacing-modifier` } }
  },
  wide: {
    $value: { value: 0.025, unit: "rem" },
    $type: "dimension",
    $description: "Expanded tracking for labels and small uppercase text.",
    $extensions: { "dev.zebkit": { a11y: `--${ZEBKIT_PREFIX}-a11y-letter-spacing-modifier` } }
  },
  wider: {
    $value: { value: 0.05, unit: "rem" },
    $type: "dimension",
    $description: "Strongly expanded tracking for short display text.",
    $extensions: { "dev.zebkit": { a11y: `--${ZEBKIT_PREFIX}-a11y-letter-spacing-modifier` } }
  },
} as const satisfies TokenInterface;

export default tokens;
