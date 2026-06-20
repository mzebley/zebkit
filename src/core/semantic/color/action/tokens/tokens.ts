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
  "canvas-subtle": {
    value: "{color.blue-50}",
    type: "color",
    description: "Subtle action canvas color for the least-prominent, lightly tinted surfaces."
  },
  "canvas-muted": {
    value: "{color.blue-100}",
    type: "color",
    description: "Muted action canvas color for low-emphasis, recessed surfaces."
  },
  "canvas-emphasis": {
    value: "{color.blue-600}",
    type: "color",
    description: "Emphasis action canvas color for high-prominence surfaces."
  },

  // Canvas (inverse): action surfaces in inverse contexts
  "canvas-inverse": {
    value: "{color.blue-400}",
    type: "color",
    description: "Base inverse action canvas color for surfaces on dark or inverted contexts."
  },
  "canvas-inverse-subtle": {
    value: "{color.blue-900}",
    type: "color",
    description: "Subtle inverse action canvas color for the least-prominent surfaces in inverse contexts."
  },
  "canvas-inverse-muted": {
    value: "{color.blue-800}",
    type: "color",
    description: "Muted inverse action canvas color for low-emphasis surfaces in inverse contexts."
  },
  "canvas-inverse-emphasis": {
    value: "{color.blue-300}",
    type: "color",
    description: "Emphasis inverse action canvas color for high-prominence surfaces in inverse contexts."
  },

  // Ink: action text and icon colors
  "ink": {
    value: "{color.blue-700}",
    type: "color",
    description: "Base action ink color for body text and icons on neutral or light canvases."
  },
  "ink-subtle": {
    value: "{color.blue-400}",
    type: "color",
    description: "Subtle action ink color for the least-prominent, tertiary text and icons."
  },
  "ink-muted": {
    value: "{color.blue-500}",
    type: "color",
    description: "Muted action ink color for secondary text and icons."
  },
  "ink-emphasis": {
    value: "{color.blue-800}",
    type: "color",
    description: "Emphasis action ink color for high-prominence text and icons."
  },

  // Ink (inverse): action text and icon colors on inverse canvases
  "ink-inverse": {
    value: "{color.blue-300}",
    type: "color",
    description: "Base inverse action ink color for body text and icons on inverse or dark canvases."
  },
  "ink-inverse-subtle": {
    value: "{color.blue-500}",
    type: "color",
    description: "Subtle inverse action ink color for the least-prominent text and icons on inverse canvases."
  },
  "ink-inverse-muted": {
    value: "{color.blue-400}",
    type: "color",
    description: "Muted inverse action ink color for secondary text and icons on inverse canvases."
  },
  "ink-inverse-emphasis": {
    value: "{color.blue-200}",
    type: "color",
    description: "Emphasis inverse action ink color for high-prominence text on inverse canvases."
  },

  // Border: action border, outline, and divider colors
  "border": {
    value: "{color.blue-500}",
    type: "color",
    description: "Base action border color for outlines, strokes, and dividers."
  },
  "border-subtle": {
    value: "{color.blue-200}",
    type: "color",
    description: "Subtle action border color for the least-prominent outlines and dividers."
  },
  "border-muted": {
    value: "{color.blue-300}",
    type: "color",
    description: "Muted action border color for low-emphasis outlines and dividers."
  },
  "border-emphasis": {
    value: "{color.blue-600}",
    type: "color",
    description: "Emphasis action border color for high-prominence outlines and dividers."
  },

  // Border (inverse): action borders in inverse contexts
  "border-inverse": {
    value: "{color.blue-500}",
    type: "color",
    description: "Base inverse action border color for outlines and dividers on inverse canvases."
  },
  "border-inverse-subtle": {
    value: "{color.blue-800}",
    type: "color",
    description: "Subtle inverse action border color for the least-prominent outlines on inverse canvases."
  },
  "border-inverse-muted": {
    value: "{color.blue-700}",
    type: "color",
    description: "Muted inverse action border color for low-emphasis outlines on inverse canvases."
  },
  "border-inverse-emphasis": {
    value: "{color.blue-400}",
    type: "color",
    description: "Emphasis inverse action border color for high-prominence outlines on inverse canvases."
  }
} as const satisfies ActionTokenSchema;

export default tokens;
