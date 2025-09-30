# `<z-button>`

`<z-button>` is a Web Component that wraps the native `<button>` element with
Zebkit's interaction patterns, accessibility affordances, and design tokens.
It supports variants, size presets, icon placement, and design token driven
theming.

## Installation & Registration

1. Install the `zebkit` package and its styles:

   ```bash
   npm install zebkit
   ```

2. Import the component and define the custom element **once** in your
   application bootstrap:

   ```ts
   import { defineZButton } from "zebkit/src/core/button";
   import "zebkit/zebkit.css"; // global tokens & component styles

   defineZButton();
   ```

   The helper will no-op if `<z-button>` is already registered, so it is safe to
   call from multiple modules.

## Usage

### Basic button

```html
<z-button>Save changes</z-button>
```

### Icon slot

Supply any element with `slot="icon"`. The component will ensure the icon is
placed before the label by default or after it when `icon-position="end"`.

```html
<z-button variant="raised">
  <svg slot="icon" viewBox="0 0 16 16" aria-hidden="true">...</svg>
  Upload file
</z-button>

<z-button icon-position="end">
  Continue
  <span slot="icon" aria-hidden="true">➡️</span>
</z-button>
```

### Accessibility guidance

- The internal button mirrors `aria-*`, `role`, and `tabindex` attributes set on
  `<z-button>`. Provide an accessible name with `aria-label`, `aria-labelledby`,
  or visible text. When no name is supplied, the component falls back to the
  sanitized text content and logs a warning.
- Meet WCAG target sizing by keeping icons purely decorative (`aria-hidden`) and
  supplementing text labels for ambiguous actions.
- Use the `disabled` attribute to prevent interaction; the component manages the
  correct `aria-disabled` state.

## Attributes & Options

You can configure `<z-button>` declaratively with attributes or programmatically
through `updateOptions`.

| Attribute         | Type / Values                                             | Description |
| ----------------- | --------------------------------------------------------- | ----------- |
| `variant`         | `flat` · `raised` · `outline` · `unstyled` (default `outline`) | Chooses a visual style. |
| `size`            | `xs` · `sm` · `md` · `lg` · `xl` (default `md`)               | Adjusts typography, padding, and focus affordances. |
| `icon-position`   | `start` (default) · `end`                                  | Moves the slotted icon before or after the label. |
| `options`         | JSON string `ZButtonOptions`                               | Bulk apply `iconPosition`, `variant`, and `size`. |
| `(click)`         | Inline handler source                                      | Evaluated when `z-click` fires. Prefer adding listeners via JavaScript in frameworks. |
| `disabled`        | Boolean                                                    | Disables the internal button and sets `aria-disabled="true"`. |

> **Tip:** Options passed through `options="{...}"` are merged with individual
> attributes. Invalid values are ignored with console warnings to aid debugging.

## Events

| Event name | Payload       | Description |
| ---------- | -------------- | ----------- |
| `z-click`  | `CustomEvent<Event>` | Fired when the internal button triggers a native `click`. Bubbles and composes so upstream frameworks can listen. |

## Public methods

All methods are available on the element instance (e.g. via
`document.querySelector('z-button')`).

| Method | Signature | Purpose |
| ------ | --------- | ------- |
| `setDisabledState` | `(isDisabled: boolean) => void` | Programmatically enable/disable the button and maintain ARIA state. |
| `getDisabledState` | `() => boolean` | Returns the current disabled flag. |
| `updateOptions` | `(newOptions: Partial<ZButtonOptions>) => void` | Merge and apply option overrides at runtime. |
| `setButtonText` | `(text: string) => void` | Replace the button label and update the fallback accessible name when appropriate. |
| `getButtonText` | `() => string` | Retrieve the current textual label. |
| `setAriaPressed` | `(isPressed: boolean) => void` | Manage toggle button `aria-pressed`. |
| `setAriaExpanded` | `(isExpanded: boolean) => void` | Manage disclosure button `aria-expanded`. |

## Design token reference

The button styles use CSS custom properties derived from Zebkit's token system.
Override these variables in your theme to adjust visuals consistently.

| Custom property | Visual role |
| --------------- | ----------- |
| `--zbk-btn-font-family` | Base typeface for button text. |
| `--zbk-btn-font-size` · `--zbk-btn-line-height` | Default typography scale for `md` buttons. Size-specific tokens (`--zbk-btn-xs-*`, `--zbk-btn-sm-*`, `--zbk-btn-lg-*`) adjust each preset. |
| `--zbk-btn-border-radius` | Corner radius of the button surface; size variants have dedicated overrides. |
| `--zbk-btn-padding-x` · `--zbk-btn-padding-y` | Horizontal and vertical spacing inside the button. |
| `--zbk-btn-icon-font-size` · size variants | Icon sizing for elements slotted into `icon`. |
| `--zbk-btn-icon-stroke-width` | Stroke weight for vector icons to harmonize with text weight. |
| `--zbk-btn-border-width` | Stroke width for the outline; variants override when needed. |
| `--zbk-btn-gap` | Space between icon and label. |
| `--zbk-btn-background` · `--zbk-btn-background-hover` | Surface color in idle and hover/active states. |
| `--zbk-btn-border-color` · `--zbk-btn-border-color-hover` · `--zbk-btn-border-color-selected` | Border colors for default, hover/active, and selected states. |
| `--zbk-btn-foreground` | Text and icon color. |
| `--zbk-btn-focus-color` · `--zbk-focus-width` · `--zbk-focus-offset` | Outline accent when the button receives focus. |
| `--zbk-btn-offset-color` | Color of the raised edge shadow for `raised` and hover states. |
| `--zbk-btn-raised-amount` | Vertical translation distance used for raised/hover elevation. |

To theme the button, set these properties on any ancestor (e.g. `:root` or a
scoped wrapper) so the component inherits them without shadow DOM boundaries.
