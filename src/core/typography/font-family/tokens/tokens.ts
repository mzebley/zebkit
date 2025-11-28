import type { LayerName } from "@definitions/layers";
import { z } from "zod";
import { tokenSchema } from "./token-schema";

export const key = "font-family";
export const layer: LayerName = "theme";
export type FontFamilyTokens = z.infer<typeof tokenSchema>;

const tokens = {
  primary: {
    value: `"Open Sans", sans-serif`,
    description:
      "Primary font family for use in the system. Usually used for body content and interface items.",
    variable: false,
    weights: "300,400,700,900",
    type: "googleFont",
  },
  alt: {
    value: `"Merriweather", serif`,
    description:
      "Alternate font family for use in the system. Primarily used for headings.",
    variable: true,
    weights: "",
    type: "googleFont",
  },
  monospace: {
    value: `"Fira Code", monospace`,
    description:
      "Monospaced font family for use in the system. Primarily used for displaying code or for accessibility.",
    variable: false,
    weights: "",
    type: "googleFont",
  },
  interface: {
    value: "{font-family.primary}",
    description: "Font family used for things like buttons or input fields.",
    type: "fontFamily",
  },
  heading: {
    value: "{font-family.alt}",
    description: "Font family used for heading elements.",
    type: "fontFamily",
  },
  body: {
    value: "{font-family.primary}",
    description: "Font family used for <p>, <li>, etc.",
    type: "fontFamily",
  },
  code: {
    value: "{font-family.monospace}",
    description: "Font family used within <code> blocks",
    type: "fontFamily",
  },
} as const satisfies FontFamilyTokens;

export default tokens;
