---
title: Button
description: Zebkit’s token-driven button component and utility patterns.
---

Zebkit buttons provide a semantic, token-aligned call to action. Use them for primary flows, secondary actions, destructive
confirmation, and inline controls while keeping styling driven entirely by CSS variables and utility classes.

## Usage

You can use the custom element (`<zbk-button>`) or apply the `.zbk-button` class to a native `<button>`. The web component wraps an
inner button, mirrors classes, and syncs accessibility attributes so both approaches share the same styling and semantics.

```html
<zbk-button>
  Save changes
</zbk-button>

<!-- Semantic HTML without the custom element -->
<button class="zbk-button">Save changes</button>
```

### Variants and composition

- Base appearance comes from component tokens (`--zbk-button-background`, `--zbk-button-color`, `--zbk-button-border-color`).
- State tokens drive interaction: `--zbk-button-background-hover`, `--zbk-button-color-active`, `--zbk-button-border-color-hover`,
  and focus ring tokens like `--zbk-button-focus-color` and `--zbk-button-focus-width`.
- Layout tokens keep tap targets consistent: `--zbk-button-min-height`, `--zbk-button-padding-inline`, and
  `--zbk-button-padding-block` ensure a minimum 44px hit area.

```html
<zbk-button class="canvas-brand ink-brand focus:border-brand-inverse">
  <span class="zbk-button__icon" aria-hidden="true">★</span>
  Primary
</zbk-button>
```

Use color utilities to align the component with the active palette, or override component tokens inline for playgrounds and quick
experiments:

```html
<button
  class="zbk-button"
  style="--zbk-button-background: var(--zbk-color-brand-500); --zbk-button-border-radius: var(--zbk-spacing-05);"
>
  Token-tuned button
</button>
```

## States

Button styles react to standard interaction and accessibility states:

- **Hover**: applies `--zbk-button-color-hover`, `--zbk-button-background-hover`, `--zbk-button-border-color-hover`, and
  `--zbk-button-box-shadow-hover`.
- **Active/pressed**: uses `--zbk-button-color-active`, `--zbk-button-background-active`, and the selected border color token.
- **Focus-visible**: draws an outline from `--zbk-button-focus-color`, width, and offset tokens, plus optional
  `--zbk-button-box-shadow-focus`.
- **Disabled**: both native `disabled` and `aria-disabled="true"` routes share the disabled color tokens, remove shadows, and
  prevent pointer events.

## Accessibility

- The custom element mirrors accessibility attributes (`aria-label`, `aria-describedby`, `aria-pressed`, `aria-expanded`,
  `aria-controls`, `role`, `tabindex`) to the inner button, so consumers can set them on the host.
- Focus styles rely on `:focus-visible` to avoid outlining mouse clicks while remaining keyboard-obvious.
- Disabled handling respects both native disabling and `aria-disabled` for situations where you need to prevent activation but
  maintain focusability.

## Tokens

Button tokens are exposed as `--zbk-button-*` CSS custom properties and map back to component defaults:

- **Color + background**: `color`, `color-hover`, `color-active`, `color-disabled`, `background`, `background-hover`,
  `background-active`, `background-disabled`, `border-color` (+ hover/selected/disabled).
- **Geometry**: `border-width`, `border-style`, `border-radius`, plus padding tokens (`padding-inline`, `padding-block`,
  directional overrides) and spacing like `gap` and `group-gap`.
- **Typography**: `font-family`, `font-size`, `font-weight`, `line-height`, `letter-spacing`, `text-transform`, `text-decoration`,
  `text-align`.
- **Layout + interaction**: sizing tokens (`min-width`, `min-height`), icon sizing (`icon-size`), cursor, flex alignment,
  transitions, shadows, and opacity.
- **Focus**: `focus-color`, `focus-width`, and `focus-offset` control the outline.

Override tokens globally or per-instance to retheme buttons without changing markup.

## Design guidelines

- **Primary vs. secondary**: reserve brand or accent-primary canvases for primary actions; use app or action tokens for secondary
  buttons so hierarchy stays clear.
- **Destructive actions**: combine critical tokens with the button component when the outcome is irreversible. Pair critical ink
  with inverse variants to keep text legible on strong canvases.
- **Density**: adjust padding tokens rather than font sizes to keep tap targets above 44px while matching layout rhythm.

## Implementation notes

- The component observes the `variant` attribute and mirrors host classes onto the inner button, so utility classes and variant
  flags stay in sync across both elements.
- Button groups can rely on `.zbk-button-group` and the `--zbk-button-group-gap` token for consistent spacing between stacked or
  inline buttons.
- All styling flows through CSS variables; prefer overriding tokens (via inline styles or theme layers) instead of editing the
  component stylesheet.
