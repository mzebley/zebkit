import type { LayerName } from "@definitions/layers";
import { z } from "zod";
import { tokenSchema } from "./token-schema";

/**
 * Zebkit info color design tokens. 
 */
export const key = "info";
export const layer: LayerName = "base";

export type InfoTokenSchema = z.infer<typeof tokenSchema>;

const tokens = {
  // Canvas: base info surfaces
  "canvas": {
    value: "{color.dusk-50}",
    type: "color",
    description: "Base info canvas color for primary surfaces."
  },
  "canvas-soft": {
    value: "",
    type: "color",
    description: "Soft info canvas color for lightly tinted surfaces."
  },
  "canvas-muted": {
    value: "",
    type: "color",
    description: "Muted info canvas color for low-emphasis surfaces."
  },
  "canvas-strong": {
    value: "",
    type: "color",
    description: "Strong info canvas color for high-emphasis surfaces."
  },

  // Canvas (inverse): info surfaces in inverse contexts
  "canvas-inverse": {
    value: "",
    type: "color",
    description: "Base inverse info canvas color for surfaces on dark or inverted contexts."
  },
  "canvas-inverse-soft": {
    value: "",
    type: "color",
    description: "Soft inverse info canvas color for lightly tinted surfaces in inverse contexts."
  },
  "canvas-inverse-muted": {
    value: "",
    type: "color",
    description: "Muted inverse info canvas color for low-emphasis surfaces in inverse contexts."
  },
  "canvas-inverse-strong": {
    value: "",
    type: "color",
    description: "Strong inverse info canvas color for high-emphasis surfaces in inverse contexts."
  },

  // Ink: info text and icon colors
  "ink": {
    value: "",
    type: "color",
    description: "Base info ink color for text and icons on neutral or light canvases."
  },
  "ink-soft": {
    value: "",
    type: "color",
    description: "Soft info ink color for lower-emphasis text and icons."
  },
  "ink-muted": {
    value: "",
    type: "color",
    description: "Muted info ink color for subtle or secondary text and icons."
  },
  "ink-strong": {
    value: "",
    type: "color",
    description: "Strong info ink color for high-emphasis text and icons."
  },

  // Ink (inverse): info text and icon colors on inverse canvases
  "ink-inverse": {
    value: "",
    type: "color",
    description: "Base inverse info ink color for text and icons on inverse or dark canvases."
  },
  "ink-inverse-soft": {
    value: "",
    type: "color",
    description: "Soft inverse info ink color for lower-emphasis text and icons on inverse canvases."
  },
  "ink-inverse-muted": {
    value: "",
    type: "color",
    description: "Muted inverse info ink color for subtle text and icons on inverse canvases."
  },
  "ink-inverse-strong": {
    value: "",
    type: "color",
    description: "Strong inverse info ink color for high-emphasis text and icons on inverse canvases."
  },

  // Border: info border, outline, and divider colors
  "border": {
    value: "",
    type: "color",
    description: "Base info border color for outlines, strokes, and dividers."
  },
  "border-soft": {
    value: "",
    type: "color",
    description: "Soft info border color for low-emphasis outlines and dividers."
  },
  "border-muted": {
    value: "",
    type: "color",
    description: "Muted info border color for subtle outlines and dividers."
  },
  "border-strong": {
    value: "",
    type: "color",
    description: "Strong info border color for high-emphasis outlines and dividers."
  },

  // Border (inverse): info borders in inverse contexts
  "border-inverse": {
    value: "",
    type: "color",
    description: "Base inverse info border color for outlines and dividers on inverse canvases."
  },
  "border-inverse-soft": {
    value: "",
    type: "color",
    description: "Soft inverse info border color for low-emphasis outlines on inverse canvases."
  },
  "border-inverse-muted": {
    value: "",
    type: "color",
    description: "Muted inverse info border color for subtle outlines on inverse canvases."
  },
  "border-inverse-strong": {
    value: "",
    type: "color",
    description: "Strong inverse info border color for high-emphasis outlines on inverse canvases."
  }
} as const satisfies InfoTokenSchema;

export default tokens;