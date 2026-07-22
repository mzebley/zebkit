import type { LayerName } from "@definitions/layers";
import type { TokenObject } from "@definitions/tokens";

/**
 * Zebkit tooltip design tokens. The module key is fixed to `tooltip` so these
 * values become `--zbk-tooltip-*` CSS custom properties during the token build.
 * One surface serves both trigger modes (hint and toggle) — the bubble is the
 * same visual thing either way.
 */
export const key = "tooltip";
export const layer: LayerName = "base";

export type TooltipTokenKey =
  'display'
  | 'canvas'
  | 'ink'
  | 'border-color'
  | 'border-width'
  | 'border-style'
  | 'border-radius'
  | 'font-family'
  | 'font-size'
  | 'font-weight'
  | 'line-height'
  | 'letter-spacing'
  | 'padding-inline'
  | 'padding-block'
  | 'max-width'
  | 'arrow-size'
  | 'offset'
  | 'box-shadow'
  | 'z-index'
  | 'transition-duration'
  | 'transition-timing-function'
  | 'show-delay'
  | 'hide-grace'
  | 'opacity';

const tokens = {
  // Host layout: the element wraps its trigger without disturbing layout.
  display: {
    $value: "contents",
    $type: "display",
    $description: "Display mode for the tooltip host element wrapping the trigger.",
  },

  // Bubble surface
  canvas: {
    $value: "{app.canvas-inverse}",
    $type: "color",
    $description: "Tooltip bubble background.",
  },
  ink: {
    $value: "{app.ink-inverse}",
    $type: "color",
    $description: "Tooltip text color.",
  },
  "border-color": {
    $value: "{color.global-transparent}",
    $type: "color",
    $description: "Tooltip bubble border color.",
  },
  "border-width": {
    $value: "{border.width-sm}",
    $type: "dimension",
    $description: "Tooltip bubble border width.",
  },
  "border-style": {
    $value: "{border.style}",
    $type: "strokeStyle",
    $description: "Tooltip bubble border style.",
  },
  "border-radius": {
    $value: "{border.radius-md}",
    $type: "dimension",
    $description: "Tooltip bubble corner radius.",
  },

  // Typography
  "font-family": {
    $value: "{font-family.interface}",
    $type: "fontFamily",
    $description: "Font family for tooltip text.",
  },
  "font-size": {
    $value: "{font-size.sm}",
    $type: "cssDimension",
    $description: "Font size for tooltip text.",
  },
  "font-weight": {
    $value: "{font-weight.normal}",
    $type: "fontWeight",
    $description: "Font weight for tooltip text.",
  },
  "line-height": {
    $value: "{line-height.2}",
    $type: "number",
    $description: "Line height for tooltip text.",
  },
  "letter-spacing": {
    $value: "{letter-spacing.normal}",
    $type: "cssDimension",
    $description: "Letter spacing for tooltip text.",
  },

  // Spacing & sizing
  "padding-inline": {
    $value: "{spacing.xs}",
    $type: "dimension",
    $description: "Inline padding inside the bubble.",
  },
  "padding-block": {
    $value: "{spacing.2xs}",
    $type: "dimension",
    $description: "Block padding inside the bubble.",
  },
  "max-width": {
    $value: { value: 20, unit: "rem" },
    $type: "dimension",
    $description: "Maximum bubble width before text wraps.",
  },
  "arrow-size": {
    $value: { value: 8, unit: "px" },
    $type: "dimension",
    $description: "Arrow square size; also sets the default trigger-to-bubble gap.",
  },
  offset: {
    $value: "{tooltip.arrow-size}",
    $type: "dimension",
    $description: "Gap between the trigger and the bubble.",
  },

  // Elevation & stacking
  "box-shadow": {
    $value: "{elevation.sm}",
    $type: "shadow",
    $description: "Bubble shadow.",
  },
  "z-index": {
    $value: "{z-index.tooltip}",
    $type: "number",
    $description: "Stacking order when the top-layer popover API is unavailable.",
  },

  // Motion & timing
  "transition-duration": {
    $value: { value: 150, unit: "ms" },
    $type: "duration",
    $description: "Show/hide transition duration.",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  "transition-timing-function": {
    $value: "ease-out",
    $type: "cssEasingFunction",
    $description: "Show/hide transition timing function.",
  },
  "show-delay": {
    $value: { value: 150, unit: "ms" },
    $type: "duration",
    $description:
      "Delay before a hint tooltip shows on hover/focus. Read by the element at runtime.",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  "hide-grace": {
    $value: { value: 120, unit: "ms" },
    $type: "duration",
    $description:
      "Grace period before hiding, so the pointer can travel onto the bubble (WCAG 1.4.13 hoverable). Read by the element at runtime.",
    $extensions: { "dev.zebkit": { a11y: true } },
  },

  opacity: {
    $value: 1,
    $type: "number",
    $description: "Bubble opacity.",
  },
} as const satisfies Record<TooltipTokenKey, TokenObject>;

export default tokens;
