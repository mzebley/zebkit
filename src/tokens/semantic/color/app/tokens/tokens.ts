import type { LayerName } from "@definitions/layers";
import type { TokenInterface } from "@definitions/tokens";

/**
 * Zebkit app color design tokens.
 */
export const key = "app";
export const layer: LayerName = "base";


const tokens = {
  // Canvas: base app surfaces
  "canvas": {
    $value: "{color.butterfield-50}",
    $type: "color",
    $description: "Base app canvas color for primary surfaces."
  },
  "canvas-subtle": {
    $value: "{color.global-white}",
    $type: "color",
    $description: "Subtle app canvas color for the least-prominent, lightly tinted surfaces."
  },
  "canvas-muted": {
    $value: "{color.butterfield-100}",
    $type: "color",
    $description: "Muted app canvas color for low-emphasis, recessed surfaces."
  },
  "canvas-emphasis": {
    $value: "{color.dusk-900}",
    $type: "color",
    $description: "Emphasis app canvas color for high-prominence surfaces."
  },

  // Canvas (inverse): app surfaces in inverse contexts
  "canvas-inverse": {
    $value: "{color.dusk-950}",
    $type: "color",
    $description: "Base inverse app canvas color for surfaces on dark or inverted contexts."
  },
  "canvas-inverse-subtle": {
    $value: "{color.dusk-900}",
    $type: "color",
    $description: "Subtle inverse app canvas color for the least-prominent surfaces in inverse contexts."
  },
  "canvas-inverse-muted": {
    $value: "{color.dusk-700}",
    $type: "color",
    $description: "Muted inverse app canvas color for low-emphasis surfaces in inverse contexts."
  },
  "canvas-inverse-emphasis": {
    $value: "{color.dusk-200}",
    $type: "color",
    $description: "Emphasis inverse app canvas color for high-prominence surfaces in inverse contexts."
  },

  // Ink: app text and icon colors
  "ink": {
    $value: "{color.dusk-900}",
    $type: "color",
    $description: "Base app ink color for body text and icons on neutral or light canvases."
  },
  "ink-subtle": {
    $value: "{color.dusk-600}",
    $type: "color",
    $description: "Subtle app ink color for the least-prominent, tertiary text and icons."
  },
  "ink-muted": {
    $value: "{color.dusk-800}",
    $type: "color",
    $description: "Muted app ink color for secondary text and icons."
  },
  "ink-emphasis": {
    $value: "{color.dusk-950}",
    $type: "color",
    $description: "Emphasis app ink color for high-prominence text such as headings."
  },

  // Ink (inverse): app text and icon colors on inverse canvases
  "ink-inverse": {
    $value: "{color.dusk-200}",
    $type: "color",
    $description: "Base inverse app ink color for body text and icons on inverse or dark canvases."
  },
  "ink-inverse-subtle": {
    $value: "{color.dusk-500}",
    $type: "color",
    $description: "Subtle inverse app ink color for the least-prominent text and icons on inverse canvases."
  },
  "ink-inverse-muted": {
    $value: "{color.dusk-400}",
    $type: "color",
    $description: "Muted inverse app ink color for secondary text and icons on inverse canvases."
  },
  "ink-inverse-emphasis": {
    $value: "{color.dusk-50}",
    $type: "color",
    $description: "Emphasis inverse app ink color for high-prominence text on inverse canvases."
  },

  // Border: app border, outline, and divider colors
  "border": {
    $value: "",
    $type: "color",
    $description: "Base app border color for outlines, strokes, and dividers."
  },
  "border-subtle": {
    $value: "",
    $type: "color",
    $description: "Subtle app border color for the least-prominent outlines and dividers."
  },
  "border-muted": {
    $value: "",
    $type: "color",
    $description: "Muted app border color for low-emphasis outlines and dividers."
  },
  "border-emphasis": {
    $value: "",
    $type: "color",
    $description: "Emphasis app border color for high-prominence outlines and dividers."
  },

  // Border (inverse): app borders in inverse contexts
  "border-inverse": {
    $value: "",
    $type: "color",
    $description: "Base inverse app border color for outlines and dividers on inverse canvases."
  },
  "border-inverse-subtle": {
    $value: "",
    $type: "color",
    $description: "Subtle inverse app border color for the least-prominent outlines on inverse canvases."
  },
  "border-inverse-muted": {
    $value: "",
    $type: "color",
    $description: "Muted inverse app border color for low-emphasis outlines on inverse canvases."
  },
  "border-inverse-emphasis": {
    $value: "",
    $type: "color",
    $description: "Emphasis inverse app border color for high-prominence outlines on inverse canvases."
  }
} as const satisfies TokenInterface;

export default tokens;
