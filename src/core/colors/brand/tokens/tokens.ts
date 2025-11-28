import type { LayerName } from "@definitions/layers";
import { z } from "zod";
import { tokenSchema } from "./token-schema";

/**
 * Zebkit brand color design tokens. 
 */
export const key = "brand";
export const layer: LayerName = "base";

export type BrandTokenSchema = z.infer<typeof tokenSchema>;

const tokens = {
  // Canvas: base brand surfaces
  "canvas": {
    value: "{color.butterfield-200}",
    type: "color",
    description: "Base brand canvas color for primary branded surfaces."
  },
  "canvas-soft": {
    value: "{color.butterfield-50}",
    type: "color",
    description: "Soft brand canvas color for lightly tinted branded surfaces."
  },
  "canvas-muted": {
    value: "{color.butterfield-100}",
    type: "color",
    description: "Muted brand canvas color for low-emphasis branded surfaces."
  },
  "canvas-strong": {
    value: "{color.butterfield-600}",
    type: "color",
    description: "Strong brand canvas color for high-emphasis branded surfaces."
  },

  // Canvas (inverse): brand surfaces in inverse contexts
  "canvas-inverse": {
    value: "{color.butterfield-600}",
    type: "color",
    description: "Base inverse brand canvas color for branded surfaces on dark or inverted contexts."
  },
  "canvas-inverse-soft": {
    value: "{color.butterfield-500}",
    type: "color",
    description: "Soft inverse brand canvas color for lightly tinted branded surfaces in inverse contexts."
  },
  "canvas-inverse-muted": {
    value: "{color.butterfield-300}",
    type: "color",
    description: "Muted inverse brand canvas color for low-emphasis branded surfaces in inverse contexts."
  },
  "canvas-inverse-strong": {
    value: "{color.butterfield-50}",
    type: "color",
    description: "Strong inverse brand canvas color for high-emphasis branded surfaces in inverse contexts."
  },

  // Ink: brand text and icon colors
  "ink": {
    value: "{color.butterfield-800}",
    type: "color",
    description: "Base brand ink color for text and icons on neutral or light canvases."
  },
  "ink-soft": {
    value: "{color.butterfield-400}",
    type: "color",
    description: "Soft brand ink color for lower-emphasis text and icons."
  },
  "ink-muted": {
    value: "{color.butterfield-600}",
    type: "color",
    description: "Muted brand ink color for subtle or secondary text and icons."
  },
  "ink-strong": {
    value: "{color.butterfield-950}",
    type: "color",
    description: "Strong brand ink color for high-emphasis text and icons."
  },

  // Ink (inverse): brand text and icon colors on inverse canvases
  "ink-inverse": {
    value: "{color.butterfield-100}",
    type: "color",
    description: "Base inverse brand ink color for text and icons on inverse or dark canvases."
  },
  "ink-inverse-soft": {
    value: "{color.butterfield-200}",
    type: "color",
    description: "Soft inverse brand ink color for lower-emphasis text and icons on inverse canvases."
  },
  "ink-inverse-muted": {
    value: "{color.butterfield-300}",
    type: "color",
    description: "Muted inverse brand ink color for subtle text and icons on inverse canvases."
  },
  "ink-inverse-strong": {
    value: "{color.butterfield-50}",
    type: "color",
    description: "Strong inverse brand ink color for high-emphasis text and icons on inverse canvases."
  },

  // Border: brand border, outline, and divider colors
  "border": {
    value: "",
    type: "color",
    description: "Base brand border color for outlines, strokes, and dividers."
  },
  "border-soft": {
    value: "",
    type: "color",
    description: "Soft brand border color for low-emphasis outlines and dividers."
  },
  "border-muted": {
    value: "",
    type: "color",
    description: "Muted brand border color for subtle outlines and dividers."
  },
  "border-strong": {
    value: "",
    type: "color",
    description: "Strong brand border color for high-emphasis outlines and dividers."
  },

  // Border (inverse): brand borders in inverse contexts
  "border-inverse": {
    value: "",
    type: "color",
    description: "Base inverse brand border color for outlines and dividers on inverse canvases."
  },
  "border-inverse-soft": {
    value: "",
    type: "color",
    description: "Soft inverse brand border color for low-emphasis outlines on inverse canvases."
  },
  "border-inverse-muted": {
    value: "",
    type: "color",
    description: "Muted inverse brand border color for subtle outlines on inverse canvases."
  },
  "border-inverse-strong": {
    value: "",
    type: "color",
    description: "Strong inverse brand border color for high-emphasis outlines on inverse canvases."
  }
} as const satisfies BrandTokenSchema;

export default tokens;