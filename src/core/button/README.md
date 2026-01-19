# `<zbk-button>`

`<zbk-button>` wraps a native `<button>` element with Zebkit's interaction
patterns, accessibility affordances, design tokens, and variant classes. It
uses Shadow DOM to encapsulate its internal structure while still exposing all
styling via token-based CSS custom properties on the host element.

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

### Icon slot (auto-tagged) + fallback icon class

Supply any element with `slot="icon"`. The component will add `.zbk-icon`
automatically if it is missing. You control placement by the order of children;
there is no `icon-position` attribute.

If you do not provide a slot, you can specify `icon-class` to render a fallback
icon element (useful for icon font systems such as Tabler). When both the slot
and `icon-class` are provided, the slot wins and the fallback icon is ignored
with a console warning.

```html
<zbk-button variant="raised outline">
  <svg slot="icon" viewBox="0 0 16 16" aria-hidden="true">...</svg>
  Upload file
</zbk-button>

<zbk-button>
  Continue
  <span slot="icon" aria-hidden="true">➡️</span>
</zbk-button>

<zbk-button icon-class="tb tb-download">
  Download
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

| Attribute   | Type / Values                         | Description |
| ----------- | ------------------------------------- | ----------- |
| `variant`   | Space/comma separated variant names   | Each name maps to `zbk-button--{name}` plus any registered overrides. |
| `options`   | JSON string `ZButtonOptions`          | Bulk apply `variant` array. |
| `icon-class` | Space-separated class list           | Render a fallback icon when no `slot="icon"` is provided. |
| `(click)`   | Inline handler source                 | Evaluated when `z-click` fires. Prefer adding listeners via JavaScript in frameworks. |
| `disabled`  | Boolean                               | Disables the internal button and sets `aria-disabled="true"`. |

> **Tip:** Options passed through `options="{...}"` are merged with individual
> attributes. Invalid values are ignored with console warnings to aid debugging.

## Events

| Event name | Payload       | Description |
| ---------- | -------------- | ----------- |
| `z-click`  | `CustomEvent<Event>` | Fired when the internal button triggers a native `click`. Bubbles and composes so upstream frameworks can listen. |

## Shadow DOM hooks

`<zbk-button>` uses Shadow DOM, so you should style via CSS variables on the
host element or via `::part` / `::slotted` hooks.

### Parts

- `button` - The native `<button>` element.
- `icon` - The fallback icon element (used when `icon-class` is set and no slot is provided).
- `icon-slot` - The named icon slot element.

Example:

```css
zbk-button::part(button) {
  border-style: dashed;
}
```

### Slot styling

```css
zbk-button::slotted([slot="icon"]) {
  color: currentColor;
}
```

## Public methods

All methods are available on the element instance (e.g. via
`document.querySelector('z-button')`).

| Method | Signature | Purpose |
| ------ | --------- | ------- |
| `setDisabledState` | `(isDisabled: boolean) => void` | Programmatically enable/disable the button and maintain ARIA state. |
| `getDisabledState` | `() => boolean` | Returns the current disabled flag. |
| `updateOptions` | `(newOptions: Partial<ZButtonOptions>) => void` | Merge and apply option overrides at runtime. |
| `setButtonText` | `(text: string) => void` | Replace the fallback button label and update the accessible name when appropriate. |
| `getButtonText` | `() => string` | Retrieve the current fallback label text. |
| `setAriaPressed` | `(isPressed: boolean) => void` | Manage toggle button `aria-pressed`. |
| `setAriaExpanded` | `(isExpanded: boolean) => void` | Manage disclosure button `aria-expanded`. |

## Design token reference

The button styles use CSS custom properties derived from Zebkit's token system.
Tokens live under `src/core/button/tokens/` with a Zod schema at
`token-schema.ts`. The token builder emits CSS variables using the `zbk-button`
prefix; variants scope overrides with classes like `.zbk-button--large`. Override
the emitted variables on the host element (the host also carries a `zbk-button`
class for convenience) to adjust visuals consistently, even
when the internal button is rendered in Shadow DOM:

```css
.special-button-wrapper .zbk-button {
  --zbk-button-font-size: 32px;
}
```
