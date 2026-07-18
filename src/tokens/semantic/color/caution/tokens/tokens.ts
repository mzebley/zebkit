import type { LayerName } from "@definitions/layers";
import { z } from "zod";
import { tokenSchema } from "./token-schema";

/**
 * Zebkit caution color design tokens.
 */
export const key = "caution";
export const layer: LayerName = "base";

export type CautionTokenSchema = z.infer<typeof tokenSchema>;

const tokens = {
  // Canvas: base caution surfaces
  "canvas": {
    $value: "{color.gold-500}",
    $type: "color",
    $description: "Base caution canvas color for primary surfaces."
  },
  "canvas-subtle": {
    $value: "{color.gold-50}",
    $type: "color",
    $description: "Subtle caution canvas color for the least-prominent, lightly tinted surfaces."
  },
  "canvas-muted": {
    $value: "{color.gold-100}",
    $type: "color",
    $description: "Muted caution canvas color for low-emphasis, recessed surfaces."
  },
  "canvas-emphasis": {
    $value: "{color.gold-600}",
    $type: "color",
    $description: "Emphasis caution canvas color for high-prominence surfaces."
  },

  // Canvas (inverse): caution surfaces in inverse contexts
  "canvas-inverse": {
    $value: "{color.gold-400}",
    $type: "color",
    $description: "Base inverse caution canvas color for surfaces on dark or inverted contexts."
  },
  "canvas-inverse-subtle": {
    $value: "{color.gold-900}",
    $type: "color",
    $description: "Subtle inverse caution canvas color for the least-prominent surfaces in inverse contexts."
  },
  "canvas-inverse-muted": {
    $value: "{color.gold-800}",
    $type: "color",
    $description: "Muted inverse caution canvas color for low-emphasis surfaces in inverse contexts."
  },
  "canvas-inverse-emphasis": {
    $value: "{color.gold-300}",
    $type: "color",
    $description: "Emphasis inverse caution canvas color for high-prominence surfaces in inverse contexts."
  },

  // Ink: caution text and icon colors
  "ink": {
    $value: "{color.gold-700}",
    $type: "color",
    $description: "Base caution ink color for body text and icons on neutral or light canvases."
  },
  "ink-subtle": {
    $value: "{color.gold-400}",
    $type: "color",
    $description: "Subtle caution ink color for the least-prominent, tertiary text and icons."
  },
  "ink-muted": {
    $value: "{color.gold-500}",
    $type: "color",
    $description: "Muted caution ink color for secondary text and icons."
  },
  "ink-emphasis": {
    $value: "{color.gold-800}",
    $type: "color",
    $description: "Emphasis caution ink color for high-prominence text and icons."
  },

  // Ink (inverse): caution text and icon colors on inverse canvases
  "ink-inverse": {
    $value: "{color.gold-300}",
    $type: "color",
    $description: "Base inverse caution ink color for body text and icons on inverse or dark canvases."
  },
  "ink-inverse-subtle": {
    $value: "{color.gold-500}",
    $type: "color",
    $description: "Subtle inverse caution ink color for the least-prominent text and icons on inverse canvases."
  },
  "ink-inverse-muted": {
    $value: "{color.gold-400}",
    $type: "color",
    $description: "Muted inverse caution ink color for secondary text and icons on inverse canvases."
  },
  "ink-inverse-emphasis": {
    $value: "{color.gold-200}",
    $type: "color",
    $description: "Emphasis inverse caution ink color for high-prominence text on inverse canvases."
  },

  // Border: caution border, outline, and divider colors
  "border": {
    $value: "{color.gold-500}",
    $type: "color",
    $description: "Base caution border color for outlines, strokes, and dividers."
  },
  "border-subtle": {
    $value: "{color.gold-200}",
    $type: "color",
    $description: "Subtle caution border color for the least-prominent outlines and dividers."
  },
  "border-muted": {
    $value: "{color.gold-300}",
    $type: "color",
    $description: "Muted caution border color for low-emphasis outlines and dividers."
  },
  "border-emphasis": {
    $value: "{color.gold-600}",
    $type: "color",
    $description: "Emphasis caution border color for high-prominence outlines and dividers."
  },

  // Border (inverse): caution borders in inverse contexts
  "border-inverse": {
    $value: "{color.gold-500}",
    $type: "color",
    $description: "Base inverse caution border color for outlines and dividers on inverse canvases."
  },
  "border-inverse-subtle": {
    $value: "{color.gold-800}",
    $type: "color",
    $description: "Subtle inverse caution border color for the least-prominent outlines on inverse canvases."
  },
  "border-inverse-muted": {
    $value: "{color.gold-700}",
    $type: "color",
    $description: "Muted inverse caution border color for low-emphasis outlines on inverse canvases."
  },
  "border-inverse-emphasis": {
    $value: "{color.gold-400}",
    $type: "color",
    $description: "Emphasis inverse caution border color for high-prominence outlines on inverse canvases."
  }
} as const satisfies CautionTokenSchema;

export default tokens;
