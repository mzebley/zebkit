/**
 * Generative definition of the primitive palette (DTCG alignment decision D7):
 * one hue/saturation pair per family plus a single shared lightness ramp,
 * materialized into real color tokens by `tokens.ts` and into the palette SCSS
 * by `npm run generate:palette`. This file is the single source of truth that
 * the token module, the generated SCSS, the smart-mode global colors, and the
 * docs palette data all derive from.
 */

import type { ColorValue } from "@definitions/tokens";

export interface PaletteFamilyDefinition {
  /** Family name as it appears in CSS vars and token keys (e.g. `red`, `deepcurrent`). */
  name: string;
  /** HSL hue in degrees. */
  hue: number;
  /** HSL saturation in percent. */
  saturation: number;
}

export interface PaletteRampStep {
  /** Numeric scale step (50 → 950). */
  step: number;
  /** HSL lightness in percent. */
  lightness: number;
}

/**
 * The shared lightness ramp every family runs through. Steps ascend from the
 * near-white 50 to the near-black 950.
 */
export const PALETTE_RAMP: readonly PaletteRampStep[] = [
  { step: 50, lightness: 98 },
  { step: 100, lightness: 93 },
  { step: 200, lightness: 87 },
  { step: 300, lightness: 78 },
  { step: 400, lightness: 69 },
  { step: 500, lightness: 58 },
  { step: 600, lightness: 48 },
  { step: 700, lightness: 36 },
  { step: 800, lightness: 26 },
  { step: 900, lightness: 18 },
  { step: 950, lightness: 10 },
] as const;

/**
 * Every primitive color family: the vivid rainbow wheel first, then the
 * expressive / muted Zebkit families.
 */
export const PALETTE_FAMILIES: readonly PaletteFamilyDefinition[] = [
  // Rainbow primitives
  { name: 'red', hue: 0, saturation: 80 },
  { name: 'pink', hue: 340, saturation: 75 },
  { name: 'orange', hue: 28, saturation: 88 },
  { name: 'gold', hue: 40, saturation: 85 },
  { name: 'yellow', hue: 56, saturation: 85 },
  { name: 'lime', hue: 96, saturation: 65 },
  { name: 'green', hue: 140, saturation: 70 },
  { name: 'teal', hue: 170, saturation: 68 },
  { name: 'cyan', hue: 190, saturation: 72 },
  { name: 'blue', hue: 210, saturation: 78 },
  { name: 'indigo', hue: 243, saturation: 72 },
  { name: 'violet', hue: 268, saturation: 76 },

  // Expressive / Zebkit families
  { name: 'merlot', hue: 320, saturation: 62 },
  { name: 'butterfield', hue: 48, saturation: 72 },
  { name: 'mint', hue: 158, saturation: 42 },
  { name: 'sea', hue: 196, saturation: 36 },
  { name: 'dusk', hue: 220, saturation: 22 },
  { name: 'stone', hue: 40, saturation: 18 },
  { name: 'charcoal', hue: 210, saturation: 12 },
  { name: 'lavenderfield', hue: 258, saturation: 42 },
  { name: 'rosewater', hue: 352, saturation: 40 },
  { name: 'ember', hue: 16, saturation: 78 },
  { name: 'deepcurrent', hue: 224, saturation: 85 },
  { name: 'foxglove', hue: 298, saturation: 62 },
  { name: 'chestnut', hue: 26, saturation: 42 },
] as const;

export interface PaletteGlobalDefinition {
  /** Token key (e.g. `global-black`). */
  name: string;
  /** Literal CSS color value emitted verbatim. */
  value: string;
  $description: string;
}

/**
 * Global, scale-less colors. Order matters: the generated SCSS and the
 * smart-mode inline block both emit these in this order.
 */
export const PALETTE_GLOBALS: readonly PaletteGlobalDefinition[] = [
  {
    name: 'global-black',
    value: '#131313',
    $description: 'Global near-black for maximum-contrast ink on any canvas.',
  },
  {
    name: 'global-white',
    value: '#fefefe',
    $description: 'Global near-white for maximum-contrast canvas surfaces.',
  },
  {
    name: 'global-transparent',
    value: 'transparent',
    $description: 'Fully transparent color for surfaces that must not paint.',
  },
] as const;

/** Structured DTCG color value for a family at a ramp lightness — the materialized token value. */
export function paletteColorValue(
  family: PaletteFamilyDefinition,
  lightness: number
): ColorValue {
  return { colorSpace: "hsl", components: [family.hue, family.saturation, lightness] };
}

/**
 * Structured DTCG color value for a global. `transparent` materializes per
 * decision D8 (`srgb` 0,0,0 at alpha 0 — serialized back to the keyword);
 * hex literals carry their srgb components with the hex as fallback.
 */
export function globalColorValue(global: PaletteGlobalDefinition): ColorValue {
  if (global.value === "transparent") {
    return { colorSpace: "srgb", components: [0, 0, 0], alpha: 0 };
  }
  const match = global.value.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!match) {
    throw new Error(
      `Palette global '${global.name}' has unsupported literal '${global.value}' — expected a #rrggbb hex or 'transparent'.`
    );
  }
  return {
    colorSpace: "srgb",
    components: [
      parseInt(match[1], 16) / 255,
      parseInt(match[2], 16) / 255,
      parseInt(match[3], 16) / 255,
    ],
    hex: global.value,
  };
}

/** Token/CSS key for a family step (e.g. `red-500`). */
export function paletteStepName(family: PaletteFamilyDefinition, step: number): string {
  return `${family.name}-${step}`;
}
