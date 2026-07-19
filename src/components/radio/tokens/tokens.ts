import type { LayerName } from "@definitions/layers";
import type { TokenObject } from "@definitions/tokens";

/**
 * Zebkit radio design tokens. The module key is fixed to `radio` so these
 * values become `--zbk-radio-*` CSS custom properties during the token build.
 * Tokens stay declarative and can be referenced with dot-notation overrides.
 */
export const key = "radio";
export const layer: LayerName = "base";

export type RadioTokenKey =
  'display'
  | 'control-width'
  | 'control-height'
  | 'canvas'
  | 'canvas-hover'
  | 'canvas-active'
  | 'canvas-checked'
  | 'canvas-disabled'
  | 'border-color'
  | 'border-color-hover'
  | 'border-color-active'
  | 'border-color-checked'
  | 'border-color-disabled'
  | 'border-width'
  | 'border-style'
  | 'border-radius'
  | 'indicator-color'
  | 'indicator-color-disabled'
  | 'indicator-size'
  | 'indicator-radius'
  | 'ink'
  | 'ink-disabled'
  | 'font-family'
  | 'font-size'
  | 'font-weight'
  | 'line-height'
  | 'letter-spacing'
  | 'gap'
  | 'align-items'
  | 'group-gap'
  | 'group-direction'
  | 'focus-color'
  | 'focus-width'
  | 'focus-offset'
  | 'box-shadow'
  | 'box-shadow-hover'
  | 'box-shadow-active'
  | 'box-shadow-checked'
  | 'box-shadow-focus'
  | 'cursor'
  | 'cursor-disabled'
  | 'transition-duration'
  | 'transition-timing-function'
  | 'transition-property'
  | 'transition-delay'
  | 'opacity'
  | 'opacity-disabled';

