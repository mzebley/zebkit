import type { LayerName } from "@definitions/layers";
import { z } from "zod";
import { tokenSchema } from "./token-schema";

export const key = "border";
export const layer: LayerName = "base";
export type BorderTokens = z.infer<typeof tokenSchema>;

const tokens = {
"width-xs": {
    $value: "{spacing.1px}",
    $type: "dimension",
    $description: "Smallest semantic border width.",
  },
  "width-sm": {
    $value: "{spacing.2px}",
    $type: "dimension",
    $description: "Small semantic border width.",
  },
  "width-md": {
    $value: "{spacing.025}",
    $type: "dimension",
    $description: "Base semantic border width.",
  },
  "width-lg": {
    $value: "{spacing.05}",
    $type: "dimension",
    $description: "Larger semantic border width.",
  },
  "width-xl": {
    $value: "{spacing.1}",
    $type: "dimension",
    $description: "Largest semantic border width.",
  },
  "style": {
    $value: "solid",
    $type: "borderStyle",
    $description: "Standarized border style for project.",
  },
  "radius-xs": {
    $value: "{spacing.2px}",
    $type: "dimension",
    $description: "Smallest semantic corner radius.",
  },
  "radius-sm": {
    $value: "{spacing.025}",
    $type: "dimension",
    $description: "Small semantic corner radius.",
  },
  "radius-md": {
    $value: "{spacing.05}",
    $type: "dimension",
    $description: "Base semantic corner radius.",
  },
  "radius-lg": {
    $value: "{spacing.105}",
    $type: "dimension",
    $description: "Larger semantic corner radius.",
  },
  "radius-xl": {
    $value: "{spacing.205}",
    $type: "dimension",
    $description: "Largest semantic corner radius.",
  }
} as const satisfies BorderTokens;

export default tokens;
