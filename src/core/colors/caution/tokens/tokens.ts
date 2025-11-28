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
    value: "{color.dusk-50}",
    type: "color",
    description: "Base caution canvas color for primary surfaces."
  },
  "canvas-soft": {
    value: "",
    type: "color",
    description: "Soft caution canvas color for lightly tinted surfaces."
  },
  "canvas-muted": {
    value: "",
    type: "color",
    description: "Muted caution canvas color for low-emphasis surfaces."
  },
  "canvas-strong": {
    value: "",
    type: "color",
    description: "Strong caution canvas color for high-emphasis surfaces."
  },

  // Canvas (inverse): caution surfaces in inverse contexts
  "canvas-inverse": {
    value: "",
    type: "color",
    description: "Base inverse caution canvas color for surfaces on dark or inverted contexts."
  },
  "canvas-inverse-soft": {
    value: "",
    type: "color",
    description: "Soft inverse caution canvas color for lightly tinted surfaces in inverse contexts."
  },
  "canvas-inverse-muted": {
    value: "",
    type: "color",
    description: "Muted inverse caution canvas color for low-emphasis surfaces in inverse contexts."
  },
  "canvas-inverse-strong": {
    value: "",
    type: "color",
    description: "Strong inverse caution canvas color for high-emphasis surfaces in inverse contexts."
  },

  // Ink: caution text and icon colors
  "ink": {
    value: "",
    type: "color",
    description: "Base caution ink color for text and icons on neutral or light canvases."
  },
  "ink-soft": {
    value: "",
    type: "color",
    description: "Soft caution ink color for lower-emphasis text and icons."
  },
  "ink-muted": {
    value: "",
    type: "color",
    description: "Muted caution ink color for subtle or secondary text and icons."
  },
  "ink-strong": {
    value: "",
    type: "color",
    description: "Strong caution ink color for high-emphasis text and icons."
  },

  // Ink (inverse): caution text and icon colors on inverse canvases
  "ink-inverse": {
    value: "",
    type: "color",
    description: "Base inverse caution ink color for text and icons on inverse or dark canvases."
  },
  "ink-inverse-soft": {
    value: "",
    type: "color",
    description: "Soft inverse caution ink color for lower-emphasis text and icons on inverse canvases."
  },
  "ink-inverse-muted": {
    value: "",
    type: "color",
    description: "Muted inverse caution ink color for subtle text and icons on inverse canvases."
  },
  "ink-inverse-strong": {
    value: "",
    type: "color",
    description: "Strong inverse caution ink color for high-emphasis text and icons on inverse canvases."
  },

  // Border: caution border, outline, and divider colors
  "border": {
    value: "",
    type: "color",
    description: "Base caution border color for outlines, strokes, and dividers."
  },
  "border-soft": {
    value: "",
    type: "color",
    description: "Soft caution border color for low-emphasis outlines and dividers."
  },
  "border-muted": {
    value: "",
    type: "color",
    description: "Muted caution border color for subtle outlines and dividers."
  },
  "border-strong": {
    value: "",
    type: "color",
    description: "Strong caution border color for high-emphasis outlines and dividers."
  },

  // Border (inverse): caution borders in inverse contexts
  "border-inverse": {
    value: "",
    type: "color",
    description: "Base inverse caution border color for outlines and dividers on inverse canvases."
  },
  "border-inverse-soft": {
    value: "",
    type: "color",
    description: "Soft inverse caution border color for low-emphasis outlines on inverse canvases."
  },
  "border-inverse-muted": {
    value: "",
    type: "color",
    description: "Muted inverse caution border color for subtle outlines on inverse canvases."
  },
  "border-inverse-strong": {
    value: "",
    type: "color",
    description: "Strong inverse caution border color for high-emphasis outlines on inverse canvases."
  }
} as const satisfies CautionTokenSchema;

export default tokens;