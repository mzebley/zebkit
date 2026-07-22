import type { LayerName } from "@definitions/layers";
import type { TokenGroupExtensions, TokenInterface } from "@definitions/tokens";

export const key = "spacing";
export const layer: LayerName = "base";

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
// The growth ceiling is group-level metadata, not a token: it is consumed at
// build time and never becomes a CSS custom property. Override documents adjust
// it via a top-level `$extensions` member.
export const extensions = {
  "dev.zebkit": {
    scale: {
      // How much the largest layout spacing tokens bloom from their authored
      // (min-viewport) floor to the max viewport. Per-token growth ramps up to
      // this on a log curve by floor magnitude; micro spacing stays flat.
      "max-scale": 1.25,
    },
  },
} as const satisfies TokenGroupExtensions;

const tokens = {
  "neg-15": {
    $value: { value: -15, unit: "rem" },
    $type: "dimension",
    $description:
      "Extremely large negative spacing (major overlap or pull effects).",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  "neg-10": {
    $value: { value: -10, unit: "rem" },
    $type: "dimension",
    $description: "Very large negative spacing.",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  "neg-9": {
    $value: { value: -9, unit: "rem" },
    $type: "dimension",
    $description: "Large negative spacing.",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  "neg-8": {
    $value: { value: -8, unit: "rem" },
    $type: "dimension",
    $description: "Large negative spacing (slightly smaller).",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  "neg-7": {
    $value: { value: -7, unit: "rem" },
    $type: "dimension",
    $description: "Medium-large negative spacing.",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  "neg-6": {
    $value: { value: -6, unit: "rem" },
    $type: "dimension",
    $description: "Medium negative spacing.",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  "neg-5": {
    $value: { value: -5, unit: "rem" },
    $type: "dimension",
    $description: "Medium negative spacing (slightly smaller).",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  "neg-4": {
    $value: { value: -4, unit: "rem" },
    $type: "dimension",
    $description: "Small-medium negative spacing.",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  "neg-3": {
    $value: { value: -3, unit: "rem" },
    $type: "dimension",
    $description: "Small negative spacing.",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  "neg-205": {
    $value: { value: -2.5, unit: "rem" },
    $type: "dimension",
    $description: "Extra-small negative spacing.",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  "neg-2": {
    $value: { value: -2, unit: "rem" },
    $type: "dimension",
    $description: "Tiny negative spacing.",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  "neg-105": {
    $value: { value: -1.5, unit: "rem" },
    $type: "dimension",
    $description: "Very tiny negative spacing.",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  "neg-1": {
    $value: { value: -1, unit: "rem" },
    $type: "dimension",
    $description: "Minimal negative spacing.",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  "neg-05": {
    $value: { value: -0.5, unit: "rem" },
    $type: "dimension",
    $description: "Minimal negative spacing (smaller).",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  "neg-025": {
    $value: { value: -0.25, unit: "rem" },
    $type: "dimension",
    $description: "Hairline negative spacing.",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  "neg-2px": {
    $value: { value: -2, unit: "px" },
    $type: "dimension",
    $description: "Precision negative spacing (coarse).",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  "neg-1px": {
    $value: { value: -1, unit: "px" },
    $type: "dimension",
    $description: "Precision negative spacing (fine).",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  "0": {
    $value: { value: 0, unit: "px" },
    $type: "dimension",
    $description: "Zero spacing.",
  },
  "1px": {
    $value: { value: 1, unit: "px" },
    $type: "dimension",
    $description: "Precision spacing (fine).",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  "2px": {
    $value: { value: 2, unit: "px" },
    $type: "dimension",
    $description: "Precision spacing (coarse).",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  "025": {
    $value: { value: 0.25, unit: "rem" },
    $type: "dimension",
    $description: "Extra-tiny spacing.",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  "05": {
    $value: { value: 0.5, unit: "rem" },
    $type: "dimension",
    $description: "Tiny spacing.",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  "1": {
    $value: { value: 1, unit: "rem" },
    $type: "dimension",
    $description: "Small spacing.",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  "105": {
    $value: { value: 1.5, unit: "rem" },
    $type: "dimension",
    $description: "Small-plus spacing.",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  "2": {
    $value: { value: 2, unit: "rem" },
    $type: "dimension",
    $description: "Base spacing.",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  "205": {
    $value: { value: 2.5, unit: "rem" },
    $type: "dimension",
    $description: "Base-plus spacing.",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  "3": {
    $value: { value: 3, unit: "rem" },
    $type: "dimension",
    $description: "Medium spacing.",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  "4": {
    $value: { value: 4, unit: "rem" },
    $type: "dimension",
    $description: "Medium-plus spacing.",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  "5": {
    $value: { value: 5, unit: "rem" },
    $type: "dimension",
    $description: "Large spacing.",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  "6": {
    $value: { value: 6, unit: "rem" },
    $type: "dimension",
    $description: "Large-plus spacing.",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  "7": {
    $value: { value: 7, unit: "rem" },
    $type: "dimension",
    $description: "XL spacing.",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  "8": {
    $value: { value: 8, unit: "rem" },
    $type: "dimension",
    $description: "XL-plus spacing.",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  "9": {
    $value: { value: 9, unit: "rem" },
    $type: "dimension",
    $description: "2XL spacing.",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  "10": {
    $value: { value: 10, unit: "rem" },
    $type: "dimension",
    $description: "2XL-plus spacing.",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  "15": {
    $value: { value: 15, unit: "rem" },
    $type: "dimension",
    $description: "3XL layout spacing.",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  "20": {
    $value: { value: 20, unit: "rem" },
    $type: "dimension",
    $description: "4XL layout spacing.",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  "25": {
    $value: { value: 25, unit: "rem" },
    $type: "dimension",
    $description: "5XL layout spacing.",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  "30": {
    $value: { value: 30, unit: "rem" },
    $type: "dimension",
    $description: "6XL layout spacing.",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  "40": {
    $value: { value: 40, unit: "rem" },
    $type: "dimension",
    $description: "7XL layout spacing.",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  "50": {
    $value: { value: 50, unit: "rem" },
    $type: "dimension",
    $description: "8XL layout spacing.",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  "60": {
    $value: { value: 60, unit: "rem" },
    $type: "dimension",
    $description: "9XL layout spacing.",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  "70": {
    $value: { value: 70, unit: "rem" },
    $type: "dimension",
    $description: "10XL layout spacing.",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  "80": {
    $value: { value: 80, unit: "rem" },
    $type: "dimension",
    $description: "11XL layout spacing.",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  "90": {
    $value: { value: 90, unit: "rem" },
    $type: "dimension",
    $description: "12XL layout spacing.",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  "100": {
    $value: { value: 100, unit: "rem" },
    $type: "dimension",
    $description: "13XL layout spacing.",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
} as const satisfies TokenInterface;

export default tokens;
