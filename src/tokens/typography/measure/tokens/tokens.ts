import type { LayerName } from "@definitions/layers";
import { z } from "zod";
import { tokenSchema } from "./token-schema";

export const key = "text-measure";
export const layer: LayerName = "theme";
export type TextMeasureTokens = z.infer<typeof tokenSchema>;

const tokens = {
  1: {
    $value: `32ch`,
    $type: "cssDimension",
    $description: "Cards, sidebars, tight UI."
  },
  2: {
    $value: `45ch`,
    $type: "cssDimension",
    $description: "Short text blocks, captions."
  },
  3: {
    $value: `60ch`,
    $type: "cssDimension",
    $description: "Base body content measure."
  },
  4: {
    $value: `72ch`,
    $type: "cssDimension",
    $description: "Articles, long-form content."
  },
  5: {
    $value: `85ch`,
    $type: "cssDimension",
    $description: "Articles, long-form content."
  },
} as const satisfies TextMeasureTokens;

export default tokens;
