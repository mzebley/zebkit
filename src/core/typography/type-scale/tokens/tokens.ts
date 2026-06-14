import type { LayerName } from "@definitions/layers";
import { z } from "zod";
import { ZEBKIT_PREFIX } from "@config";
import { tokenSchema } from "./token-schema";

export const key = "font-size";
export const layer: LayerName = "base";
export type TypeScaleTokens = z.infer<typeof tokenSchema>;

// The font-size scale is generated (Utopia-style fluid type) by default: every named
// step is derived from the six control settings below via `resolveTypeScale` at build
// time. Each step interpolates between its size at `min-viewport` (using `min-ratio`)
// and its size at `max-viewport` (using `max-ratio`), so the scale's RATIO itself is
// fluid — hierarchy tightens on small screens and fans out on large ones.
//
// Quirk worth knowing: because `min-ratio` < `max-ratio`, steps BELOW the base invert —
// their small-viewport size is larger than their large-viewport size, so sub-body text
// shrinks slightly as the viewport grows. This is intentional (the scale fans out from
// the base in both directions). The deltas are sub-pixel and the end user can always
// scale type up via the a11y font-size modifier, so we let it stand as designed.
//
// To opt out of fluid sizing, set `tokens.typeScale.static: true` (or `fluid: false`) in
// your zebkit config AND give each step a `value` (a static rem literal). In static mode
// the `index` is ignored and the authored `value` is emitted (still wrapped in the a11y
// modifier). A `value` may also be added to a single step to pin it while the rest stay
// fluid.
const tokens = {
  "min-viewport": {
    value: "360px",
    type: "setting",
    description: "Lower anchor viewport for fluid type sizing.",
  },
  "max-viewport": {
    value: "1240px",
    type: "setting",
    description: "Upper anchor viewport for fluid type sizing.",
  },
  "min-base": {
    value: "1.125rem",
    type: "setting",
    description: "Base (md) font size at the min viewport.",
  },
  "max-base": {
    value: "1.25rem",
    type: "setting",
    description: "Base (md) font size at the max viewport.",
  },
  "min-ratio": {
    value: 1.2,
    type: "setting",
    description: "Type scale ratio at the min viewport (minor third).",
  },
  "max-ratio": {
    value: 1.25,
    type: "setting",
    description: "Type scale ratio at the max viewport (major third).",
  },
  "3xs": {
    index: -4,
    type: "rootFontSize",
    description: "Smallest font size.",
    a11y: `--${ZEBKIT_PREFIX}-a11y-font-size-modifier-3xs`,
  },
  "2xs": {
    index: -3,
    type: "rootFontSize",
    description: "Second smallest font size.",
    a11y: `--${ZEBKIT_PREFIX}-a11y-font-size-modifier-2xs`,
  },
  xs: {
    index: -2,
    type: "rootFontSize",
    description: "Extra small font size.",
    a11y: `--${ZEBKIT_PREFIX}-a11y-font-size-modifier-xs`,
  },
  sm: {
    index: -1,
    type: "rootFontSize",
    description: "Small font size.",
    a11y: `--${ZEBKIT_PREFIX}-a11y-font-size-modifier-sm`,
  },
  md: {
    index: 0,
    type: "rootFontSize",
    description: "Base / body font size.",
    a11y: `--${ZEBKIT_PREFIX}-a11y-font-size-modifier-md`,
  },
  lg: {
    index: 1,
    type: "rootFontSize",
    description: "Large font size.",
    a11y: `--${ZEBKIT_PREFIX}-a11y-font-size-modifier-lg`,
  },
  xl: {
    index: 2,
    type: "rootFontSize",
    description: "Extra large font size.",
    a11y: `--${ZEBKIT_PREFIX}-a11y-font-size-modifier-xl`,
  },
  "2xl": {
    index: 3,
    type: "rootFontSize",
    description: "Double extra large font size.",
    a11y: `--${ZEBKIT_PREFIX}-a11y-font-size-modifier-2xl`,
  },
  "3xl": {
    index: 4,
    type: "rootFontSize",
    description: "Triple extra large font size.",
    a11y: `--${ZEBKIT_PREFIX}-a11y-font-size-modifier-3xl`,
  },
  "4xl": {
    index: 5,
    type: "rootFontSize",
    description: "Quadruple extra large font size.",
    a11y: `--${ZEBKIT_PREFIX}-a11y-font-size-modifier-4xl`,
  },
  "5xl": {
    index: 6,
    type: "rootFontSize",
    description: "Quintuple extra large font size.",
    a11y: `--${ZEBKIT_PREFIX}-a11y-font-size-modifier-5xl`,
  },
} as const satisfies TypeScaleTokens;

export default tokens;
