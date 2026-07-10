import type { LayerName } from "@definitions/layers";
import { z } from "zod";
import { tokenSchema } from "./token-schema";

/**
 * Zebkit tooltip design tokens. The module key is fixed to `tooltip` so these
 * values become `--zbk-tooltip-*` CSS custom properties during the token build.
 * One surface serves both trigger modes (hint and toggle) — the bubble is the
 * same visual thing either way.
 */
export const key = "tooltip";
export const layer: LayerName = "base";

export type TooltipTokens = z.infer<typeof tokenSchema>;

const tokens = {
  // Host layout: the element wraps its trigger without disturbing layout.
  display: {
    value: "contents",
    type: "display",
    description: "Display mode for the tooltip host element wrapping the trigger.",
  },

  // Bubble surface
  canvas: {
    value: "{app.canvas-inverse}",
    type: "color",
    description: "Tooltip bubble background.",
  },
  ink: {
    value: "{app.ink-inverse}",
    type: "color",
    description: "Tooltip text color.",
  },
  "border-color": {
    value: "transparent",
    type: "color",
    description: "Tooltip bubble border color.",
  },
  "border-width": {
    value: "{border.width-sm}",
    type: "borderWidth",
    description: "Tooltip bubble border width.",
  },
  "border-style": {
    value: "{border.style}",
    type: "borderStyle",
    description: "Tooltip bubble border style.",
  },
  "border-radius": {
    value: "{border.radius-md}",
    type: "borderRadius",
    description: "Tooltip bubble corner radius.",
  },

  // Typography
  "font-family": {
    value: "{font-family.interface}",
    type: "fontFamily",
    description: "Font family for tooltip text.",
  },
  "font-size": {
    value: "{font-size.sm}",
    type: "fontSize",
    description: "Font size for tooltip text.",
  },
  "font-weight": {
    value: "{font-weight.normal}",
    type: "fontWeight",
    description: "Font weight for tooltip text.",
  },
  "line-height": {
    value: "{line-height.2}",
    type: "lineHeight",
    description: "Line height for tooltip text.",
  },
  "letter-spacing": {
    value: "{tracking.normal}",
    type: "letterSpacing",
    description: "Letter spacing for tooltip text.",
  },

  // Spacing & sizing
  "padding-inline": {
    value: "{spacing.xs}",
    type: "spacing",
    description: "Inline padding inside the bubble.",
  },
  "padding-block": {
    value: "{spacing.2xs}",
    type: "spacing",
    description: "Block padding inside the bubble.",
  },
  "max-width": {
    value: "20rem",
    type: "sizing",
    description: "Maximum bubble width before text wraps.",
  },
  "arrow-size": {
    value: "8px",
    type: "sizing",
    description: "Arrow square size; also sets the default trigger-to-bubble gap.",
  },
  offset: {
    value: "{tooltip.arrow-size}",
    type: "sizing",
    description: "Gap between the trigger and the bubble.",
  },

  // Elevation & stacking
  "box-shadow": {
    value: "{elevation.sm}",
    type: "boxShadow",
    description: "Bubble shadow.",
  },
  "z-index": {
    value: "{z-index.tooltip}",
    type: "zIndex",
    description: "Stacking order when the top-layer popover API is unavailable.",
  },

  // Motion & timing
  "transition-duration": {
    value: "150ms",
    type: "transition",
    description: "Show/hide transition duration.",
    a11y: true,
  },
  "transition-timing-function": {
    value: "ease-out",
    type: "transition",
    description: "Show/hide transition timing function.",
  },
  "show-delay": {
    value: "150ms",
    type: "transition",
    description:
      "Delay before a hint tooltip shows on hover/focus. Read by the element at runtime.",
    a11y: true,
  },
  "hide-grace": {
    value: "120ms",
    type: "transition",
    description:
      "Grace period before hiding, so the pointer can travel onto the bubble (WCAG 1.4.13 hoverable). Read by the element at runtime.",
    a11y: true,
  },

  opacity: {
    value: 1,
    type: "opacity",
    description: "Bubble opacity.",
  },
} as const satisfies TooltipTokens;

export default tokens;
