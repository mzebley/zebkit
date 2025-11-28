# `<zbk-button>`

`<zbk-button>` wraps a native `<button>` element with Zebkit's interaction
patterns, accessibility affordances, design tokens, and variant classes.

## Installation & Registration

1. Install the `zebkit` package and its styles:

   ```bash
   npm install zebkit
   ```

2. Import the component and define the custom element **once** in your
   application bootstrap:

   ```ts
   import { defineZbkButton } from "zebkit/src/core/button";
   import "zebkit/zebkit.css"; // global tokens & component styles

   defineZbkButton();
   ```

   The helper will no-op if `<zbk-button>` is already registered, so it is safe to
   call from multiple modules.

## Usage

### Basic button

```html
<zbk-button>Save changes</zbk-button>
```

### Icon slot (auto-tagged)

Supply any element with `slot="icon"`. The component will add `.zbk-icon`
automatically if it is missing. You control placement by the order of children;
there is no `icon-position` attribute.

```html
<zbk-button variant="raised outline">
  <svg slot="icon" viewBox="0 0 16 16" aria-hidden="true">...</svg>
  Upload file
</zbk-button>

<zbk-button>
  Continue
  <span slot="icon" aria-hidden="true">➡️</span>
</zbk-button>
```

### Variants (space or comma separated)

The `variant` attribute accepts multiple values (space or comma separated). Each
value maps to a class of the form `zbk-button--{name}`. Registered variants
(e.g., `large`) also apply any className override provided in their config.

```html
<zbk-button variant="outline large">Outline + Large</zbk-button>
```

### Accessibility guidance

- The internal button mirrors `aria-*`, `role`, and `tabindex` attributes set
  on `<zbk-button>`. Provide an accessible name with `aria-label`,
  `aria-labelledby`, or visible text. When no name is supplied, the component
  falls back to the sanitized text content and logs a warning.
- Meet WCAG target sizing by keeping icons purely decorative (`aria-hidden`) and
  supplementing text labels for ambiguous actions.
- Use the `disabled` attribute to prevent interaction; the component manages the
  correct `aria-disabled` state.

## Attributes & Options

You can configure `<zbk-button>` declaratively with attributes or programmatically
through `updateOptions`.

| Attribute  | Type / Values                         | Description |
| ---------- | ------------------------------------- | ----------- |
| `variant`  | Space/comma separated variant names   | Each name maps to `zbk-button--{name}` plus any registered overrides. |
| `options`  | JSON string `ZButtonOptions`          | Bulk apply `variant` array. |
| `(click)`  | Inline handler source                 | Evaluated when `z-click` fires. Prefer adding listeners via JavaScript in frameworks. |
| `disabled` | Boolean                               | Disables the internal button and sets `aria-disabled="true"`. |

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
Tokens live under `src/core/button/tokens/` with a Zod schema at
`token-schema.ts`. The token builder emits CSS variables using the `zbk-button`
prefix; variants scope overrides with classes like `.zbk-button--large`. Override
the emitted variables in your theme to adjust visuals consistently.
