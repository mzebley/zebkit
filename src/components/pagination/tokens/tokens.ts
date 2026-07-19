import type { LayerName } from "@definitions/layers";
import type { TokenObject } from "@definitions/tokens";

/**
 * Zebkit pagination design tokens. The module key is fixed to `pagination` so
 * these values become `--zbk-pagination-*` CSS custom properties during the
 * token build. Item tokens (ink/canvas/border) cover every page, prev, and
 * next control; the current page carries the `-selected` semantic state.
 */
export const key = "pagination";
export const layer: LayerName = "base";

export type PaginationTokenKey =
  | "ink"
  | "ink-hover"
  | "ink-active"
  | "ink-disabled"
  | "ink-selected"
  | "canvas"
  | "canvas-hover"
  | "canvas-active"
  | "canvas-disabled"
  | "canvas-selected"
  | "border-color"
  | "border-color-hover"
  | "border-color-active"
  | "border-color-disabled"
  | "border-color-selected"
  | "border-width"
  | "border-style"
  | "border-radius"
  | "font-family"
  | "font-size"
  | "font-weight"
  | "line-height"
  | "display"
  | "gap"
  | "min-width"
  | "min-height"
  | "padding-inline"
  | "padding-block"
  | "icon-size"
  | "ellipsis-ink"
  | "status-ink"
  | "focus-color"
  | "focus-width"
  | "focus-offset"
  | "transition-property"
  | "transition-duration"
  | "transition-timing-function"
  | "cursor";

const tokens = {
  // Item ink (page numbers and the prev/next glyphs)
  ink: {
    $value: "{action.ink}",
    $type: "color",
    $description: "Label color of page, previous, and next items.",
  },
  "ink-hover": {
    $value: "{action.ink-emphasis}",
    $type: "color",
    $description: "Item label color when hovered.",
  },
  "ink-active": {
    $value: "{action.ink-emphasis}",
    $type: "color",
    $description: "Item label color when pressed.",
  },
  "ink-disabled": {
    $value: "{disabled.ink}",
    $type: "color",
    $description: "Label color of a disabled previous/next control.",
  },
  "ink-selected": {
    $value: "{app.ink-inverse}",
    $type: "color",
    $description: "Label color of the current page item (aria-current).",
  },

  // Item canvas
  canvas: {
    $value: "{color.global-transparent}",
    $type: "color",
    $description: "Item background at rest.",
  },
  "canvas-hover": {
    $value: "{action.canvas-subtle}",
    $type: "color",
    $description: "Item background when hovered.",
  },
  "canvas-active": {
    $value: "{action.canvas-muted}",
    $type: "color",
    $description: "Item background when pressed.",
  },
  "canvas-disabled": {
    $value: "{color.global-transparent}",
    $type: "color",
    $description: "Background of a disabled previous/next control.",
  },
  "canvas-selected": {
    $value: "{accent-primary.500}",
    $type: "color",
    $description: "Background of the current page item (aria-current).",
  },

  // Item border
  "border-color": {
    $value: "{color.global-transparent}",
    $type: "color",
    $description: "Item border color at rest.",
  },
  "border-color-hover": {
    $value: "{color.global-transparent}",
    $type: "color",
    $description: "Item border color when hovered.",
  },
  "border-color-active": {
    $value: "{color.global-transparent}",
    $type: "color",
    $description: "Item border color when pressed.",
  },
  "border-color-disabled": {
    $value: "{color.global-transparent}",
    $type: "color",
    $description: "Border color of a disabled previous/next control.",
  },
  "border-color-selected": {
    $value: "{accent-primary.500}",
    $type: "color",
    $description: "Border color of the current page item (aria-current).",
  },
  "border-width": {
    $value: "{border.width-sm}",
    $type: "dimension",
    $description: "Item border width.",
  },
  "border-style": {
    $value: "{border.style}",
    $type: "borderStyle",
    $description: "Item border style.",
  },
  "border-radius": {
    $value: "{border.radius-md}",
    $type: "dimension",
    $description: "Item corner radius.",
  },

  // Typography (set on the nav; items inherit)
  "font-family": {
    $value: "{font-family.interface}",
    $type: "fontFamily",
    $description: "Font family for pagination content.",
  },
  "font-size": {
    $value: "{font-size.md}",
    $type: "cssDimension",
    $description: "Base font size for pagination content.",
  },
  "font-weight": {
    $value: "{font-weight.medium}",
    $type: "fontWeight",
    $description: "Font weight for pagination content.",
  },
  "line-height": {
    $value: "{line-height.2}",
    $type: "lineHeight",
    $description: "Line height for pagination content.",
  },

  // Layout
  display: {
    $value: "inline-flex",
    $type: "display",
    $description: "Display mode for the pagination nav.",
  },
  gap: {
    $value: "{spacing.2xs}",
    $type: "dimension",
    $description: "Gap between pagination items.",
  },
  "min-width": {
    $value: "{a11y.min-interaction-size}",
    $type: "dimension",
    $description: "Minimum item width to keep the tap target.",
  },
  "min-height": {
    $value: "{a11y.min-interaction-size}",
    $type: "dimension",
    $description: "Minimum item height to keep the tap target.",
  },
  "padding-inline": {
    $value: "{spacing.2xs}",
    $type: "dimension",
    $description: "Inline padding inside each item.",
  },
  "padding-block": {
    $value: "{spacing.2xs}",
    $type: "dimension",
    $description: "Block padding inside each item.",
  },

  // Sub-elements
  "icon-size": {
    $value: "{pagination.font-size}",
    $type: "cssDimension",
    $description: "Size of the previous/next glyphs (drawn or slotted).",
  },
  "ellipsis-ink": {
    $value: "{app.ink-subtle}",
    $type: "color",
    $description: "Color of the non-interactive ellipsis separators.",
  },
  "status-ink": {
    $value: "{app.ink}",
    $type: "color",
    $description: 'Color of the compact-mode "Page X of Y" status text.',
  },

  // Focus
  "focus-color": {
    $value: "{focus.color}",
    $type: "color",
    $description: "Outline color for a focused item.",
  },
  "focus-width": {
    $value: "{focus.width}",
    $type: "dimension",
    $description: "Outline width for a focused item.",
  },
  "focus-offset": {
    $value: "{focus.offset}",
    $type: "dimension",
    $description: "Outline offset for a focused item.",
  },

  // Transitions
  "transition-property": {
    $value: "background-color, color, border-color, outline",
    $type: "transitionProperty",
    $description: "CSS properties that animate on item interaction.",
  },
  "transition-duration": {
    $value: { value: 150, unit: "ms" },
    $type: "duration",
    $description: "Duration for item hover/active transitions.",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  "transition-timing-function": {
    $value: "ease-out",
    $type: "transitionTimingFunction",
    $description: "Timing function for item transitions.",
  },

  // Interaction behavior
  cursor: {
    $value: "pointer",
    $type: "utility",
    $description: "Cursor over interactive pagination items.",
  },
} as const satisfies Record<PaginationTokenKey, TokenObject>;

export default tokens;
