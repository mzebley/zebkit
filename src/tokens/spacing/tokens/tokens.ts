import type { LayerName } from "@definitions/layers";
import { z } from "zod";
import { tokenSchema } from "./token-schema";

export const key = "spacing";
export const layer: LayerName = "base";
export type SpacingTokens = z.infer<typeof tokenSchema>;

// Spacing is generated fluid (Utopia-style), like the type scale, and additionally
// responds to two runtime forces so containers grow with their contents:
//
//   spacing = clamp(fluid by viewport)
//             × var(--zbk-a11y-spacing-modifier)             ← independent density dial
//             × (1 + (var(--zbk-a11y-font-size-modifier-md) - 1)
//                    × var(--zbk-a11y-spacing-text-coupling)) ← follows BODY text size
//
// Each token's authored `value` is its size at the MIN (mobile) viewport anchor — a
// guaranteed floor that never shrinks below what was authored. The max-anchor size is
// `value × growth`, where `growth` is derived per-token from a continuous log curve by floor
// magnitude: micro spacing (≤ ~0.5rem) stays flat, large layout spacing blooms toward the
// `max-scale` ceiling on wide screens. Classification is automatic — no tiers to maintain —
// and a token can set its own `growth` to override the curve. Viewport anchors are shared
// with the font-size module (`min-viewport` / `max-viewport`). The text-coupling factor reads
// the body (`md`) font
// modifier so that when reading text scales up, padding/min-heights/gaps scale with it —
// dampened by `--zbk-a11y-spacing-text-coupling` (default 0.5; defined in the a11y token
// module). Density is independent, so "large text, compact layout" resolves correctly.
//
// `resolveSpaceScale` (src/scripts/tokens/build-space-scale.ts) bakes all of this in at
// build time. Precision px tokens (1px, 2px, …) skip the viewport interpolation but still get
// the density + coupling multiplier — every spacing token honors the runtime a11y dials. Only
// `0` is emitted exact. Set `tokens.spaceScale.static: true` to drop the viewport interpolation
// (density and coupling still apply).
const tokens = {
  "max-scale": {
    $value: 1.25,
    $type: "setting",
    $description:
      "Growth ceiling: how much the largest layout spacing tokens bloom from their authored (min-viewport) floor to the max viewport. Per-token growth ramps up to this on a log curve by floor magnitude; micro spacing stays flat.",
  },
  "neg-15": {
    $value: `-15rem`,
    $type: "rootSize",
    $description:
      "Extremely large negative spacing (major overlap or pull effects).",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  "neg-10": {
    $value: `-10rem`,
    $type: "rootSize",
    $description: "Very large negative spacing.",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  "neg-9": {
    $value: `-9rem`,
    $type: "rootSize",
    $description: "Large negative spacing.",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  "neg-8": {
    $value: `-8rem`,
    $type: "rootSize",
    $description: "Large negative spacing (slightly smaller).",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  "neg-7": {
    $value: `-7rem`,
    $type: "rootSize",
    $description: "Medium-large negative spacing.",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  "neg-6": {
    $value: `-6rem`,
    $type: "rootSize",
    $description: "Medium negative spacing.",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  "neg-5": {
    $value: `-5rem`,
    $type: "rootSize",
    $description: "Medium negative spacing (slightly smaller).",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  "neg-4": {
    $value: `-4rem`,
    $type: "rootSize",
    $description: "Small-medium negative spacing.",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  "neg-3": {
    $value: `-3rem`,
    $type: "rootSize",
    $description: "Small negative spacing.",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  "neg-205": {
    $value: `-2.5rem`,
    $type: "rootSize",
    $description: "Extra-small negative spacing.",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  "neg-2": {
    $value: `-2rem`,
    $type: "rootSize",
    $description: "Tiny negative spacing.",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  "neg-105": {
    $value: `-1.5rem`,
    $type: "rootSize",
    $description: "Very tiny negative spacing.",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  "neg-1": {
    $value: `-1rem`,
    $type: "rootSize",
    $description: "Minimal negative spacing.",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  "neg-05": {
    $value: `-.5rem`,
    $type: "rootSize",
    $description: "Minimal negative spacing (smaller).",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  "neg-025": {
    $value: `-.25rem`,
    $type: "rootSize",
    $description: "Hairline negative spacing.",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  "neg-2px": {
    $value: `-2px`,
    $type: "rootSize",
    $description: "Precision negative spacing (coarse).",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  "neg-1px": {
    $value: `-1px`,
    $type: "rootSize",
    $description: "Precision negative spacing (fine).",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  "0": {
    $value: `0px`,
    $type: "rootSize",
    $description: "Zero spacing.",
  },
  "1px": {
    $value: `1px`,
    $type: "rootSize",
    $description: "Precision spacing (fine).",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  "2px": {
    $value: `2px`,
    $type: "rootSize",
    $description: "Precision spacing (coarse).",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  "025": {
    $value: `.25rem`,
    $type: "rootSize",
    $description: "Extra-tiny spacing.",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  "05": {
    $value: `.5rem`,
    $type: "rootSize",
    $description: "Tiny spacing.",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  "1": {
    $value: `1rem`,
    $type: "rootSize",
    $description: "Small spacing.",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  "105": {
    $value: `1.5rem`,
    $type: "rootSize",
    $description: "Small-plus spacing.",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  "2": {
    $value: `2rem`,
    $type: "rootSize",
    $description: "Base spacing.",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  "205": {
    $value: `2.5rem`,
    $type: "rootSize",
    $description: "Base-plus spacing.",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  "3": {
    $value: `3rem`,
    $type: "rootSize",
    $description: "Medium spacing.",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  "4": {
    $value: `4rem`,
    $type: "rootSize",
    $description: "Medium-plus spacing.",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  "5": {
    $value: `5rem`,
    $type: "rootSize",
    $description: "Large spacing.",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  "6": {
    $value: `6rem`,
    $type: "rootSize",
    $description: "Large-plus spacing.",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  "7": {
    $value: `7rem`,
    $type: "rootSize",
    $description: "XL spacing.",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  "8": {
    $value: `8rem`,
    $type: "rootSize",
    $description: "XL-plus spacing.",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  "9": {
    $value: `9rem`,
    $type: "rootSize",
    $description: "2XL spacing.",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  "10": {
    $value: `10rem`,
    $type: "rootSize",
    $description: "2XL-plus spacing.",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  "15": {
    $value: `15rem`,
    $type: "rootSize",
    $description: "3XL layout spacing.",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  "20": {
    $value: `20rem`,
    $type: "rootSize",
    $description: "4XL layout spacing.",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  "25": {
    $value: `25rem`,
    $type: "rootSize",
    $description: "5XL layout spacing.",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  "30": {
    $value: `30rem`,
    $type: "rootSize",
    $description: "6XL layout spacing.",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  "40": {
    $value: `40rem`,
    $type: "rootSize",
    $description: "7XL layout spacing.",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  "50": {
    $value: `50rem`,
    $type: "rootSize",
    $description: "8XL layout spacing.",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  "60": {
    $value: `60rem`,
    $type: "rootSize",
    $description: "9XL layout spacing.",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  "70": {
    $value: `70rem`,
    $type: "rootSize",
    $description: "10XL layout spacing.",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  "80": {
    $value: `80rem`,
    $type: "rootSize",
    $description: "11XL layout spacing.",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  "90": {
    $value: `90rem`,
    $type: "rootSize",
    $description: "12XL layout spacing.",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  "100": {
    $value: `100rem`,
    $type: "rootSize",
    $description: "13XL layout spacing.",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
} as const satisfies SpacingTokens;

export default tokens;
