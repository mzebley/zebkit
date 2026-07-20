import type { LayerName } from "@definitions/layers";
import type { TokenObject } from "@definitions/tokens";

/**
 * Zebkit textarea design tokens. The module key is fixed to `textarea` so these
 * values become `--zbk-textarea-*` CSS custom properties during the token build.
 * Tokens stay declarative and can be referenced with dot-notation overrides.
 */
export const key = "textarea";
export const layer: LayerName = "base";

export type TextareaTokenKey =
  'display'
  | 'canvas'
  | 'canvas-hover'
  | 'canvas-focus'
  | 'canvas-active'
  | 'canvas-disabled'
  | 'canvas-readonly'
  | 'canvas-invalid'
  | 'ink'
  | 'ink-disabled'
  | 'ink-readonly'
  | 'ink-invalid'
  | 'placeholder-ink'
  | 'placeholder-ink-disabled'
  | 'caret-color'
  | 'border-color'
  | 'border-color-hover'
  | 'border-color-focus'
  | 'border-color-active'
  | 'border-color-disabled'
  | 'border-color-readonly'
  | 'border-color-invalid'
  | 'border-width'
  | 'border-style'
  | 'border-radius'
  | 'font-family'
  | 'font-size'
  | 'font-weight'
  | 'field-line-height'
  | 'letter-spacing'
  | 'label-ink'
  | 'label-ink-disabled'
  | 'label-font-size'
  | 'label-font-weight'
  | 'label-gap'
  | 'padding-inline'
  | 'padding-block'
  | 'resize'
  | 'width'
  | 'min-width'
  | 'max-width'
  | 'min-block-size'
  | 'focus-color'
  | 'focus-width'
  | 'focus-offset'
  | 'box-shadow'
  | 'box-shadow-hover'
  | 'box-shadow-focus'
  | 'box-shadow-active'
  | 'box-shadow-invalid'
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
    $description: "Display mode for the <zbk-textarea> host element.",
  },

  // Field box background
  canvas: {
    $value: "{app.canvas}",
    $type: "color",
    $description: "Background of the field box.",
  },
  "canvas-hover": {
    $value: "{app.canvas}",
    $type: "color",
    $description: "Field background when hovered.",
  },
  "canvas-focus": {
    $value: "{app.canvas}",
    $type: "color",
    $description: "Field background while focused.",
  },
  "canvas-active": {
    $value: "{textarea.canvas-focus}",
    $type: "color",
    $description: "Field background while pressed (pointer down before focus).",
  },
  "canvas-disabled": {
    $value: "{disabled.canvas}",
    $type: "color",
    $description: "Field background when disabled.",
  },
  "canvas-readonly": {
    $value: "{app.canvas-subtle}",
    $type: "color",
    $description: "Field background when readonly.",
  },
  "canvas-invalid": {
    $value: "{textarea.canvas}",
    $type: "color",
    $description: "Field background when the value is invalid (after interaction).",
  },

  // Entered text
  ink: {
    $value: "{app.ink}",
    $type: "color",
    $description: "Color of the entered text.",
  },
  "ink-disabled": {
    $value: "{disabled.ink}",
    $type: "color",
    $description: "Entered-text color when disabled.",
  },
  "ink-readonly": {
    $value: "{app.ink-muted}",
    $type: "color",
    $description: "Entered-text color when readonly.",
  },
  "ink-invalid": {
    $value: "{textarea.ink}",
    $type: "color",
    $description: "Entered-text color when the value is invalid.",
  },
  "placeholder-ink": {
    $value: "{app.ink-subtle}",
    $type: "color",
    $description: "Placeholder text color.",
  },
  "placeholder-ink-disabled": {
    $value: "{disabled.ink}",
    $type: "color",
    $description: "Placeholder text color when disabled.",
  },
  "caret-color": {
    $value: "{accent-primary.500}",
    $type: "color",
    $description: "Color of the text insertion caret.",
  },

  // Field border
  "border-color": {
    $value: "{app.border-emphasis}",
    $type: "color",
    $description: "Border color of the field box.",
  },
  "border-color-hover": {
    $value: "{accent-primary.400}",
    $type: "color",
    $description: "Field border color when hovered.",
  },
  "border-color-focus": {
    $value: "{accent-primary.500}",
    $type: "color",
    $description: "Field border color while focused.",
  },
  "border-color-active": {
    $value: "{textarea.border-color-focus}",
    $type: "color",
    $description: "Field border color while pressed.",
  },
  "border-color-disabled": {
    $value: "{disabled.border}",
    $type: "color",
    $description: "Field border color when disabled.",
  },
  "border-color-readonly": {
    $value: "{app.border-muted}",
    $type: "color",
    $description: "Field border color when readonly.",
  },
  "border-color-invalid": {
    $value: "{critical.border-emphasis}",
    $type: "color",
    $description: "Field border color when the value is invalid.",
  },
  "border-width": {
    $value: "{border.width-sm}",
    $type: "dimension",
    $description: "Border thickness of the field box.",
  },
  "border-style": {
    $value: "{border.style}",
    $type: "strokeStyle",
    $description: "Border style of the field box.",
  },
  "border-radius": {
    $value: "{border.radius-md}",
    $type: "dimension",
    $description: "Corner radius of the field box.",
  },

  // Entered-text typography
  "font-family": {
    $value: "{font-family.interface}",
    $type: "fontFamily",
    $description: "Font family for the entered text.",
  },
  "font-size": {
    $value: "{font-size.md}",
    $type: "cssDimension",
    $description: "Font size for the entered text.",
  },
  "font-weight": {
    $value: "{font-weight.normal}",
    $type: "fontWeight",
    $description: "Font weight for the entered text.",
  },
  "field-line-height": {
    $value: "{line-height.2}",
    $type: "number",
    $description: "Line height of the entered multi-line text.",
  },
  "letter-spacing": {
    $value: "{letter-spacing.normal}",
    $type: "cssDimension",
    $description: "Letter spacing for the entered text.",
  },

  // Label
  "label-ink": {
    $value: "{app.ink}",
    $type: "color",
    $description: "Label text color.",
  },
  "label-ink-disabled": {
    $value: "{disabled.ink}",
    $type: "color",
    $description: "Label text color when disabled.",
  },
  "label-font-size": {
    $value: "{font-size.sm}",
    $type: "cssDimension",
    $description: "Font size for the label.",
  },
  "label-font-weight": {
    $value: "{font-weight.medium}",
    $type: "fontWeight",
    $description: "Font weight for the label.",
  },
  "label-gap": {
    $value: "{spacing.2xs}",
    $type: "dimension",
    $description: "Space between the label and the field box.",
  },

  // Internal layout
  "padding-inline": {
    $value: "{spacing.sm}",
    $type: "dimension",
    $description: "Inline (horizontal) padding of the field box.",
  },
  "padding-block": {
    $value: "{spacing.2xs}",
    $type: "dimension",
    $description: "Block (vertical) padding of the field box.",
  },

  // Field behavior
  resize: {
    $value: "vertical",
    $type: "utility",
    $description:
      "CSS resize behavior of the field (vertical, horizontal, both, none).",
  },

  // Sizing
  width: {
    $value: "auto",
    $type: "cssDimension",
    $description: "Width of the field box.",
  },
  "min-width": {
    $value: "0",
    $type: "cssDimension",
    $description: "Minimum width of the field box.",
  },
  "max-width": {
    $value: "100%",
    $type: "cssDimension",
    $description: "Maximum width of the field box.",
  },
  "min-block-size": {
    $value: { value: 44, unit: "px" },
    $type: "dimension",
    $description: "Minimum field height for a multi-line box; also a tappable floor.",
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

  // Shadow / lift physics (default flat; themes can add depth)
  "box-shadow": {
    $value: [],
    $type: "shadow",
    $description: "Default field shadow.",
  },
  "box-shadow-hover": {
    $value: [],
    $type: "shadow",
    $description: "Field shadow when hovered.",
  },
  "box-shadow-focus": {
    $value: [],
    $type: "shadow",
    $description: "Field shadow while focused (in addition to the outline).",
  },
  "box-shadow-active": {
    $value: [],
    $type: "shadow",
    $description: "Field shadow while pressed.",
  },
  "box-shadow-invalid": {
    $value: [],
    $type: "shadow",
    $description: "Field shadow when the value is invalid.",
  },

  // Interaction behavior
  cursor: {
    $value: "text",
    $type: "utility",
    $description: "Cursor over the editable field.",
  },
  "cursor-disabled": {
    $value: "not-allowed",
    $type: "utility",
    $description: "Cursor over a disabled field.",
  },

  // Transitions
  "transition-duration": {
    $value: "{transition.calm-fx-duration-default}",
    $type: "duration",
    $description: "Duration for field state transitions.",
    $extensions: { "dev.zebkit": { a11y: true } },
  },
  "transition-timing-function": {
    $value: "{transition.calm-fx-function-default}",
    $type: "cubicBezier",
    $description: "Easing for field state transitions.",
  },
  "transition-property": {
    $value: "background-color, border-color, box-shadow, outline",
    $type: "transitionProperty",
    $description: "CSS properties that animate on state changes.",
  },
  "transition-delay": {
    $value: { value: 0, unit: "ms" },
    $type: "duration",
    $description: "Delay before field transitions run.",
  },

  // Other
  opacity: {
    $value: 1,
    $type: "number",
    $description: "Opacity of the field.",
  },
  "opacity-disabled": {
    $value: "{opacity.70}",
    $type: "number",
    $description: "Field opacity when disabled.",
  },
} as const satisfies Record<TextareaTokenKey, TokenObject>;

export default tokens;