const tokens = {
  // Host layout: the label is the layout root, so the host gets out of the way.
  display: {
    $value: "contents",
    $type: "display",
    $description: "Display mode for the <zbk-radio> host element.",
  },

  // Control geometry. Width and height stay independently addressable.
  "control-width": {
    $value: "{spacing.105}",
    $type: "dimension",
    $description: "Width of the radio control.",
  },
  "control-height": {
    $value: "{spacing.105}",
    $type: "dimension",
    $description: "Height of the radio control.",
  },

  // Control background
  canvas: {
    $value: "{app.canvas}",
    $type: "color",
    $description: "Background of an unselected radio control.",
  },
  "canvas-hover": {
    $value: "{app.canvas-subtle}",
    $type: "color",
    $description: "Control background when hovered.",
  },
  "canvas-active": {
    $value: "{app.canvas-muted}",
    $type: "color",
    $description: "Control background while pressed.",
  },
  "canvas-checked": {
    $value: "{accent-primary.500}",
    $type: "color",
    $description: "Control background when selected.",
  },
  "canvas-disabled": {
    $value: "{disabled.canvas}",
    $type: "color",
    $description: "Control background when disabled.",
  },

  // Control border
  "border-color": {
    $value: "{app.border-emphasis}",
    $type: "color",
    $description: "Border color of an unselected radio control.",
  },
  "border-color-hover": {
    $value: "{accent-primary.400}",
    $type: "color",
    $description: "Control border color when hovered.",
  },
  "border-color-active": {
    $value: "{accent-primary.500}",
    $type: "color",
    $description: "Control border color while pressed.",
  },
  "border-color-checked": {
    $value: "{radio.canvas-checked}",
    $type: "color",
    $description: "Control border color when selected.",
  },
  "border-color-disabled": {
    $value: "{disabled.border}",
    $type: "color",
    $description: "Control border color when disabled.",
  },
  "border-width": {
    $value: "{border.width-md}",
    $type: "dimension",
    $description: "Border thickness of the radio control.",
  },
  "border-style": {
    $value: "{border.style}",
    $type: "borderStyle",
    $description: "Border style of the radio control.",
  },
  "border-radius": {
    $value: "50%",
    $type: "cssDimension",
    $description: "Corner radius of the radio control (a circle by default).",
  },

  // Indicator (the dot)
  "indicator-color": {
    $value: "{app.ink-inverse}",
    $type: "color",
    $description: "Color of the selection dot.",
  },
  "indicator-color-disabled": {
    $value: "{disabled.ink}",
    $type: "color",
    $description: "Selection dot color when disabled.",
  },
  "indicator-size": {
    $value: "0.75em",
    $type: "cssDimension",
    $description:
      "Diameter of the selection dot and size of slotted indicator content; em-based so size variants rescale it through font-size.",
  },
  "indicator-radius": {
    $value: "50%",
    $type: "cssDimension",
    $description: "Corner radius of the selection dot (a circle by default).",
  },

  // Label
  ink: {
    $value: "{app.ink}",
    $type: "color",
    $description: "Label text color.",
  },
  "ink-disabled": {
    $value: "{disabled.ink}",
    $type: "color",
    $description: "Label text color when disabled.",
  },
  "font-family": {
    $value: "{font-family.interface}",
    $type: "fontFamily",
    $description: "Font family for the radio label.",
  },
  "font-size": {
    $value: "{font-size.md}",
    $type: "cssDimension",
    $description: "Font size for the radio label.",
  },
  "font-weight": {
    $value: "{font-weight.normal}",
    $type: "fontWeight",
    $description: "Font weight for the radio label.",
  },
  "line-height": {
    $value: "{line-height.2}",
    $type: "lineHeight",
    $description: "Line height for the radio label.",
  },
  "letter-spacing": {
    $value: "{tracking.normal}",
    $type: "cssDimension",
    $description: "Letter spacing for the radio label.",
  },

  // Layout
  gap: {
    $value: "{spacing.sm}",
    $type: "dimension",
    $description: "Space between the control and its label.",
  },
  "align-items": {
    $value: "center",
    $type: "flex",
    $description: "Cross-axis alignment of control and label.",
  },
  "group-gap": {
    $value: "{spacing.md}",
    $type: "dimension",
    $description: "Gap between radios in a .zbk-radio-group.",
  },
  "group-direction": {
    $value: "column",
    $type: "flex",
    $description: "Flow direction of a .zbk-radio-group (column or row).",
  },

  // Focus ring
  "focus-color": {
    $value: "{focus.color}",
    $type: "color",
    $description: "Outline color for keyboard focus.",
  },
  "focus-width": {
    $value: "{focus.width}",
    $type: "dimension",
    $description: "Outline width for keyboard focus.",
  },
  "focus-offset": {
    $value: "{focus.offset}",
    $type: "dimension",
    $description: "Outline offset for keyboard focus.",
  },

  // Shadow / lift physics (default flat; themes can add press/lift depth)
  "box-shadow": {
    $value: [],
    $type: "shadow",
    $description: "Default control shadow.",
  },
  "box-shadow-hover": {
    $value: [],
    $type: "shadow",
    $description: "Control shadow when hovered.",
  },
  "box-shadow-active": {
    $value: [],
    $type: "shadow",
    $description: "Control shadow while pressed.",
  },
  "box-shadow-checked": {
    $value: [],
    $type: "shadow",
    $description: "Control shadow when selected.",
  },
  "box-shadow-focus": {
    $value: [],
    $type: "shadow",
    $description: "Control shadow in the focus state (in addition to the outline).",
  },

  // Interaction behavior
  cursor: {
    $value: "pointer",
    $type: "utility",
    $description: "Cursor when hovering an enabled radio.",
  },
  "cursor-disabled": {
    $value: "not-allowed",
    $type: "utility",
    $description: "Cursor when hovering a disabled radio.",
  },

  // Transitions
  "transition-duration": {
    $value: "{transition.playful-fx-duration-default}",
    $type: "duration",
    $description: "Duration for radio state transitions.",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  "transition-timing-function": {
    $value: "{transition.playful-fx-function-default}",
    $type: "cubicBezier",
    $description: "Easing for radio state transitions.",
  },
  "transition-property": {
    $value: "background-color, border-color, box-shadow, transform, opacity, outline",
    $type: "transitionProperty",
    $description: "CSS properties that animate on state changes.",
  },
  "transition-delay": {
    $value: { value: 0, unit: "ms" },
    $type: "duration",
    $description: "Delay before radio transitions run.",
  },

  // Other
  opacity: {
    $value: 1,
    $type: "opacity",
    $description: "Opacity of the radio.",
  },
  "opacity-disabled": {
    $value: "{opacity.70}",
    $type: "opacity",
    $description: "Control opacity when disabled.",
  },
} as const satisfies Record<RadioTokenKey, TokenObject>;

export default tokens;
