/**
 * Palette keys that exist in the compiled CSS.
 * These map directly to primitives like:
 *   --<prefix>-color-red-50
 *   --<prefix>-color-merlot-500
 *
 * This file is intentionally generated from a small set of
 * families and scale steps so that updates to the palette
 * don't require maintaining a huge static list.
 */

/**
 * All primitive color families exposed as CSS variables.
 * Keep this in sync with the SCSS primitiveColor calls.
 */
const paletteFamilies = [
  // Rainbow primitives
  'red',
  'pink',
  'orange',
  'gold',
  'yellow',
  'lime',
  'green',
  'teal',
  'cyan',
  'blue',
  'indigo',
  'violet',

  // Expressive / Zebkit families
  'merlot',
  'butterfield',
  'mint',
  'sea',
  'dusk',
  'stone',
  'charcoal',
  'lavenderfield',
  'rosewater',
  'ember',
  'deepcurrent',
  'foxglove',
  'chestnut',
] as const;

/**
 * The numeric scale steps for each family.
 * These correspond to the HSL lightness ramp in the SCSS
 * (50 → 950).
 */
const paletteSteps = [
  50,
  100,
  200,
  300,
  400,
  500,
  600,
  700,
  800,
  900,
  950,
] as const;

type PaletteFamily = (typeof paletteFamilies)[number];
type PaletteStep = (typeof paletteSteps)[number];

/**
 * Utility to build the key used by CSS variables and tokens.
 */
const buildPaletteKey = (family: PaletteFamily, step: PaletteStep): string =>
  `${family}-${step}`;

/**
 * Palette keys that exist in the compiled CSS.
 * Non-editable, but referenceable.
 *
 * Example keys:
 *   "red-50"
 *   "blue-700"
 *   "merlot-500"
 *   "deepcurrent-950"
 */
const generatedPaletteMap: string[] = [];

for (const family of paletteFamilies) {
  for (const step of paletteSteps) {
    generatedPaletteMap.push(buildPaletteKey(family, step));
  }
}

// Global / non-scaled colors that are also emitted as CSS variables.
generatedPaletteMap.push('global-transparent', 'global-white', 'global-black');

export const paletteMap: string[] = generatedPaletteMap;
