import type { LayerName } from "@definitions/layers";
import { serializeColorValue, type TokenObject } from "@definitions/tokens";
import { z } from "zod";
import { tokenSchema } from "./token-schema";
import {
  PALETTE_FAMILIES,
  PALETTE_GLOBALS,
  PALETTE_RAMP,
  globalColorValue,
  paletteColorValue,
  paletteStepName,
} from "./palette-definition";

/**
 * Zebkit primitive palette color tokens (DTCG alignment decision D7).
 *
 * Materialized from the generative definition in `palette-definition.ts`:
 * every family × ramp step becomes a real `color` token (`red-500`,
 * `deepcurrent-950`, …) plus the three scale-less globals. These are the
 * closed-world targets `{color.*}` references resolve against.
 */
export const key = "color";
export const layer: LayerName = "theme";

/**
 * The palette's CSS custom properties are emitted by the generated palette
 * SCSS (unlayered, var-composed `hsl()` ramps with runtime
 * `--zbk-color-<family>-hue`/`-saturation` knobs), never by the token
 * converter. This module exists for reference validation, interchange, and as
 * the source the SCSS generates from.
 */
export const cssEmission = "external";

export type PaletteTokenSchema = z.infer<typeof tokenSchema>;

function buildPaletteTokens(): Record<string, TokenObject> {
  const entries: Record<string, TokenObject> = {};
  for (const family of PALETTE_FAMILIES) {
    for (const { step, lightness } of PALETTE_RAMP) {
      entries[paletteStepName(family, step)] = {
        $value: paletteColorValue(family, lightness),
        $type: "color",
        $description: `Primitive ${family.name} ramp, step ${step} (${lightness}% lightness).`,
      };
    }
  }
  for (const global of PALETTE_GLOBALS) {
    const value = globalColorValue(global);
    // The structured value must round-trip to the exact literal the generated
    // SCSS emits — a mismatch means the definition and serializer disagree.
    if (serializeColorValue(value) !== global.value) {
      throw new Error(
        `Palette global '${global.name}': structured value serializes to ` +
          `'${serializeColorValue(value)}' but the SCSS emits '${global.value}'.`
      );
    }
    entries[global.name] = {
      $value: value,
      $type: "color",
      $description: global.$description,
    };
  }
  return entries;
}

const tokens = buildPaletteTokens() as PaletteTokenSchema;

export default tokens;
