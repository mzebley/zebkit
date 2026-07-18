import type { LayerName } from "@definitions/layers";
import { FONT_FALLBACK_STACKS } from "@definitions/font-fallbacks";
import { z } from "zod";
import { tokenSchema } from "./token-schema";

export const key = "font-family";
export const layer: LayerName = "theme";
export type FontFamilyTokens = z.infer<typeof tokenSchema>;

const tokens = {
  primary: {
    $value: `"Atkinson Hyperlegible Next"`,
    $description:
      "Primary font family for use in the system. Usually used for body content and interface items.",
    $type: "fontFamily",
    $extensions: { "dev.zebkit": { font: { source: "google", fallback: "sans", weights: "200..800" } } },
  },
  alt: {
    $value: `"Merriweather"`,
    $description:
      "Alternate font family for use in the system. Primarily used for headings.",
    $type: "fontFamily",
    $extensions: { "dev.zebkit": { font: { source: "google", fallback: "serif" } } },
  },
  monospace: {
    $value: `"Fira Code"`,
    $description:
      "Monospaced font family for use in the system. Primarily used for displaying code or for accessibility.",
    $type: "fontFamily",
    $extensions: { "dev.zebkit": { font: { source: "google", fallback: "mono" } } },
  },
  "system-sans": {
    $value: FONT_FALLBACK_STACKS.sans,
    $description:
      "System sans-serif stack. Zero network cost; uses the platform UI font.",
    $type: "fontFamily",
    $extensions: { "dev.zebkit": { font: { source: "system" } } },
  },
  "system-serif": {
    $value: FONT_FALLBACK_STACKS.serif,
    $description: "System serif stack. Zero network cost.",
    $type: "fontFamily",
    $extensions: { "dev.zebkit": { font: { source: "system" } } },
  },
  "system-mono": {
    $value: FONT_FALLBACK_STACKS.mono,
    $description: "System monospace stack. Zero network cost.",
    $type: "fontFamily",
    $extensions: { "dev.zebkit": { font: { source: "system" } } },
  },
  interface: {
    $value: "{font-family.primary}",
    $description: "Font family used for things like buttons or input fields.",
    $type: "fontFamily",
  },
  heading: {
    $value: "{font-family.alt}",
    $description: "Font family used for heading elements.",
    $type: "fontFamily",
  },
  body: {
    $value: "{font-family.primary}",
    $description: "Font family used for <p>, <li>, etc.",
    $type: "fontFamily",
  },
  code: {
    $value: "{font-family.monospace}",
    $description: "Font family used within <code> blocks",
    $type: "fontFamily",
  },
} as const satisfies FontFamilyTokens;

export default tokens;
