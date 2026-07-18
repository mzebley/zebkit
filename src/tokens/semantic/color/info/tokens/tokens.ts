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
    $value: "{color.cyan-500}",
    $type: "color",
    $description: "Base info canvas color for primary surfaces."
  },
  "canvas-subtle": {
    $value: "{color.cyan-50}",
    $type: "color",
    $description: "Subtle info canvas color for the least-prominent, lightly tinted surfaces."
  },
  "canvas-muted": {
    $value: "{color.cyan-100}",
    $type: "color",
    $description: "Muted info canvas color for low-emphasis, recessed surfaces."
  },
  "canvas-emphasis": {
    $value: "{color.cyan-600}",
    $type: "color",
    $description: "Emphasis info canvas color for high-prominence surfaces."
  },

  // Canvas (inverse): info surfaces in inverse contexts
  "canvas-inverse": {
    $value: "{color.cyan-400}",
    $type: "color",
    $description: "Base inverse info canvas color for surfaces on dark or inverted contexts."
  },
  "canvas-inverse-subtle": {
    $value: "{color.cyan-900}",
    $type: "color",
    $description: "Subtle inverse info canvas color for the least-prominent surfaces in inverse contexts."
  },
  "canvas-inverse-muted": {
    $value: "{color.cyan-800}",
    $type: "color",
    $description: "Muted inverse info canvas color for low-emphasis surfaces in inverse contexts."
  },
  "canvas-inverse-emphasis": {
    $value: "{color.cyan-300}",
    $type: "color",
    $description: "Emphasis inverse info canvas color for high-prominence surfaces in inverse contexts."
  },

  // Ink: info text and icon colors
  "ink": {
    $value: "{color.cyan-700}",
    $type: "color",
    $description: "Base info ink color for body text and icons on neutral or light canvases."
  },
  "ink-subtle": {
    $value: "{color.cyan-400}",
    $type: "color",
    $description: "Subtle info ink color for the least-prominent, tertiary text and icons."
  },
  "ink-muted": {
    $value: "{color.cyan-500}",
    $type: "color",
    $description: "Muted info ink color for secondary text and icons."
  },
  "ink-emphasis": {
    $value: "{color.cyan-800}",
    $type: "color",
    $description: "Emphasis info ink color for high-prominence text and icons."
  },

  // Ink (inverse): info text and icon colors on inverse canvases
  "ink-inverse": {
    $value: "{color.cyan-300}",
    $type: "color",
    $description: "Base inverse info ink color for body text and icons on inverse or dark canvases."
  },
  "ink-inverse-subtle": {
    $value: "{color.cyan-500}",
    $type: "color",
    $description: "Subtle inverse info ink color for the least-prominent text and icons on inverse canvases."
  },
  "ink-inverse-muted": {
    $value: "{color.cyan-400}",
    $type: "color",
    $description: "Muted inverse info ink color for secondary text and icons on inverse canvases."
  },
  "ink-inverse-emphasis": {
    $value: "{color.cyan-200}",
    $type: "color",
    $description: "Emphasis inverse info ink color for high-prominence text on inverse canvases."
  },

  // Border: info border, outline, and divider colors
  "border": {
    $value: "{color.cyan-500}",
    $type: "color",
    $description: "Base info border color for outlines, strokes, and dividers."
  },
  "border-subtle": {
    $value: "{color.cyan-200}",
    $type: "color",
    $description: "Subtle info border color for the least-prominent outlines and dividers."
  },
  "border-muted": {
    $value: "{color.cyan-300}",
    $type: "color",
    $description: "Muted info border color for low-emphasis outlines and dividers."
  },
  "border-emphasis": {
    $value: "{color.cyan-600}",
    $type: "color",
    $description: "Emphasis info border color for high-prominence outlines and dividers."
  },

  // Border (inverse): info borders in inverse contexts
  "border-inverse": {
    $value: "{color.cyan-500}",
    $type: "color",
    $description: "Base inverse info border color for outlines and dividers on inverse canvases."
  },
  "border-inverse-subtle": {
    $value: "{color.cyan-800}",
    $type: "color",
    $description: "Subtle inverse info border color for the least-prominent outlines on inverse canvases."
  },
  "border-inverse-muted": {
    $value: "{color.cyan-700}",
    $type: "color",
    $description: "Muted inverse info border color for low-emphasis outlines on inverse canvases."
  },
  "border-inverse-emphasis": {
    $value: "{color.cyan-400}",
    $type: "color",
    $description: "Emphasis inverse info border color for high-prominence outlines on inverse canvases."
  }
} as const satisfies InfoTokenSchema;

export default tokens;
