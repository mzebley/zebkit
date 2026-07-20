import type { LayerName } from "@definitions/layers";
import type { TokenInterface } from "@definitions/tokens";

export const key = "focus";
export const layer: LayerName = "base";

const tokens = {
  "color": {
    $value: `{color.cyan-600}`,
    $type: "color",
    $description:
      "Color of focus outline",
  },
    "width": {
    $value: `{spacing.025}`,
    $type: "dimension",
    $description:
      "Width of focus outline",
  },
    "offset": {
    $value: `{spacing.025}`,
    $type: "dimension",
    $description:
      "Offset distance of focus outline",
  },
} as const satisfies TokenInterface;

export default tokens;
