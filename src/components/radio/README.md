# `<zbk-radio>`

A light-DOM custom element wrapping a real `<input type="radio">` inside its own `<label>`. Because the inputs live in the document (no shadow boundaries), radios sharing a `name` form a **native group**: mutual exclusion, arrow-key navigation, and form submission all come from the platform, not from zebkit. Every visual property is a `--zbk-radio-*` token.

Contract details (naming, states, ARIA relocation, content model) live in [GRAMMAR.md](../../../GRAMMAR.md).

## Usage

A radio is never alone — group with a shared `name` inside a `fieldset`/`legend`:

```html
<fieldset>
  <legend>Size</legend>
  <div class="zbk-radio-group">
    <zbk-radio name="size" value="s">Small</zbk-radio>
    <zbk-radio name="size" value="m" checked>Medium</zbk-radio>
    <zbk-radio name="size" value="l">Large</zbk-radio>
  </div>
</fieldset>
```

Each renders (light DOM, inspectable):

```html
<zbk-radio name="size" value="s">
  <label class="zbk-radio">
    <input type="radio" class="zbk-radio__input" name="size" value="s" />
    <span class="zbk-radio__control" aria-hidden="true"></span>
    <span class="zbk-radio__label">Small</span>
  </label>
</zbk-radio>
```

Register once at bootstrap:

```ts
import { defineZbkRadio } from "zebkit/components/radio";
defineZbkRadio(); // no-ops if already registered
```

## Attributes

| Attribute | Type | Default | Notes |
|---|---|---|---|
| `variant` | string | — | Space-separated registered variant names, e.g. `"lg"`. Unknown names warn with the registered vocabulary. |
| `name` | string | — | The group key. Radios only behave as one group when they share a name; a nameless radio warns in dev. |
| `value` | string | `on` | This option's submitted value. |
| `checked` | boolean | `false` | Whether this radio is the group's selection. Selecting another radio in the group updates every element's `checked` property. |
| `disabled` | boolean | `false` | Native disabled: out of tab order, blocks interaction. |
| `required` | boolean | `false` | Forwarded for native constraint validation. |
| `aria-*`, `role` | — | — | Write them on `<zbk-radio>` as if it were the input; they relocate to the inner `<input>` automatically. |

## Events

None custom. The native `change` bubbles from the newly selected input — listen for `change` on the group's container (or any ancestor) and read `event.target.value`.

## State-indicator slots

Replace the drawn selection dot with any authored content — an svg, an icon-font glyph, an HTML character, an image:

```html
<zbk-radio name="mood" value="happy">
  <i class="ti ti-mood-smile" slot="checked"></i>
  <span slot="unchecked">·</span>
  Happy
</zbk-radio>
```

| Slot | Shown when | Replaces |
|---|---|---|
| `checked` | selected | the drawn dot |
| `unchecked` | not selected | nothing (no drawn default) |

Slotted indicators layer over the control, size from the `indicator-size` token (em-based, so size variants rescale them), inherit `indicator-color`, and animate with the component's transition tokens. The control is aria-hidden, so indicator content is presentational — state is conveyed by the native input.

## Shipped variants

| Variant | Axis | Remaps |
|---|---|---|
| `sm` | size | Smaller control and label type. |
| `lg` | size | Larger control and label type. |

The tap target stays generous at any size — the invisible native input covers the whole label, not just the control.

## Accessible naming

Label text (default children) is the accessible name via the wrapping `<label>`. The group's name comes from the `fieldset`'s `<legend>`. Text-free radios must provide `aria-label` (or `aria-labelledby`) — a nameless radio warns in dev with the fix.

## Styling

Everything is tokens: control geometry, per-state canvas/border including `-checked`, the selection dot (`indicator-color`/`indicator-size`/`indicator-radius`), label typography, focus ring, per-state box-shadows for lift/press physics, group layout (`group-gap`, `group-direction`), and playful-fx motion with reduced-motion handling. See `tokens/tokens.ts` for the full annotated surface. The `.zbk-radio` classes also work standalone on a native `label > input + span + span` structure — the element form is the documented entry point.
