# `<zbk-textarea>`

A light-DOM custom element wrapping a real `<textarea>` inside its own `<label>`. It is [`<zbk-input>`](../input/README.md) for multi-line text: default children are the visible label (the accessible name via the wrapping label), and the field box carries the native textarea. No affixes, no masking — it is not a rich-text editor. Every visual property is a `--zbk-textarea-*` token.

Contract details (naming, states, ARIA relocation, content model) live in [GRAMMAR.md](../../../foundations/GRAMMAR.md). For single-line text, use [`<zbk-input>`](../input/README.md).

## Usage

```html
<zbk-textarea name="notes" rows="4" placeholder="Anything else we should know?">
  Additional notes
</zbk-textarea>
```

Renders (light DOM, inspectable):

```html
<zbk-textarea name="notes" rows="4">
  <label class="zbk-textarea">
    <span class="zbk-textarea__label">Additional notes</span>
    <span class="zbk-textarea__field">
      <textarea class="zbk-textarea__textarea" name="notes" rows="4"></textarea>
    </span>
  </label>
</zbk-textarea>
```

Register once at bootstrap:

```ts
import { defineZbkTextarea } from "zebkit/components/textarea";
defineZbkTextarea(); // no-ops if already registered
```

## Attributes

| Attribute | Type | Default | Notes |
|---|---|---|---|
| `variant` | string | — | Space-separated registered variant names, e.g. `"sm"`. Unknown names warn with the registered vocabulary. |
| `value` | string | `""` | The field's value; synced from the native `input` event. |
| `placeholder` | string | — | Forwarded. A placeholder is not a label. |
| `disabled` | boolean | `false` | Native disabled: out of tab order, blocks interaction. |
| `readonly` | boolean | `false` | Native readonly: focusable and legible, value locked. |
| `required`, `minlength`, `maxlength` | — | — | Forwarded for native constraint validation. |
| `rows` | number | — | Native initial visible rows (browser default applies when unset). |
| `wrap` | string | — | Native `soft`/`hard` wrapping. |
| `name`, `form`, `autocomplete` | string | — | Forwarded for native form participation. |
| `aria-*`, `role` | — | — | Write them on `<zbk-textarea>` as if it were the textarea; they relocate to the inner `<textarea>` automatically. |

There is no `type`, `inputmode`, `min`/`max`/`step`/`pattern`, or `mask` — those are input-only or meaningless on a textarea.

## Events

None custom. The native `input`/`change` bubble out of the light DOM on their own — listen on `<zbk-textarea>` like any element.

## Resizing

Resizability is a token, not an attribute. `resize` defaults to `vertical`; re-theme it (`vertical`, `horizontal`, `both`, `none`) via `--zbk-textarea-resize` like any other visual property.

## Validation states

`:user-invalid` (invalid after interaction) and `[aria-invalid="true"]` drive the `-invalid` tokens; `readonly` drives the `-readonly` tokens. Constraint validation itself is fully native (`required`, `minlength`, `maxlength`).

## Accessible naming

Label text (default children) is the accessible name via the wrapping `<label>`. Label-free fields must provide `aria-label` (or `aria-labelledby`) — a placeholder is not a label, and a nameless field warns in dev with the fix.

## Styling

Everything is tokens: field canvas/border per state (`hover`, `focus`, `active`, `disabled`, `readonly`, `invalid`), entered-text and placeholder ink, caret color, label typography and gap, padding, radius, `resize` behavior, `min-block-size` floor, focus ring, per-state box-shadows, and calm-fx motion with reduced-motion handling. See `tokens/tokens.ts` for the full annotated surface. The `.zbk-textarea` classes also work standalone on a native `label > span + span > textarea` structure — the element form is the documented entry point.
