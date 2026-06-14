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
    value: "{color.cyan-500}",
    type: "color",
    description: "Base info canvas color for primary surfaces."
  },
  "canvas-soft": {
    value: "{color.cyan-50}",
    type: "color",
    description: "Soft info canvas color for lightly tinted surfaces."
  },
  "canvas-muted": {
    value: "{color.cyan-100}",
    type: "color",
    description: "Muted info canvas color for low-emphasis surfaces."
  },
  "canvas-strong": {
    value: "{color.cyan-600}",
    type: "color",
    description: "Strong info canvas color for high-emphasis surfaces."
  },

  // Canvas (inverse): info surfaces in inverse contexts
  "canvas-inverse": {
    value: "{color.cyan-400}",
    type: "color",
    description: "Base inverse info canvas color for surfaces on dark or inverted contexts."
  },
  "canvas-inverse-soft": {
    value: "{color.cyan-900}",
    type: "color",
    description: "Soft inverse info canvas color for lightly tinted surfaces in inverse contexts."
  },
  "canvas-inverse-muted": {
    value: "{color.cyan-800}",
    type: "color",
    description: "Muted inverse info canvas color for low-emphasis surfaces in inverse contexts."
  },
  "canvas-inverse-strong": {
    value: "{color.cyan-300}",
    type: "color",
    description: "Strong inverse info canvas color for high-emphasis surfaces in inverse contexts."
  },

  // Ink: info text and icon colors
  "ink": {
    value: "{color.cyan-700}",
    type: "color",
    description: "Base info ink color for text and icons on neutral or light canvases."
  },
  "ink-soft": {
    value: "{color.cyan-500}",
    type: "color",
    description: "Soft info ink color for lower-emphasis text and icons."
  },
  "ink-muted": {
    value: "{color.cyan-400}",
    type: "color",
    description: "Muted info ink color for subtle or secondary text and icons."
  },

  // Ink (inverse): info text and icon colors on inverse canvases
  "ink-inverse": {
    value: "{color.cyan-300}",
    type: "color",
    description: "Base inverse info ink color for text and icons on inverse or dark canvases."
  },
  "ink-inverse-soft": {
    value: "{color.cyan-400}",
    type: "color",
    description: "Soft inverse info ink color for lower-emphasis text and icons on inverse canvases."
  },
  "ink-inverse-muted": {
    value: "{color.cyan-500}",
    type: "color",
    description: "Muted inverse info ink color for subtle text and icons on inverse canvases."
  },

  // Border: info border, outline, and divider colors
  "border": {
    value: "{color.cyan-500}",
    type: "color",
    description: "Base info border color for outlines, strokes, and dividers."
  },
  "border-soft": {
    value: "{color.cyan-200}",
    type: "color",
    description: "Soft info border color for low-emphasis outlines and dividers."
  },
  "border-muted": {
    value: "{color.cyan-300}",
    type: "color",
    description: "Muted info border color for subtle outlines and dividers."
  },
  "border-strong": {
    value: "{color.cyan-600}",
    type: "color",
    description: "Strong info border color for high-emphasis outlines and dividers."
  },

  // Border (inverse): info borders in inverse contexts
  "border-inverse": {
    value: "{color.cyan-500}",
    type: "color",
    description: "Base inverse info border color for outlines and dividers on inverse canvases."
  },
  "border-inverse-soft": {
    value: "{color.cyan-800}",
    type: "color",
    description: "Soft inverse info border color for low-emphasis outlines on inverse canvases."
  },
  "border-inverse-muted": {
    value: "{color.cyan-700}",
    type: "color",
    description: "Muted inverse info border color for subtle outlines on inverse canvases."
  },
  "border-inverse-strong": {
    value: "{color.cyan-400}",
    type: "color",
    description: "Strong inverse info border color for high-emphasis outlines on inverse canvases."
  }
} as const satisfies InfoTokenSchema;

export default tokens;