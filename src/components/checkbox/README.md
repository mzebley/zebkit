# `<zbk-checkbox>`

A light-DOM custom element wrapping a real `<input type="checkbox">` inside its own `<label>`. The native input stays functional but invisible, stretched across the whole label so hover, press, click, and focus land on it natively anywhere in the component; an aria-hidden control span visualizes its state through sibling selectors. Every visual property is a `--zbk-checkbox-*` token.

Contract details (naming, states, ARIA relocation, content model) live in [GRAMMAR.md](../../../GRAMMAR.md). For an on/off switch, use [`<zbk-toggle>`](../toggle/README.md) — a checkbox is a form selection, a toggle is an immediate state change, and each carries its own token surface.

## Usage

```html
<zbk-checkbox name="terms" value="yes" checked>I agree to the terms</zbk-checkbox>
```

Renders (light DOM, inspectable):

```html
<zbk-checkbox name="terms" value="yes" checked>
  <label class="zbk-checkbox">
    <input type="checkbox" class="zbk-checkbox__input" name="terms" />
    <span class="zbk-checkbox__control" aria-hidden="true"></span>
    <span class="zbk-checkbox__label">I agree to the terms</span>
  </label>
</zbk-checkbox>
```

Register once at bootstrap:

```ts
import { defineZbkCheckbox } from "zebkit/components/checkbox";
defineZbkCheckbox(); // no-ops if already registered
```

## Attributes

| Attribute | Type | Default | Notes |
|---|---|---|---|
| `variant` | string | — | Space-separated registered variant names, e.g. `"sm"`. Unknown names warn with the registered vocabulary. |
| `checked` | boolean | `false` | Whether the checkbox is checked. Syncs from user interaction. |
| `indeterminate` | boolean | `false` | The mixed "some but not all" state. Visual + AT only, never submitted; any user toggle clears it. |
| `disabled` | boolean | `false` | Native disabled: out of tab order, blocks interaction. |
| `required` | boolean | `false` | Forwarded for native constraint validation. |
| `name`, `value` | string | `value` defaults to `on` | Forwarded for native form participation. |
| `aria-*`, `role` | — | — | Write them on `<zbk-checkbox>` as if it were the input; they relocate to the inner `<input>` automatically. |

## Events

None custom. The native `change`/`input` bubble out of the light DOM on their own — listen for `change` on `<zbk-checkbox>` like any element. Programmatic `checked` changes don't fire `change` (native behavior).

## State-indicator slots

Replace the drawn checkmark and indeterminate bar with any authored content — an svg, an icon-font glyph, an HTML character, an image:

```html
<zbk-checkbox name="tasks">
  <i class="ti ti-checks" slot="checked"></i>
  <span slot="indeterminate">&ndash;</span>
  <span slot="unchecked">&middot;</span>
  All tasks
</zbk-checkbox>
```

| Slot | Shown when | Replaces |
|---|---|---|
| `checked` | checked (and not indeterminate) | the drawn checkmark |
| `indeterminate` | indeterminate | the drawn bar |
| `unchecked` | neither | nothing (no drawn default) |

Slotted indicators layer over the control, size from the `indicator-size` token (`1em` by default, so size variants rescale them), inherit `indicator-color` (icon fonts and `currentColor` SVGs pick it up automatically; opt out with your own CSS), and animate with the component's transition tokens. The control is aria-hidden, so indicator content is presentational — state is conveyed by the native input.

## Shipped variants

| Variant | Axis | Remaps |
|---|---|---|
| `sm` | size | Smaller control and label type. |
| `lg` | size | Larger control and label type. |

The tap target stays generous at any size — the invisible native input covers the whole label, not just the control.

## Grouping

Wrap related checkboxes in `.zbk-checkbox-group` (flex, driven by the `group-gap` and `group-direction` tokens; default column):

```html
<fieldset>
  <legend>Notifications</legend>
  <div class="zbk-checkbox-group">
    <zbk-checkbox name="notify" value="email">Email</zbk-checkbox>
    <zbk-checkbox name="notify" value="sms">SMS</zbk-checkbox>
  </div>
</fieldset>
```

## Accessible naming

Label text (default children) is the accessible name via the wrapping `<label>`. Text-free checkboxes must provide `aria-label` (or `aria-labelledby`) — a nameless checkbox warns in dev with the fix.

## Styling

Everything is tokens: independently addressable `control-width`/`control-height`, per-state canvas/border including `-checked` and `-indeterminate`, indicator color/stroke/size, label typography, focus ring, per-state box-shadows for lift/press physics, and playful-fx motion with reduced-motion handling. See `tokens/tokens.ts` for the full annotated surface. The `.zbk-checkbox` classes also work standalone on a native `label > input + span + span` structure — the element form is the documented entry point.
