import type { LayerName } from "@definitions/layers";
import { z } from "zod";
import { tokenSchema } from "./token-schema";

/**
 * Zebkit positive color design tokens. 
 */
export const key = "positive";
export const layer: LayerName = "base";

export type PositiveTokenSchema = z.infer<typeof tokenSchema>;

const tokens = {
  // Canvas: base positive surfaces
  "canvas": {
    value: "{color.green-500}",
    type: "color",
    description: "Base positive canvas color for primary surfaces."
  },
  "canvas-soft": {
    value: "{color.green-50}",
    type: "color",
    description: "Soft positive canvas color for lightly tinted surfaces."
  },
  "canvas-muted": {
    value: "{color.green-100}",
    type: "color",
    description: "Muted positive canvas color for low-emphasis surfaces."
  },
  "canvas-strong": {
    value: "{color.green-600}",
    type: "color",
    description: "Strong positive canvas color for high-emphasis surfaces."
  },

  // Canvas (inverse): positive surfaces in inverse contexts
  "canvas-inverse": {
    value: "{color.green-400}",
    type: "color",
    description: "Base inverse positive canvas color for surfaces on dark or inverted contexts."
  },
  "canvas-inverse-soft": {
    value: "{color.green-900}",
    type: "color",
    description: "Soft inverse positive canvas color for lightly tinted surfaces in inverse contexts."
  },
  "canvas-inverse-muted": {
    value: "{color.green-800}",
    type: "color",
    description: "Muted inverse positive canvas color for low-emphasis surfaces in inverse contexts."
  },
  "canvas-inverse-strong": {
    value: "{color.green-300}",
    type: "color",
    description: "Strong inverse positive canvas color for high-emphasis surfaces in inverse contexts."
  },

  // Ink: positive text and icon colors
  "ink": {
    value: "{color.green-700}",
    type: "color",
    description: "Base positive ink color for text and icons on neutral or light canvases."
  },
  "ink-soft": {
    value: "{color.green-500}",
    type: "color",
    description: "Soft positive ink color for lower-emphasis text and icons."
  },
  "ink-muted": {
    value: "{color.green-400}",
    type: "color",
    description: "Muted positive ink color for subtle or secondary text and icons."
  },

  // Ink (inverse): positive text and icon colors on inverse canvases
  "ink-inverse": {
    value: "{color.green-300}",
    type: "color",
    description: "Base inverse positive ink color for text and icons on inverse or dark canvases."
  },
  "ink-inverse-soft": {
    value: "{color.green-400}",
    type: "color",
    description: "Soft inverse positive ink color for lower-emphasis text and icons on inverse canvases."
  },
  "ink-inverse-muted": {
    value: "{color.green-500}",
    type: "color",
    description: "Muted inverse positive ink color for subtle text and icons on inverse canvases."
  },

  // Border: positive border, outline, and divider colors
  "border": {
    value: "{color.green-500}",
    type: "color",
    description: "Base positive border color for outlines, strokes, and dividers."
  },
  "border-soft": {
    value: "{color.green-200}",
    type: "color",
    description: "Soft positive border color for low-emphasis outlines and dividers."
  },
  "border-muted": {
    value: "{color.green-300}",
    type: "color",
    description: "Muted positive border color for subtle outlines and dividers."
  },
  "border-strong": {
    value: "{color.green-600}",
    type: "color",
    description: "Strong positive border color for high-emphasis outlines and dividers."
  },

  // Border (inverse): positive borders in inverse contexts
  "border-inverse": {
    value: "{color.green-500}",
    type: "color",
    description: "Base inverse positive border color for outlines and dividers on inverse canvases."
  },
  "border-inverse-soft": {
    value: "{color.green-800}",
    type: "color",
    description: "Soft inverse positive border color for low-emphasis outlines on inverse canvases."
  },
  "border-inverse-muted": {
    value: "{color.green-700}",
    type: "color",
    description: "Muted inverse positive border color for subtle outlines on inverse canvases."
  },
  "border-inverse-strong": {
    value: "{color.green-400}",
    type: "color",
    description: "Strong inverse positive border color for high-emphasis outlines on inverse canvases."
  }
} as const satisfies PositiveTokenSchema;

export default tokens;