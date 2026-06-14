import type { LayerName } from "@definitions/layers";
import { z } from "zod";
import { tokenSchema } from "./token-schema";

/**
 * Zebkit action color design tokens. 
 */
export const key = "action";
export const layer: LayerName = "base";

export type ActionTokenSchema = z.infer<typeof tokenSchema>;

const tokens = {
  // Canvas: base action surfaces
  "canvas": {
    value: "{color.blue-500}",
    type: "color",
    description: "Base action canvas color for primary surfaces."
  },
  "canvas-soft": {
    value: "{color.blue-50}",
    type: "color",
    description: "Soft action canvas color for lightly tinted surfaces."
  },
  "canvas-muted": {
    value: "{color.blue-100}",
    type: "color",
    description: "Muted action canvas color for low-emphasis surfaces."
  },
  "canvas-strong": {
    value: "{color.blue-600}",
    type: "color",
    description: "Strong action canvas color for high-emphasis surfaces."
  },

  // Canvas (inverse): action surfaces in inverse contexts
  "canvas-inverse": {
    value: "{color.blue-400}",
    type: "color",
    description: "Base inverse action canvas color for surfaces on dark or inverted contexts."
  },
  "canvas-inverse-soft": {
    value: "{color.blue-900}",
    type: "color",
    description: "Soft inverse action canvas color for lightly tinted surfaces in inverse contexts."
  },
  "canvas-inverse-muted": {
    value: "{color.blue-800}",
    type: "color",
    description: "Muted inverse action canvas color for low-emphasis surfaces in inverse contexts."
  },
  "canvas-inverse-strong": {
    value: "{color.blue-300}",
    type: "color",
    description: "Strong inverse action canvas color for high-emphasis surfaces in inverse contexts."
  },

  // Ink: action text and icon colors
  "ink": {
    value: "{color.blue-700}",
    type: "color",
    description: "Base action ink color for text and icons on neutral or light canvases."
  },
  "ink-soft": {
    value: "{color.blue-500}",
    type: "color",
    description: "Soft action ink color for lower-emphasis text and icons."
  },
  "ink-muted": {
    value: "{color.blue-400}",
    type: "color",
    description: "Muted action ink color for subtle or secondary text and icons."
  },

  // Ink (inverse): action text and icon colors on inverse canvases
  "ink-inverse": {
    value: "{color.blue-300}",
    type: "color",
    description: "Base inverse action ink color for text and icons on inverse or dark canvases."
  },
  "ink-inverse-soft": {
    value: "{color.blue-400}",
    type: "color",
    description: "Soft inverse action ink color for lower-emphasis text and icons on inverse canvases."
  },
  "ink-inverse-muted": {
    value: "{color.blue-500}",
    type: "color",
    description: "Muted inverse action ink color for subtle text and icons on inverse canvases."
  },

  // Border: action border, outline, and divider colors
  "border": {
    value: "{color.blue-500}",
    type: "color",
    description: "Base action border color for outlines, strokes, and dividers."
  },
  "border-soft": {
    value: "{color.blue-200}",
    type: "color",
    description: "Soft action border color for low-emphasis outlines and dividers."
  },
  "border-muted": {
    value: "{color.blue-300}",
    type: "color",
    description: "Muted action border color for subtle outlines and dividers."
  },
  "border-strong": {
    value: "{color.blue-600}",
    type: "color",
    description: "Strong action border color for high-emphasis outlines and dividers."
  },

  // Border (inverse): action borders in inverse contexts
  "border-inverse": {
    value: "{color.blue-500}",
    type: "color",
    description: "Base inverse action border color for outlines and dividers on inverse canvases."
  },
  "border-inverse-soft": {
    value: "{color.blue-800}",
    type: "color",
    description: "Soft inverse action border color for low-emphasis outlines on inverse canvases."
  },
  "border-inverse-muted": {
    value: "{color.blue-700}",
    type: "color",
    description: "Muted inverse action border color for subtle outlines on inverse canvases."
  },
  "border-inverse-strong": {
    value: "{color.blue-400}",
    type: "color",
    description: "Strong inverse action border color for high-emphasis outlines on inverse canvases."
  }
} as const satisfies ActionTokenSchema;

export default tokens;