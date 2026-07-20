import type { LayerName } from "@definitions/layers";
import { z } from "zod";
import { ZEBKIT_PREFIX } from "@config";
import { tokenSchema } from "./token-schema";

export const key = "line-height";
export const layer: LayerName = "theme";
export type LineHeightTokens = z.infer<typeof tokenSchema>;

// Line heights are unitless (DTCG `number`, Phase 2e): the factor form inherits
// the multiplier rather than a computed length, avoiding compounding. Each entry
// names the reduced-motion/readability modifier explicitly — the generic
// `number` type no longer identifies it (the letter-spacing precedent).
const a11y = `--${ZEBKIT_PREFIX}-a11y-line-height-modifier`;

const tokens = {
  1: {
    $value: 1,
    $type: "number",
    $description: "Smallest line height.",
    $extensions: { "dev.zebkit": { a11y } },
  },
  2: {
    $value: 1.25,
    $type: "number",
    $description: "Smaller line height.",
    $extensions: { "dev.zebkit": { a11y } },
  },
  3: {
    $value: 1.5,
    $type: "number",
    $description: "Base line height.",
    $extensions: { "dev.zebkit": { a11y } },
  },
  4: {
    $value: 1.8,
    $type: "number",
    $description: "Larger line height.",
    $extensions: { "dev.zebkit": { a11y } },
  },
  5: {
    $value: 2,
    $type: "number",
    $description: "Largest line height.",
    $extensions: { "dev.zebkit": { a11y } },
  },
} as const satisfies LineHeightTokens;

export default tokens;
