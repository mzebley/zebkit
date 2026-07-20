import type { LayerName } from "@definitions/layers";
import type { TokenInterface } from "@definitions/tokens";

/**
 * Zebkit disabled color design tokens.
 */
export const key = "disabled";
export const layer: LayerName = "theme";


const tokens = {
  // Canvas: base disabled surfaces
  "canvas": {
    $value: "{color.charcoal-400}",
    $type: "color",
    $description: "Base disabled canvas color for primary surfaces."
  },
  "canvas-subtle": {
    $value: "{color.charcoal-50}",
    $type: "color",
    $description: "Subtle disabled canvas color for the least-prominent, lightly tinted surfaces."
  },
  "canvas-muted": {
    $value: "{color.charcoal-200}",
    $type: "color",
    $description: "Muted disabled canvas color for low-emphasis, recessed surfaces."
  },
  "canvas-emphasis": {
    $value: "{color.charcoal-800}",
    $type: "color",
    $description: "Emphasis disabled canvas color for high-prominence surfaces."
  },

  // Canvas (inverse): disabled surfaces in inverse contexts
  "canvas-inverse": {
    $value: "{color.charcoal-800}",
    $type: "color",
    $description: "Base inverse disabled canvas color for surfaces on dark or inverted contexts."
  },
  "canvas-inverse-subtle": {
    $value: "{color.charcoal-950}",
    $type: "color",
    $description: "Subtle inverse disabled canvas color for the least-prominent surfaces in inverse contexts."
  },
  "canvas-inverse-muted": {
    $value: "{color.charcoal-900}",
    $type: "color",
    $description: "Muted inverse disabled canvas color for low-emphasis surfaces in inverse contexts."
  },
  "canvas-inverse-emphasis": {
    $value: "{color.charcoal-200}",
    $type: "color",
    $description: "Emphasis inverse disabled canvas color for high-prominence surfaces in inverse contexts."
  },

  // Ink: disabled text and icon colors
  "ink": {
    $value: "{color.charcoal-800}",
    $type: "color",
    $description: "Base disabled ink color for body text and icons on neutral or light canvases."
  },
  "ink-subtle": {
    $value: "{color.charcoal-400}",
    $type: "color",
    $description: "Subtle disabled ink color for the least-prominent, tertiary text and icons."
  },
  "ink-muted": {
    $value: "{color.charcoal-600}",
    $type: "color",
    $description: "Muted disabled ink color for secondary text and icons."
  },
  "ink-emphasis": {
    $value: "{color.charcoal-900}",
    $type: "color",
    $description: "Emphasis disabled ink color for high-prominence text and icons."
  },

  // Ink (inverse): disabled text and icon colors on inverse canvases
  "ink-inverse": {
    $value: "{color.charcoal-200}",
    $type: "color",
    $description: "Base inverse disabled ink color for body text and icons on inverse or dark canvases."
  },
  "ink-inverse-subtle": {
    $value: "{color.charcoal-800}",
    $type: "color",
    $description: "Subtle inverse disabled ink color for the least-prominent text and icons on inverse canvases."
  },
  "ink-inverse-muted": {
    $value: "{color.charcoal-500}",
    $type: "color",
    $description: "Muted inverse disabled ink color for secondary text and icons on inverse canvases."
  },
  "ink-inverse-emphasis": {
    $value: "{color.charcoal-100}",
    $type: "color",
    $description: "Emphasis inverse disabled ink color for high-prominence text on inverse canvases."
  },

  // Border: disabled border, outline, and divider colors
  "border": {
    $value: "{disabled.ink}",
    $type: "color",
    $description: "Base disabled border color for outlines, strokes, and dividers."
  },
  "border-subtle": {
    $value: "{disabled.ink-subtle}",
    $type: "color",
    $description: "Subtle disabled border color for the least-prominent outlines and dividers."
  },
  "border-muted": {
    $value: "{disabled.ink-muted}",
    $type: "color",
    $description: "Muted disabled border color for low-emphasis outlines and dividers."
  },
  "border-emphasis": {
    $value: "{disabled.ink-emphasis}",
    $type: "color",
    $description: "Emphasis disabled border color for high-prominence outlines and dividers."
  },

  // Border (inverse): disabled borders in inverse contexts
  "border-inverse": {
    $value: "{disabled.ink-inverse}",
    $type: "color",
    $description: "Base inverse disabled border color for outlines and dividers on inverse canvases."
  },
  "border-inverse-subtle": {
    $value: "{disabled.ink-inverse-subtle}",
    $type: "color",
    $description: "Subtle inverse disabled border color for the least-prominent outlines on inverse canvases."
  },
  "border-inverse-muted": {
    $value: "{disabled.ink-inverse-muted}",
    $type: "color",
    $description: "Muted inverse disabled border color for low-emphasis outlines on inverse canvases."
  },
  "border-inverse-emphasis": {
    $value: "{disabled.ink-inverse-emphasis}",
    $type: "color",
    $description: "Emphasis inverse disabled border color for high-prominence outlines on inverse canvases."
  }
} as const satisfies TokenInterface;

export default tokens;
