import type { LayerName } from "@definitions/layers";
import type { TokenObject } from "@definitions/tokens";

/**
 * Zebkit input design tokens. The module key is fixed to `input` so these
 * values become `--zbk-input-*` CSS custom properties during the token build.
 * Tokens stay declarative and can be referenced with dot-notation overrides.
 */
export const key = "input";
export const layer: LayerName = "base";

export type InputTokenKey =
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
  | 'line-height'
  | 'letter-spacing'
  | 'label-ink'
  | 'label-ink-disabled'
  | 'label-font-size'
  | 'label-font-weight'
  | 'label-gap'
  | 'affix-ink'
  | 'affix-ink-disabled'
  | 'icon-size'
  | 'padding-inline'
  | 'padding-block'
  | 'gap'
  | 'width'
  | 'min-width'
  | 'max-width'
  | 'min-height'
  | 'group-gap'
  | 'group-direction'
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
    value: "contents",
    type: "display",
    description: "Display mode for the <zbk-input> host element.",
  },

  // Field box background
  canvas: {
    value: "{app.canvas}",
    type: "color",
    description: "Background of the field box.",
  },
  "canvas-hover": {
    value: "{app.canvas}",
    type: "color",
    description: "Field background when hovered.",
  },
  "canvas-focus": {
    value: "{app.canvas}",
    type: "color",
    description: "Field background while focused.",
  },
  "canvas-active": {
    value: "{input.canvas-focus}",
    type: "color",
    description: "Field background while pressed (pointer down before focus).",
  },
  "canvas-disabled": {
    value: "{disabled.canvas}",
    type: "color",
    description: "Field background when disabled.",
  },
  "canvas-readonly": {
    value: "{app.canvas-subtle}",
    type: "color",
    description: "Field background when readonly.",
  },
  "canvas-invalid": {
    value: "{input.canvas}",
    type: "color",
    description: "Field background when the value is invalid (after interaction).",
  },

  // Entered text
  ink: {
    value: "{app.ink}",
    type: "color",
    description: "Color of the entered text.",
  },
  "ink-disabled": {
    value: "{disabled.ink}",
    type: "color",
    description: "Entered-text color when disabled.",
  },
  "ink-readonly": {
    value: "{app.ink-muted}",
    type: "color",
    description: "Entered-text color when readonly.",
  },
  "ink-invalid": {
    value: "{input.ink}",
    type: "color",
    description: "Entered-text color when the value is invalid.",
  },
  "placeholder-ink": {
    value: "{app.ink-subtle}",
    type: "color",
    description: "Placeholder text color.",
  },
  "placeholder-ink-disabled": {
    value: "{disabled.ink}",
    type: "color",
    description: "Placeholder text color when disabled.",
  },
  "caret-color": {
    value: "{accent-primary.500}",
    type: "color",
    description: "Color of the text insertion caret.",
  },

  // Field border
  "border-color": {
    value: "{app.border-emphasis}",
    type: "color",
    description: "Border color of the field box.",
  },
  "border-color-hover": {
    value: "{accent-primary.400}",
    type: "color",
    description: "Field border color when hovered.",
  },
  "border-color-focus": {
    value: "{accent-primary.500}",
    type: "color",
    description: "Field border color while focused.",
  },
  "border-color-active": {
    value: "{input.border-color-focus}",
    type: "color",
    description: "Field border color while pressed.",
  },
  "border-color-disabled": {
    value: "{disabled.border}",
    type: "color",
    description: "Field border color when disabled.",
  },
  "border-color-readonly": {
    value: "{app.border-muted}",
    type: "color",
    description: "Field border color when readonly.",
  },
  "border-color-invalid": {
    value: "{critical.border-emphasis}",
    type: "color",
    description: "Field border color when the value is invalid.",
  },
  "border-width": {
    value: "{border.width-sm}",
    type: "borderWidth",
    description: "Border thickness of the field box.",
  },
  "border-style": {
    value: "{border.style}",
    type: "borderStyle",
    description: "Border style of the field box.",
  },
  "border-radius": {
    value: "{border.radius-md}",
    type: "borderRadius",
    description: "Corner radius of the field box.",
  },

  // Entered-text typography
  "font-family": {
    value: "{font-family.interface}",
    type: "fontFamily",
    description: "Font family for the entered text.",
  },
  "font-size": {
    value: "{font-size.md}",
    type: "fontSize",
    description: "Font size for the entered text.",
  },
  "font-weight": {
    value: "{font-weight.normal}",
    type: "fontWeight",
    description: "Font weight for the entered text.",
  },
  "line-height": {
    value: "{line-height.2}",
    type: "lineHeight",
    description: "Line height for the entered text.",
  },
  "letter-spacing": {
    value: "{tracking.normal}",
    type: "letterSpacing",
    description: "Letter spacing for the entered text.",
  },

  // Label
  "label-ink": {
    value: "{app.ink}",
    type: "color",
    description: "Label text color.",
  },
  "label-ink-disabled": {
    value: "{disabled.ink}",
    type: "color",
    description: "Label text color when disabled.",
  },
  "label-font-size": {
    value: "{font-size.sm}",
    type: "fontSize",
    description: "Font size for the label.",
  },
  "label-font-weight": {
    value: "{font-weight.medium}",
    type: "fontWeight",
    description: "Font weight for the label.",
  },
  "label-gap": {
    value: "{spacing.2xs}",
    type: "spacing",
    description: "Space between the label and the field box.",
  },

  // Affixes (prefix/suffix slots)
  "affix-ink": {
    value: "{app.ink-muted}",
    type: "color",
    description: "Color of prefix/suffix affix content (icon fonts and currentColor SVGs inherit it).",
  },
  "affix-ink-disabled": {
    value: "{disabled.ink}",
    type: "color",
    description: "Affix color when disabled.",
  },
  "icon-size": {
    value: "1em",
    type: "sizing",
    description:
      "Size of slotted affix content (prefix/suffix slots); 1em tracks the field's font-size so size variants rescale it.",
  },

  // Internal layout
  "padding-inline": {
    value: "{spacing.sm}",
    type: "spacing",
    description: "Inline (horizontal) padding of the field box.",
  },
  "padding-block": {
    value: "{spacing.2xs}",
    type: "spacing",
    description: "Block (vertical) padding of the field box.",
  },
  gap: {
    value: "{spacing.2xs}",
    type: "spacing",
    description: "Space between affixes and the entered text.",
  },

  // Sizing
  width: {
    value: "auto",
    type: "sizing",
    description: "Width of the field box.",
  },
  "min-width": {
    value: "0",
    type: "sizing",
    description: "Minimum width of the field box.",
  },
  "max-width": {
    value: "100%",
    type: "sizing",
    description: "Maximum width of the field box.",
  },
  "min-height": {
    value: "44px",
    type: "sizing",
    description: "Minimum field height to ensure a tappable area.",
  },

  // Grouping
  "group-gap": {
    value: "{spacing.md}",
    type: "spacing",
    description: "Gap between fields in a .zbk-input-group.",
  },
  "group-direction": {
    value: "column",
    type: "flex",
    description: "Flow direction of a .zbk-input-group (column or row).",
  },

  // Focus ring
  "focus-color": {
    value: "{focus.color}",
    type: "color",
    description: "Outline color for keyboard focus.",
  },
  "focus-width": {
    value: "{focus.width}",
    type: "borderWidth",
    description: "Outline width for keyboard focus.",
  },
  "focus-offset": {
    value: "{focus.offset}",
    type: "spacing",
    description: "Outline offset for keyboard focus.",
  },

  // Shadow / lift physics (default flat; themes can add depth)
  "box-shadow": {
    value: "none",
    type: "boxShadow",
    description: "Default field shadow.",
  },
  "box-shadow-hover": {
    value: "none",
    type: "boxShadow",
    description: "Field shadow when hovered.",
  },
  "box-shadow-focus": {
    value: "none",
    type: "boxShadow",
    description: "Field shadow while focused (in addition to the outline).",
  },
  "box-shadow-active": {
    value: "none",
    type: "boxShadow",
    description: "Field shadow while pressed.",
  },
  "box-shadow-invalid": {
    value: "none",
    type: "boxShadow",
    description: "Field shadow when the value is invalid.",
  },

  // Interaction behavior
  cursor: {
    value: "text",
    type: "utility",
    description: "Cursor over the editable field.",
  },
  "cursor-disabled": {
    value: "not-allowed",
    type: "utility",
    description: "Cursor over a disabled field.",
  },

  // Transitions
  "transition-duration": {
    value: "{transition.calm-fx-duration-default}",
    type: "transition",
    description: "Duration for field state transitions.",
    a11y: true,
  },
  "transition-timing-function": {
    value: "{transition.calm-fx-function-default}",
    type: "transition",
    description: "Easing for field state transitions.",
  },
  "transition-property": {
    value: "background-color, border-color, box-shadow, outline",
    type: "transition",
    description: "CSS properties that animate on state changes.",
  },
  "transition-delay": {
    value: "0",
    type: "transition",
    description: "Delay before field transitions run.",
  },

  // Other
  opacity: {
    value: 1,
    type: "opacity",
    description: "Opacity of the field.",
  },
  "opacity-disabled": {
    value: "{opacity.70}",
    type: "opacity",
    description: "Field opacity when disabled.",
  },
} as const satisfies Record<InputTokenKey, TokenObject>;

export default tokens;
