import type { LayerName } from "@definitions/layers";
import { z } from "zod";
import { tokenSchema } from "./token-schema";

/**
 * Zebkit critical color design tokens. 
 */
export const key = "critical";
export const layer: LayerName = "base";

export type CriticalTokenSchema = z.infer<typeof tokenSchema>;

const tokens = {
  // Canvas: base critical surfaces
  "canvas": {
    value: "{color.dusk-50}",
    type: "color",
    description: "Base critical canvas color for primary surfaces."
  },
  "canvas-soft": {
    value: "",
    type: "color",
    description: "Soft critical canvas color for lightly tinted surfaces."
  },
  "canvas-muted": {
    value: "",
    type: "color",
    description: "Muted critical canvas color for low-emphasis surfaces."
  },
  "canvas-strong": {
    value: "",
    type: "color",
    description: "Strong critical canvas color for high-emphasis surfaces."
  },

  // Canvas (inverse): critical surfaces in inverse contexts
  "canvas-inverse": {
    value: "",
    type: "color",
    description: "Base inverse critical canvas color for surfaces on dark or inverted contexts."
  },
  "canvas-inverse-soft": {
    value: "",
    type: "color",
    description: "Soft inverse critical canvas color for lightly tinted surfaces in inverse contexts."
  },
  "canvas-inverse-muted": {
    value: "",
    type: "color",
    description: "Muted inverse critical canvas color for low-emphasis surfaces in inverse contexts."
  },
  "canvas-inverse-strong": {
    value: "",
    type: "color",
    description: "Strong inverse critical canvas color for high-emphasis surfaces in inverse contexts."
  },

  // Ink: critical text and icon colors
  "ink": {
    value: "",
    type: "color",
    description: "Base critical ink color for text and icons on neutral or light canvases."
  },
  "ink-soft": {
    value: "",
    type: "color",
    description: "Soft critical ink color for lower-emphasis text and icons."
  },
  "ink-muted": {
    value: "",
    type: "color",
    description: "Muted critical ink color for subtle or secondary text and icons."
  },
  "ink-strong": {
    value: "",
    type: "color",
    description: "Strong critical ink color for high-emphasis text and icons."
  },

  // Ink (inverse): critical text and icon colors on inverse canvases
  "ink-inverse": {
    value: "",
    type: "color",
    description: "Base inverse critical ink color for text and icons on inverse or dark canvases."
  },
  "ink-inverse-soft": {
    value: "",
    type: "color",
    description: "Soft inverse critical ink color for lower-emphasis text and icons on inverse canvases."
  },
  "ink-inverse-muted": {
    value: "",
    type: "color",
    description: "Muted inverse critical ink color for subtle text and icons on inverse canvases."
  },
  "ink-inverse-strong": {
    value: "",
    type: "color",
    description: "Strong inverse critical ink color for high-emphasis text and icons on inverse canvases."
  },

  // Border: critical border, outline, and divider colors
  "border": {
    value: "",
    type: "color",
    description: "Base critical border color for outlines, strokes, and dividers."
  },
  "border-soft": {
    value: "",
    type: "color",
    description: "Soft critical border color for low-emphasis outlines and dividers."
  },
  "border-muted": {
    value: "",
    type: "color",
    description: "Muted critical border color for subtle outlines and dividers."
  },
  "border-strong": {
    value: "",
    type: "color",
    description: "Strong critical border color for high-emphasis outlines and dividers."
  },

  // Border (inverse): critical borders in inverse contexts
  "border-inverse": {
    value: "",
    type: "color",
    description: "Base inverse critical border color for outlines and dividers on inverse canvases."
  },
  "border-inverse-soft": {
    value: "",
    type: "color",
    description: "Soft inverse critical border color for low-emphasis outlines on inverse canvases."
  },
  "border-inverse-muted": {
    value: "",
    type: "color",
    description: "Muted inverse critical border color for subtle outlines on inverse canvases."
  },
  "border-inverse-strong": {
    value: "",
    type: "color",
    description: "Strong inverse critical border color for high-emphasis outlines on inverse canvases."
  }
} as const satisfies CriticalTokenSchema;

export default tokens;