import type { LayerName } from "@definitions/layers";
import {
  serializeShadowValue,
  type ColorValue,
  type ShadowValue,
  type TokenObject,
} from "@definitions/tokens";
import { z } from "zod";
import { tokenSchema } from "./token-schema";

export const key = "elevation";
export const layer: LayerName = "base";
export type ElevationTokens = z.infer<typeof tokenSchema>;

/** srgb black at the given alpha — the only color the elevation ramp uses. */
const black = (alpha: number): ColorValue => ({
  colorSpace: "srgb",
  components: [0, 0, 0],
  alpha,
});

/** One shadow layer authored in px offsets/blur/spread over black-at-`alpha`. */
const sh = (
  offsetX: number,
  offsetY: number,
  blur: number,
  spread: number,
  alpha: number,
  inset = false
): ShadowValue => ({
  color: black(alpha),
  offsetX: { value: offsetX, unit: "px" },
  offsetY: { value: offsetY, unit: "px" },
  blur: { value: blur, unit: "px" },
  spread: { value: spread, unit: "px" },
  ...(inset ? { inset: true } : {}),
});

/**
 * Structured shadow tokens (DTCG alignment Phase 2c, decision D5).
 *
 * Each `$value` is an array of shadow layers; the empty array is
 * `box-shadow: none`. The `css` strings are the byte-for-byte output the golden
 * baseline pins — `buildElevationTokens` asserts the serializer reproduces each
 * one, so the structured form and the emitted CSS can never silently diverge.
 */
const SPEC: Record<string, { value: ShadowValue[]; css: string; description: string }> = {
  "none": { value: [], css: "none", description: "No shadow." },
  "xs": {
    value: [sh(0, 1, 2, 0, 0.05)],
    css: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    description: "Extra-small shadow for subtle elevation.",
  },
  "sm": {
    value: [sh(0, 1, 3, 0, 0.1), sh(0, 1, 2, -1, 0.1)],
    css: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
    description: "Small shadow for low elevation.",
  },
  "md": {
    value: [sh(0, 4, 6, -1, 0.1), sh(0, 2, 4, -2, 0.1)],
    css: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
    description: "Medium shadow for moderate elevation.",
  },
  "lg": {
    value: [sh(0, 10, 15, -3, 0.1), sh(0, 4, 6, -4, 0.1)],
    css: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
    description: "Large shadow for high elevation.",
  },
  "xl": {
    value: [sh(0, 20, 25, -5, 0.1), sh(0, 8, 10, -6, 0.1)],
    css: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
    description: "Extra-large shadow for very high elevation.",
  },
  "2xl": {
    value: [sh(0, 25, 50, -12, 0.25)],
    css: "0 25px 50px -12px rgb(0 0 0 / 0.25)",
    description: "2XL shadow for maximum elevation.",
  },
  "inner": {
    value: [sh(0, 2, 4, 0, 0.05, true)],
    css: "inset 0 2px 4px 0 rgb(0 0 0 / 0.05)",
    description: "Inner shadow for inset/pressed effect.",
  },
  "inner-sm": {
    value: [sh(0, 1, 2, 0, 0.05, true)],
    css: "inset 0 1px 2px 0 rgb(0 0 0 / 0.05)",
    description: "Small inner shadow.",
  },
  "inner-lg": {
    value: [sh(0, 4, 6, 0, 0.1, true)],
    css: "inset 0 4px 6px 0 rgb(0 0 0 / 0.1)",
    description: "Large inner shadow.",
  },
};

function buildElevationTokens(): Record<string, TokenObject> {
  const entries: Record<string, TokenObject> = {};
  for (const [name, spec] of Object.entries(SPEC)) {
    const serialized = serializeShadowValue(spec.value);
    if (serialized !== spec.css) {
      throw new Error(
        `Elevation '${name}': structured value serializes to '${serialized}' ` +
          `but the ramp emits '${spec.css}'.`
      );
    }
    entries[name] = {
      $value: spec.value,
      $type: "shadow",
      $description: spec.description,
    };
  }
  return entries;
}

const tokens = buildElevationTokens() as ElevationTokens;

export default tokens;
