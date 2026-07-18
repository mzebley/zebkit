import type { LayerName } from "@definitions/layers";
import { z } from "zod";
import { tokenSchema } from "./token-schema";

export const key = "line-height";
export const layer: LayerName = "theme";
export type LineHeightTokens = z.infer<typeof tokenSchema>;

const tokens = {
  1: {
    $value: `100%`,
    $type: "lineHeight",
    $description: "Smallest line height.",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  2: {
    $value: `125%`,
    $type: "lineHeight",
    $description: "Smaller line height.",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  3: {
    $value: `150%`,
    $type: "lineHeight",
    $description: "Base line height.",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  4: {
    $value: `180%`,
    $type: "lineHeight",
    $description: "Larger line height.",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  5: {
    $value: `200%`,
    $type: "lineHeight",
    $description: "Largest line height.",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
} as const satisfies LineHeightTokens;

export default tokens;
