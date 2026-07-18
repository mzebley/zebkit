import type { LayerName } from "@definitions/layers";
import { z } from "zod";
import { tokenSchema } from "./token-schema";

export const key = "breakpoint";
export const layer: LayerName = "base";
export type BreakpointTokens = z.infer<typeof tokenSchema>;

// Responsive breakpoint scale. These min-width thresholds drive the `tablet:`,
// `desktop:` … responsive utility variants and are the single source of truth
// for the breakpoint set (the build injects them into SCSS; the docs/JS can opt
// in to `--zbk-breakpoint-*` vars via `extendedTokens.emitBreakpointVars`).
// Disable a breakpoint for a theme by setting its `value` to `null`.
const tokens = {
  "tablet": {
    $value: { value: 40, unit: "rem" },
    $type: "dimension",
    $description: "Small tablets and large phones in landscape (640px).",
  },
  "tablet-lg": {
    $value: { value: 50, unit: "rem" },
    $type: "dimension",
    $description: "Large tablets (800px).",
  },
  "desktop": {
    $value: { value: 70, unit: "rem" },
    $type: "dimension",
    $description: "Small desktops and laptops (1120px).",
  },
  "desktop-lg": {
    $value: { value: 80, unit: "rem" },
    $type: "dimension",
    $description: "Large desktops (1280px).",
  },
  "widescreen": {
    $value: { value: 100, unit: "rem" },
    $type: "dimension",
    $description: "Widescreen and ultra-wide displays (1600px).",
  },
} as const satisfies BreakpointTokens;

export default tokens;
