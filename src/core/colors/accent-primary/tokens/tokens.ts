import type { LayerName } from "@definitions/layers";
import { z } from "zod";
import { tokenSchema } from "./token-schema";

/**
 * Zebkit accent-primary color design tokens. 
 */
export const key = "accent-primary";
export const layer: LayerName = "base";

export type AccentPrimaryTokenSchema = z.infer<typeof tokenSchema>;

const tokens = {
  // Canvas: base primary accent surfaces
  "canvas": {
    value: "{color.dusk-50}",
    type: "color",
    description: "Base primary accent canvas color for primary surfaces."
  },
  "canvas-soft": {
    value: "",
    type: "color",
    description: "Soft primary accent canvas color for lightly tinted surfaces."
  },
  "canvas-muted": {
    value: "",
    type: "color",
    description: "Muted primary accent canvas color for low-emphasis surfaces."
  },
  "canvas-strong": {
    value: "",
    type: "color",
    description: "Strong primary accent canvas color for high-emphasis surfaces."
  },

  // Canvas (inverse): primary accent surfaces in inverse contexts
  "canvas-inverse": {
    value: "",
    type: "color",
    description: "Base inverse primary accent canvas color for surfaces on dark or inverted contexts."
  },
  "canvas-inverse-soft": {
    value: "",
    type: "color",
    description: "Soft inverse primary accent canvas color for lightly tinted surfaces in inverse contexts."
  },
  "canvas-inverse-muted": {
    value: "",
    type: "color",
    description: "Muted inverse primary accent canvas color for low-emphasis surfaces in inverse contexts."
  },
  "canvas-inverse-strong": {
    value: "",
    type: "color",
    description: "Strong inverse primary accent canvas color for high-emphasis surfaces in inverse contexts."
  },

  // Ink: primary accent text and icon colors
  "ink": {
    value: "",
    type: "color",
    description: "Base primary accent ink color for text and icons on neutral or light canvases."
  },
  "ink-soft": {
    value: "",
    type: "color",
    description: "Soft primary accent ink color for lower-emphasis text and icons."
  },
  "ink-muted": {
    value: "",
    type: "color",
    description: "Muted primary accent ink color for subtle or secondary text and icons."
  },
  "ink-strong": {
    value: "",
    type: "color",
    description: "Strong primary accent ink color for high-emphasis text and icons."
  },

  // Ink (inverse): primary accent text and icon colors on inverse canvases
  "ink-inverse": {
    value: "",
    type: "color",
    description: "Base inverse primary accent ink color for text and icons on inverse or dark canvases."
  },
  "ink-inverse-soft": {
    value: "",
    type: "color",
    description: "Soft inverse primary accent ink color for lower-emphasis text and icons on inverse canvases."
  },
  "ink-inverse-muted": {
    value: "",
    type: "color",
    description: "Muted inverse primary accent ink color for subtle text and icons on inverse canvases."
  },
  "ink-inverse-strong": {
    value: "",
    type: "color",
    description: "Strong inverse primary accent ink color for high-emphasis text and icons on inverse canvases."
  },

  // Border: primary accent border, outline, and divider colors
  "border": {
    value: "",
    type: "color",
    description: "Base primary accent border color for outlines, strokes, and dividers."
  },
  "border-soft": {
    value: "",
    type: "color",
    description: "Soft primary accent border color for low-emphasis outlines and dividers."
  },
  "border-muted": {
    value: "",
    type: "color",
    description: "Muted primary accent border color for subtle outlines and dividers."
  },
  "border-strong": {
    value: "",
    type: "color",
    description: "Strong primary accent border color for high-emphasis outlines and dividers."
  },

  // Border (inverse): primary accent borders in inverse contexts
  "border-inverse": {
    value: "",
    type: "color",
    description: "Base inverse primary accent border color for outlines and dividers on inverse canvases."
  },
  "border-inverse-soft": {
    value: "",
    type: "color",
    description: "Soft inverse primary accent border color for low-emphasis outlines on inverse canvases."
  },
  "border-inverse-muted": {
    value: "",
    type: "color",
    description: "Muted inverse primary accent border color for subtle outlines on inverse canvases."
  },
  "border-inverse-strong": {
    value: "",
    type: "color",
    description: "Strong inverse primary accent border color for high-emphasis outlines on inverse canvases."
  }
} as const satisfies AccentPrimaryTokenSchema;

export default tokens;