import type { LayerName } from "@definitions/layers";
import type { TokenObject } from "@definitions/tokens";

/**
 * Zebkit checkbox design tokens. The module key is fixed to `checkbox` so these
 * values become `--zbk-checkbox-*` CSS custom properties during the token build.
 * Tokens stay declarative and can be referenced with dot-notation overrides.
 */
export const key = "checkbox";
export const layer: LayerName = "base";

export type CheckboxTokenKey =
  'display'
  | 'control-width'
  | 'control-height'
  | 'canvas'
  | 'canvas-hover'
  | 'canvas-active'
  | 'canvas-checked'
  | 'canvas-indeterminate'
  | 'canvas-disabled'
  | 'border-color'
  | 'border-color-hover'
  | 'border-color-active'
  | 'border-color-checked'
  | 'border-color-indeterminate'
  | 'border-color-disabled'
  | 'border-width'
  | 'border-style'
  | 'border-radius'
  | 'indicator-color'
  | 'indicator-color-disabled'
  | 'indicator-stroke-width'
  | 'indicator-radius'
  | 'indicator-size'
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
    $description: "Display mode for the <zbk-checkbox> host element.",
  },

  // Control geometry. Width and height stay independently addressable so a
  // track-shaped control is a width override, not a new component.
  "control-width": {
    $value: "{spacing.105}",
    $type: "sizing",
    $description: "Width of the checkbox control.",
  },
  "control-height": {
    $value: "{spacing.105}",
    $type: "sizing",
    $description: "Height of the checkbox control.",
  },

  // Control background
  canvas: {
    $value: "{app.canvas}",
    $type: "color",
    $description: "Background of an unchecked checkbox control.",
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
    $description: "Control background when checked.",
  },
  "canvas-indeterminate": {
    $value: "{checkbox.canvas-checked}",
    $type: "color",
    $description: "Control background in the indeterminate state.",
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
    $description: "Border color of an unchecked checkbox control.",
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
    $value: "{checkbox.canvas-checked}",
    $type: "color",
    $description: "Control border color when checked.",
  },
  "border-color-indeterminate": {
    $value: "{checkbox.canvas-indeterminate}",
    $type: "color",
    $description: "Control border color in the indeterminate state.",
  },
  "border-color-disabled": {
    $value: "{disabled.border}",
    $type: "color",
    $description: "Control border color when disabled.",
  },
  "border-width": {
    $value: "{border.width-md}",
    $type: "borderWidth",
    $description: "Border thickness of the checkbox control.",
  },
  "border-style": {
    $value: "{border.style}",
    $type: "borderStyle",
    $description: "Border style of the checkbox control.",
  },
  "border-radius": {
    $value: "{border.radius-xs}",
    $type: "borderRadius",
    $description: "Corner radius of the checkbox control.",
  },

  // Indicator (checkmark + indeterminate bar)
  "indicator-color": {
    $value: "{app.ink-inverse}",
    $type: "color",
    $description: "Color of the checkmark and indeterminate bar.",
  },
  "indicator-color-disabled": {
    $value: "{disabled.ink}",
    $type: "color",
    $description: "Indicator color when disabled.",
  },
  "indicator-stroke-width": {
    $value: "{border.width-md}",
    $type: "borderWidth",
    $description: "Stroke width of the checkmark; also the indeterminate bar's thickness.",
  },
  "indicator-radius": {
    $value: "{border.radius-xs}",
    $type: "borderRadius",
    $description: "Corner radius of the indeterminate bar.",
  },
  "indicator-size": {
    $value: "1em",
    $type: "sizing",
    $description:
      "Size of slotted indicator content (checked/unchecked/indeterminate slots); 1em tracks the component's font-size so size variants rescale it.",
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
    $description: "Font family for the checkbox label.",
  },
  "font-size": {
    $value: "{font-size.md}",
    $type: "fontSize",
    $description: "Font size for the checkbox label.",
  },
  "font-weight": {
    $value: "{font-weight.normal}",
    $type: "fontWeight",
    $description: "Font weight for the checkbox label.",
  },
  "line-height": {
    $value: "{line-height.2}",
    $type: "lineHeight",
    $description: "Line height for the checkbox label.",
  },
  "letter-spacing": {
    $value: "{tracking.normal}",
    $type: "letterSpacing",
    $description: "Letter spacing for the checkbox label.",
  },

  // Layout
  gap: {
    $value: "{spacing.sm}",
    $type: "spacing",
    $description: "Space between the control and its label.",
  },
  "align-items": {
    $value: "center",
    $type: "flex",
    $description: "Cross-axis alignment of control and label.",
  },
  "group-gap": {
    $value: "{spacing.md}",
    $type: "spacing",
    $description: "Gap between checkboxes in a .zbk-checkbox-group.",
  },
  "group-direction": {
    $value: "column",
    $type: "flex",
    $description: "Flow direction of a .zbk-checkbox-group (column or row).",
  },

  // Focus ring
  "focus-color": {
    $value: "{focus.color}",
    $type: "color",
    $description: "Outline color for keyboard focus.",
  },
  "focus-width": {
    $value: "{focus.width}",
    $type: "borderWidth",
    $description: "Outline width for keyboard focus.",
  },
  "focus-offset": {
    $value: "{focus.offset}",
    $type: "spacing",
    $description: "Outline offset for keyboard focus.",
  },

  // Shadow / lift physics (default flat; themes can add press/lift depth)
  "box-shadow": {
    $value: "none",
    $type: "boxShadow",
    $description: "Default control shadow.",
  },
  "box-shadow-hover": {
    $value: "none",
    $type: "boxShadow",
    $description: "Control shadow when hovered.",
  },
  "box-shadow-active": {
    $value: "none",
    $type: "boxShadow",
    $description: "Control shadow while pressed.",
  },
  "box-shadow-checked": {
    $value: "none",
    $type: "boxShadow",
    $description: "Control shadow when checked.",
  },
  "box-shadow-focus": {
    $value: "none",
    $type: "boxShadow",
    $description: "Control shadow in the focus state (in addition to the outline).",
  },

  // Interaction behavior
  cursor: {
    $value: "pointer",
    $type: "utility",
    $description: "Cursor when hovering an enabled checkbox.",
  },
  "cursor-disabled": {
    $value: "not-allowed",
    $type: "utility",
    $description: "Cursor when hovering a disabled checkbox.",
  },

  // Transitions
  "transition-duration": {
    $value: "{transition.playful-fx-duration-default}",
    $type: "transition",
    $description: "Duration for checkbox state transitions.",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  "transition-timing-function": {
    $value: "{transition.playful-fx-function-default}",
    $type: "transition",
    $description: "Easing for checkbox state transitions.",
  },
  "transition-property": {
    $value: "background-color, border-color, box-shadow, transform, opacity, outline",
    $type: "transition",
    $description: "CSS properties that animate on state changes.",
  },
  "transition-delay": {
    $value: "0",
    $type: "transition",
    $description: "Delay before checkbox transitions run.",
  },

  // Other
  opacity: {
    $value: 1,
    $type: "opacity",
    $description: "Opacity of the checkbox.",
  },
  "opacity-disabled": {
    $value: "{opacity.70}",
    $type: "opacity",
    $description: "Control opacity when disabled.",
  },
} as const satisfies Record<CheckboxTokenKey, TokenObject>;

export default tokens;
