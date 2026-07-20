import type { LayerName } from "@definitions/layers";
import type { TokenInterface } from "@definitions/tokens";

/**
 * Zebkit positive color design tokens.
 */
export const key = "positive";
export const layer: LayerName = "base";


const tokens = {
  // Canvas: base positive surfaces
  "canvas": {
    $value: "{color.green-500}",
    $type: "color",
    $description: "Base positive canvas color for primary surfaces."
  },
  "canvas-subtle": {
    $value: "{color.green-50}",
    $type: "color",
    $description: "Subtle positive canvas color for the least-prominent, lightly tinted surfaces."
  },
  "canvas-muted": {
    $value: "{color.green-100}",
    $type: "color",
    $description: "Muted positive canvas color for low-emphasis, recessed surfaces."
  },
  "canvas-emphasis": {
    $value: "{color.green-600}",
    $type: "color",
    $description: "Emphasis positive canvas color for high-prominence surfaces."
  },

  // Canvas (inverse): positive surfaces in inverse contexts
  "canvas-inverse": {
    $value: "{color.green-400}",
    $type: "color",
    $description: "Base inverse positive canvas color for surfaces on dark or inverted contexts."
  },
  "canvas-inverse-subtle": {
    $value: "{color.green-900}",
    $type: "color",
    $description: "Subtle inverse positive canvas color for the least-prominent surfaces in inverse contexts."
  },
  "canvas-inverse-muted": {
    $value: "{color.green-800}",
    $type: "color",
    $description: "Muted inverse positive canvas color for low-emphasis surfaces in inverse contexts."
  },
  "canvas-inverse-emphasis": {
    $value: "{color.green-300}",
    $type: "color",
    $description: "Emphasis inverse positive canvas color for high-prominence surfaces in inverse contexts."
  },

  // Ink: positive text and icon colors
  "ink": {
    $value: "{color.green-700}",
    $type: "color",
    $description: "Base positive ink color for body text and icons on neutral or light canvases."
  },
  "ink-subtle": {
    $value: "{color.green-400}",
    $type: "color",
    $description: "Subtle positive ink color for the least-prominent, tertiary text and icons."
  },
  "ink-muted": {
    $value: "{color.green-500}",
    $type: "color",
    $description: "Muted positive ink color for secondary text and icons."
  },
  "ink-emphasis": {
    $value: "{color.green-800}",
    $type: "color",
    $description: "Emphasis positive ink color for high-prominence text and icons."
  },

  // Ink (inverse): positive text and icon colors on inverse canvases
  "ink-inverse": {
    $value: "{color.green-300}",
    $type: "color",
    $description: "Base inverse positive ink color for body text and icons on inverse or dark canvases."
  },
  "ink-inverse-subtle": {
    $value: "{color.green-500}",
    $type: "color",
    $description: "Subtle inverse positive ink color for the least-prominent text and icons on inverse canvases."
  },
  "ink-inverse-muted": {
    $value: "{color.green-400}",
    $type: "color",
    $description: "Muted inverse positive ink color for secondary text and icons on inverse canvases."
  },
  "ink-inverse-emphasis": {
    $value: "{color.green-200}",
    $type: "color",
    $description: "Emphasis inverse positive ink color for high-prominence text on inverse canvases."
  },

  // Border: positive border, outline, and divider colors
  "border": {
    $value: "{color.green-500}",
    $type: "color",
    $description: "Base positive border color for outlines, strokes, and dividers."
  },
  "border-subtle": {
    $value: "{color.green-200}",
    $type: "color",
    $description: "Subtle positive border color for the least-prominent outlines and dividers."
  },
  "border-muted": {
    $value: "{color.green-300}",
    $type: "color",
    $description: "Muted positive border color for low-emphasis outlines and dividers."
  },
  "border-emphasis": {
    $value: "{color.green-600}",
    $type: "color",
    $description: "Emphasis positive border color for high-prominence outlines and dividers."
  },

  // Border (inverse): positive borders in inverse contexts
  "border-inverse": {
    $value: "{color.green-500}",
    $type: "color",
    $description: "Base inverse positive border color for outlines and dividers on inverse canvases."
  },
  "border-inverse-subtle": {
    $value: "{color.green-800}",
    $type: "color",
    $description: "Subtle inverse positive border color for the least-prominent outlines on inverse canvases."
  },
  "border-inverse-muted": {
    $value: "{color.green-700}",
    $type: "color",
    $description: "Muted inverse positive border color for low-emphasis outlines on inverse canvases."
  },
  "border-inverse-emphasis": {
    $value: "{color.green-400}",
    $type: "color",
    $description: "Emphasis inverse positive border color for high-prominence outlines on inverse canvases."
  }
} as const satisfies TokenInterface;

export default tokens;
