import type { LayerName } from "@definitions/layers";
import type { TokenInterface } from "@definitions/tokens";

export const key = "font-weight";
export const layer: LayerName = "theme";

// DTCG `fontWeight` values are numeric (1–1000), not strings (Phase 2e). The
// `a11y: true` flags are inert today (no font-weight modifier is defined and the
// type is absent from a11yMap) — left as-authored; they emit bare weights.
const tokens = {
  thin: {
    $value: 100,
    $type: "fontWeight",
    $description: "Lightest font weight.",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  extralight: {
    $value: 200,
    $type: "fontWeight",
    $description: "Lighter font weight.",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  light: {
    $value: 300,
    $type: "fontWeight",
    $description: "Light font weight.",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  normal: {
    $value: 400,
    $type: "fontWeight",
    $description: "Default font weight.",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  medium: {
    $value: 500,
    $type: "fontWeight",
    $description: "Medium font weight.",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  semibold: {
    $value: 600,
    $type: "fontWeight",
    $description: "Semibold font weight.",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  bold: {
    $value: 700,
    $type: "fontWeight",
    $description: "Bold font weight.",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  extrabold: {
    $value: 800,
    $type: "fontWeight",
    $description: "Bolder font weight.",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  black: {
    $value: 900,
    $type: "fontWeight",
    $description: "Boldest font weight.",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
} as const satisfies TokenInterface;

export default tokens;
