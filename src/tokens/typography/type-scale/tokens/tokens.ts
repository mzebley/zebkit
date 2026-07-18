import type { LayerName } from "@definitions/layers";
import { z } from "zod";
import { ZEBKIT_PREFIX } from "@config";
import type { TokenGroupExtensions } from "@definitions/tokens";
import { tokenSchema } from "./token-schema";

export const key = "font-size";
export const layer: LayerName = "base";
export type TypeScaleTokens = z.infer<typeof tokenSchema>;

// The font-size scale is generated (Utopia-style fluid type) by default: every named
// step is derived from the six scale controls in the group-level `extensions` below
// via `resolveTypeScale` at build time. Each step interpolates between its size at
// `min-viewport` (using `min-ratio`) and its size at `max-viewport` (using
// `max-ratio`), so the scale's RATIO itself is fluid — hierarchy tightens on small
// screens and fans out on large ones.
//
// Quirk worth knowing: because `min-ratio` < `max-ratio`, steps BELOW the base invert —
// their small-viewport size is larger than their large-viewport size, so sub-body text
// shrinks slightly as the viewport grows. This is intentional (the scale fans out from
// the base in both directions). The deltas are sub-pixel and the end user can always
// scale type up via the a11y font-size modifier, so we let it stand as designed.
//
// To opt out of fluid sizing, set `tokens.typeScale.static: true` (or `fluid: false`) in
// your zebkit config AND give each step a `$value` (a static rem literal). In static mode
// the step index is ignored and the authored `$value` is emitted (still wrapped in the
// a11y modifier). A `$value` may also be added to a single step to pin it while the rest
// stay fluid.

// Scale controls are group-level metadata, not tokens: they are consumed at build
// time and never become CSS custom properties. Override documents adjust them via
// a top-level `$extensions` member.
export const extensions = {
  "dev.zebkit": {
    scale: {
      "min-viewport": "360px",
      "max-viewport": "1240px",
      "min-base": "1.125rem",
      "max-base": "1.25rem",
      "min-ratio": 1.2,
      "max-ratio": 1.25,
    },
  },
} as const satisfies TokenGroupExtensions;

const tokens = {
  "3xs": {
    $type: "rootFontSize",
    $description: "Smallest font size.",
    $extensions: {
      "dev.zebkit": {
        a11y: `--${ZEBKIT_PREFIX}-a11y-font-size-modifier-3xs`,
        scale: { index: -4 },
      },
    },
  },
  "2xs": {
    $type: "rootFontSize",
    $description: "Second smallest font size.",
    $extensions: {
      "dev.zebkit": {
        a11y: `--${ZEBKIT_PREFIX}-a11y-font-size-modifier-2xs`,
        scale: { index: -3 },
      },
    },
  },
  xs: {
    $type: "rootFontSize",
    $description: "Extra small font size.",
    $extensions: {
      "dev.zebkit": {
        a11y: `--${ZEBKIT_PREFIX}-a11y-font-size-modifier-xs`,
        scale: { index: -2 },
      },
    },
  },
  sm: {
    $type: "rootFontSize",
    $description: "Small font size.",
    $extensions: {
      "dev.zebkit": {
        a11y: `--${ZEBKIT_PREFIX}-a11y-font-size-modifier-sm`,
        scale: { index: -1 },
      },
    },
  },
  md: {
    $type: "rootFontSize",
    $description: "Base / body font size.",
    $extensions: {
      "dev.zebkit": {
        a11y: `--${ZEBKIT_PREFIX}-a11y-font-size-modifier-md`,
        scale: { index: 0 },
      },
    },
  },
  lg: {
    $type: "rootFontSize",
    $description: "Large font size.",
    $extensions: {
      "dev.zebkit": {
        a11y: `--${ZEBKIT_PREFIX}-a11y-font-size-modifier-lg`,
        scale: { index: 1 },
      },
    },
  },
  xl: {
    $type: "rootFontSize",
    $description: "Extra large font size.",
    $extensions: {
      "dev.zebkit": {
        a11y: `--${ZEBKIT_PREFIX}-a11y-font-size-modifier-xl`,
        scale: { index: 2 },
      },
    },
  },
  "2xl": {
    $type: "rootFontSize",
    $description: "Double extra large font size.",
    $extensions: {
      "dev.zebkit": {
        a11y: `--${ZEBKIT_PREFIX}-a11y-font-size-modifier-2xl`,
        scale: { index: 3 },
      },
    },
  },
  "3xl": {
    $type: "rootFontSize",
    $description: "Triple extra large font size.",
    $extensions: {
      "dev.zebkit": {
        a11y: `--${ZEBKIT_PREFIX}-a11y-font-size-modifier-3xl`,
        scale: { index: 4 },
      },
    },
  },
  "4xl": {
    $type: "rootFontSize",
    $description: "Quadruple extra large font size.",
    $extensions: {
      "dev.zebkit": {
        a11y: `--${ZEBKIT_PREFIX}-a11y-font-size-modifier-4xl`,
        scale: { index: 5 },
      },
    },
  },
  "5xl": {
    $type: "rootFontSize",
    $description: "Quintuple extra large font size.",
    $extensions: {
      "dev.zebkit": {
        a11y: `--${ZEBKIT_PREFIX}-a11y-font-size-modifier-5xl`,
        scale: { index: 6 },
      },
    },
  },
} as const satisfies TypeScaleTokens;

export default tokens;
