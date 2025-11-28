import type { LayerName } from "@definitions/layers";
import { z } from "zod";
import { tokenSchema } from "./token-schema";

/**
 * Zebkit accent-secondary color design tokens. 
 */
export const key = "accent-secondary";
export const layer: LayerName = "base";

export type AccentSecondaryTokenSchema = z.infer<typeof tokenSchema>;

const tokens = {
  // Canvas: base secondary accent surfaces
  "canvas": {
    value: "{color.dusk-50}",
    type: "color",
    description: "Base secondary accent canvas color for primary surfaces."
  },
  "canvas-soft": {
    value: "",
    type: "color",
    description: "Soft secondary accent canvas color for lightly tinted surfaces."
  },
  "canvas-muted": {
    value: "",
    type: "color",
    description: "Muted secondary accent canvas color for low-emphasis surfaces."
  },
  "canvas-strong": {
    value: "",
    type: "color",
    description: "Strong secondary accent canvas color for high-emphasis surfaces."
  },

  // Canvas (inverse): secondary accent surfaces in inverse contexts
  "canvas-inverse": {
    value: "",
    type: "color",
    description: "Base inverse secondary accent canvas color for surfaces on dark or inverted contexts."
  },
  "canvas-inverse-soft": {
    value: "",
    type: "color",
    description: "Soft inverse secondary accent canvas color for lightly tinted surfaces in inverse contexts."
  },
  "canvas-inverse-muted": {
    value: "",
    type: "color",
    description: "Muted inverse secondary accent canvas color for low-emphasis surfaces in inverse contexts."
  },
  "canvas-inverse-strong": {
    value: "",
    type: "color",
    description: "Strong inverse secondary accent canvas color for high-emphasis surfaces in inverse contexts."
  },

  // Ink: secondary accent text and icon colors
  "ink": {
    value: "",
    type: "color",
    description: "Base secondary accent ink color for text and icons on neutral or light canvases."
  },
  "ink-soft": {
    value: "",
    type: "color",
    description: "Soft secondary accent ink color for lower-emphasis text and icons."
  },
  "ink-muted": {
    value: "",
    type: "color",
    description: "Muted secondary accent ink color for subtle or secondary text and icons."
  },
  "ink-strong": {
    value: "",
    type: "color",
    description: "Strong secondary accent ink color for high-emphasis text and icons."
  },

  // Ink (inverse): secondary accent text and icon colors on inverse canvases
  "ink-inverse": {
    value: "",
    type: "color",
    description: "Base inverse secondary accent ink color for text and icons on inverse or dark canvases."
  },
  "ink-inverse-soft": {
    value: "",
    type: "color",
    description: "Soft inverse secondary accent ink color for lower-emphasis text and icons on inverse canvases."
  },
  "ink-inverse-muted": {
    value: "",
    type: "color",
    description: "Muted inverse secondary accent ink color for subtle text and icons on inverse canvases."
  },
  "ink-inverse-strong": {
    value: "",
    type: "color",
    description: "Strong inverse secondary accent ink color for high-emphasis text and icons on inverse canvases."
  },

  // Border: secondary accent border, outline, and divider colors
  "border": {
    value: "",
    type: "color",
    description: "Base secondary accent border color for outlines, strokes, and dividers."
  },
  "border-soft": {
    value: "",
    type: "color",
    description: "Soft secondary accent border color for low-emphasis outlines and dividers."
  },
  "border-muted": {
    value: "",
    type: "color",
    description: "Muted secondary accent border color for subtle outlines and dividers."
  },
  "border-strong": {
    value: "",
    type: "color",
    description: "Strong secondary accent border color for high-emphasis outlines and dividers."
  },

  // Border (inverse): secondary accent borders in inverse contexts
  "border-inverse": {
    value: "",
    type: "color",
    description: "Base inverse secondary accent border color for outlines and dividers on inverse canvases."
  },
  "border-inverse-soft": {
    value: "",
    type: "color",
    description: "Soft inverse secondary accent border color for low-emphasis outlines on inverse canvases."
  },
  "border-inverse-muted": {
    value: "",
    type: "color",
    description: "Muted inverse secondary accent border color for subtle outlines on inverse canvases."
  },
  "border-inverse-strong": {
    value: "",
    type: "color",
    description: "Strong inverse secondary accent border color for high-emphasis outlines on inverse canvases."
  }
} as const satisfies AccentSecondaryTokenSchema;

export default tokens;