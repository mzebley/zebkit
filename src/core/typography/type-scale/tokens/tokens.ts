import type { LayerName } from "@definitions/layers";
import { z } from "zod";
import { ZEBKIT_PREFIX } from "@config";
import { tokenSchema } from "./token-schema";

export const key = "font-size";
export const layer: LayerName = "base";
export type TypeScaleTokens = z.infer<typeof tokenSchema>;

const tokens = {
  "viewport-font-size-modifier": {
    value: ".23vw",
    type: "utility",
    description:
      "Viewport modifier for responsive font sizing, added to each root font size on screen resolutions over 40rem. Set to 0 to disable responsive font sizing.",
  },
  "max-font-size-modifer": {
    value: "1.25",
    type: "utility",
    description:
      "Maximum font size increase allowed when using responsive font sizing.",
  },
  "3xs": {
    value: `.75rem`,
    type: "rootFontSize",
    description: "Smallest font size.",
    a11y: `--${ZEBKIT_PREFIX}-a11y-font-size-modifier-3xs`,
  },
  "2xs": {
    value: `.82rem`,
    type: "rootFontSize",
    description: "Second smallest font size.",
    a11y: `--${ZEBKIT_PREFIX}-a11y-font-size-modifier-2xs`,
  },
  xs: {
    value: `.9rem`,
    type: "rootFontSize",
    description: "Extra small font size.",
    a11y: `--${ZEBKIT_PREFIX}-a11y-font-size-modifier-xs`,
  },
  sm: {
    value: `1rem`,
    type: "rootFontSize",
    description: "Small font size.",
    a11y: `--${ZEBKIT_PREFIX}-a11y-font-size-modifier-sm`,
  },
  md: {
    value: `1.125rem`,
    type: "rootFontSize",
    description: "Medium font size.",
    a11y: `--${ZEBKIT_PREFIX}-a11y-font-size-modifier-md`,
  },
  lg: {
    value: `1.75rem`,
    type: "rootFontSize",
    description: "Large font size.",
    a11y: `--${ZEBKIT_PREFIX}-a11y-font-size-modifier-lg`,
  },
  xl: {
    value: `2.125rem`,
    type: "rootFontSize",
    description: "Extra large font size.",
    a11y: `--${ZEBKIT_PREFIX}-a11y-font-size-modifier-xl`,
  },
  "2xl": {
    value: `2.6rem`,
    type: "rootFontSize",
    description: "Double extra large font size.",
    a11y: `--${ZEBKIT_PREFIX}-a11y-font-size-modifier-2xl`,
  },
  "3xl": {
    value: `3.5rem`,
    type: "rootFontSize",
    description: "Triple extra large font size.",
    a11y: `--${ZEBKIT_PREFIX}-a11y-font-size-modifier-3xl`,
  },
    "4xl": {
    value: `4.5rem`,
    type: "rootFontSize",
    description: "Quadruple extra large font size.",
    a11y: `--${ZEBKIT_PREFIX}-a11y-font-size-modifier-4xl`,
  },
    "5xl": {
    value: `5rem`,
    type: "rootFontSize",
    description: "Quintuple extra large font size.",
    a11y: `--${ZEBKIT_PREFIX}-a11y-font-size-modifier-5xl`,
  },
} as const satisfies TypeScaleTokens;

export default tokens;
