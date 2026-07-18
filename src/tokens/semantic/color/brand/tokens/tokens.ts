import type { LayerName } from "@definitions/layers";
import { z } from "zod";
import { tokenSchema } from "./token-schema";

/**
 * Zebkit brand role tokens (canvas / ink / border).
 *
 * These are the semantic, role-based knobs for the brand palette. They reference the
 * brand *scale* (brand-50..950) rather than raw primitives, so re-skinning the brand
 * ramp cascades automatically. Reach for these (e.g. `ink-brand`, `canvas-brand-muted`)
 * by default; drop to the numeric scale (`ink-brand-500`) only for a shade the roles
 * don't cover. `ink` is the brand hue itself, intended for branded text on any canvas.
 */
export const key = "brand";
export const layer: LayerName = "theme";

export type BrandRoleSchema = z.infer<typeof tokenSchema>;

const tokens = {
  // Canvas: branded surfaces
  "canvas": {
    $value: "{brand.500}",
    $type: "color",
    $description: "Base brand canvas color for primary branded surfaces."
  },
  "canvas-subtle": {
    $value: "{brand.50}",
    $type: "color",
    $description: "Subtle brand canvas color for the least-prominent, lightly tinted surfaces."
  },
  "canvas-muted": {
    $value: "{brand.100}",
    $type: "color",
    $description: "Muted brand canvas color for low-emphasis, recessed surfaces."
  },
  "canvas-emphasis": {
    $value: "{brand.600}",
    $type: "color",
    $description: "Emphasis brand canvas color for high-prominence surfaces."
  },

  // Canvas (inverse): branded surfaces in inverse contexts
  "canvas-inverse": {
    $value: "{brand.400}",
    $type: "color",
    $description: "Base inverse brand canvas color for surfaces on dark or inverted contexts."
  },
  "canvas-inverse-subtle": {
    $value: "{brand.900}",
    $type: "color",
    $description: "Subtle inverse brand canvas color for the least-prominent surfaces in inverse contexts."
  },
  "canvas-inverse-muted": {
    $value: "{brand.800}",
    $type: "color",
    $description: "Muted inverse brand canvas color for low-emphasis surfaces in inverse contexts."
  },
  "canvas-inverse-emphasis": {
    $value: "{brand.300}",
    $type: "color",
    $description: "Emphasis inverse brand canvas color for high-prominence surfaces in inverse contexts."
  },

  // Ink: branded text and icon colors (the brand hue itself)
  "ink": {
    $value: "{brand.700}",
    $type: "color",
    $description: "Base brand ink color (the brand hue) for body text and icons on neutral or light canvases."
  },
  "ink-subtle": {
    $value: "{brand.400}",
    $type: "color",
    $description: "Subtle brand ink color for the least-prominent, tertiary text and icons."
  },
  "ink-muted": {
    $value: "{brand.500}",
    $type: "color",
    $description: "Muted brand ink color for secondary text and icons."
  },
  "ink-emphasis": {
    $value: "{brand.800}",
    $type: "color",
    $description: "Emphasis brand ink color for high-prominence text and icons."
  },

  // Ink (inverse): branded text and icon colors on inverse canvases
  "ink-inverse": {
    $value: "{brand.300}",
    $type: "color",
    $description: "Base inverse brand ink color for body text and icons on inverse or dark canvases."
  },
  "ink-inverse-subtle": {
    $value: "{brand.500}",
    $type: "color",
    $description: "Subtle inverse brand ink color for the least-prominent text and icons on inverse canvases."
  },
  "ink-inverse-muted": {
    $value: "{brand.400}",
    $type: "color",
    $description: "Muted inverse brand ink color for secondary text and icons on inverse canvases."
  },
  "ink-inverse-emphasis": {
    $value: "{brand.200}",
    $type: "color",
    $description: "Emphasis inverse brand ink color for high-prominence text on inverse canvases."
  },

  // Border: branded border, outline, and divider colors
  "border": {
    $value: "{brand.500}",
    $type: "color",
    $description: "Base brand border color for outlines, strokes, and dividers."
  },
  "border-subtle": {
    $value: "{brand.200}",
    $type: "color",
    $description: "Subtle brand border color for the least-prominent outlines and dividers."
  },
  "border-muted": {
    $value: "{brand.300}",
    $type: "color",
    $description: "Muted brand border color for low-emphasis outlines and dividers."
  },
  "border-emphasis": {
    $value: "{brand.600}",
    $type: "color",
    $description: "Emphasis brand border color for high-prominence outlines and dividers."
  },

  // Border (inverse): branded borders in inverse contexts
  "border-inverse": {
    $value: "{brand.500}",
    $type: "color",
    $description: "Base inverse brand border color for outlines and dividers on inverse canvases."
  },
  "border-inverse-subtle": {
    $value: "{brand.800}",
    $type: "color",
    $description: "Subtle inverse brand border color for the least-prominent outlines on inverse canvases."
  },
  "border-inverse-muted": {
    $value: "{brand.700}",
    $type: "color",
    $description: "Muted inverse brand border color for low-emphasis outlines on inverse canvases."
  },
  "border-inverse-emphasis": {
    $value: "{brand.400}",
    $type: "color",
    $description: "Emphasis inverse brand border color for high-prominence outlines on inverse canvases."
  }
} as const satisfies BrandRoleSchema;

export default tokens;
