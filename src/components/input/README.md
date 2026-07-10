# `<zbk-input>`

A light-DOM custom element wrapping a real `<input>` inside its own `<label>`. Default children are the visible label (the accessible name via the wrapping label — the same spelling as `<zbk-checkbox>`); the field box carries optional prefix/suffix affixes around the native input. Every visual property is a `--zbk-input-*` token.

Contract details (naming, states, ARIA relocation, content model) live in [GRAMMAR.md](../../../GRAMMAR.md). For a picker over fixed options, use [`<zbk-select>`](../select/README.md).

## Usage

```html
<zbk-input name="email" type="email" placeholder="you@example.com" required>
  Email address
</zbk-input>
```

Renders (light DOM, inspectable):

```html
<zbk-input name="email" type="email" required>
  <label class="zbk-input">
    <span class="zbk-input__label">Email address</span>
    <span class="zbk-input__field">
      <input class="zbk-input__input" type="email" name="email" required />
    </span>
  </label>
</zbk-input>
```

Register once at bootstrap:

```ts
import { defineZbkInput } from "zebkit/components/input";
defineZbkInput(); // no-ops if already registered
```

## Attributes

| Attribute | Type | Default | Notes |
|---|---|---|---|
| `variant` | string | — | Space-separated registered variant names, e.g. `"sm"`. Unknown names warn with the registered vocabulary. |
| `type` | string | `text` | Forwarded verbatim. Text-like types (`text`, `email`, `password`, `search`, `tel`, `url`, `number`, ...) — for checkboxes, radios, and buttons use their own components. |
| `value` | string | `""` | The field's value. With a `mask`, always the masked form. |
| `mask` | string | — | Format-as-you-type mask; see below. |
| `placeholder` | string | — | Forwarded. A placeholder is not a label. |
| `disabled` | boolean | `false` | Native disabled: out of tab order, blocks interaction. |
| `readonly` | boolean | `false` | Native readonly: focusable and legible, value locked. |
| `required`, `minlength`, `maxlength`, `min`, `max`, `step`, `pattern` | — | — | Forwarded for native constraint validation. |
| `name`, `form`, `autocomplete`, `inputmode` | string | — | Forwarded for native form participation and input hints. |
| `aria-*`, `role` | — | — | Write them on `<zbk-input>` as if it were the input; they relocate to the inner `<input>` automatically. |

## Events

None custom. The native `input`/`change` bubble out of the light DOM on their own — listen on `<zbk-input>` like any element. With a mask, event values are always the masked form.

## Affix slots

Put any authored content — an svg, an icon-font glyph, an HTML character, an image — at the field's inline start or end:

```html
<zbk-input name="price" inputmode="decimal">
  <span slot="prefix">$</span>
  <span slot="suffix">USD</span>
  Price
</zbk-input>
```

Affixes size from the `icon-size` token (`1em` by default, so size variants rescale them) and inherit `affix-ink` (icon fonts and `currentColor` SVGs pick it up automatically). They render aria-hidden — presentational only. Information an affix carries must also live in the accessible name or description.

## Masking

`mask` formats the value as the user types. Three slot characters; everything else is a literal the mask inserts automatically:

| Character | Accepts |
|---|---|
| `#` | a digit |
| `a` | a letter |
| `*` | a letter or digit |
| `\` | escapes the next character into a literal (`\#` renders a `#`) |

```html
<zbk-input name="phone" mask="(###) ###-####">Phone</zbk-input>
<zbk-input name="expiry" mask="##/##">Expiry (MM/YY)</zbk-input>
<zbk-input name="plate" mask="aaa-####">License plate</zbk-input>
```

- **The masked value is the value** — what you see is what submits. Read `el.rawValue` for the value with literals stripped (`"(555) 123-4567"` → `"5551234567"`).
- Characters no slot accepts are dropped; input caps at the mask's length; deleting reflows through the mask (literals never strand).
- The caret stays where the user's edit put it, and IME composition is left alone until it commits.
- An all-digit mask defaults `inputmode="numeric"` so touch keyboards match — an authored `inputmode` wins.
- Programmatic `value` writes pass through the mask too; the element never renders an unmasked value.

## Validation states

`:user-invalid` (invalid after interaction) and `[aria-invalid="true"]` drive the `-invalid` tokens; `readonly` drives the `-readonly` tokens. Constraint validation itself is fully native (`required`, `pattern`, `minlength`, ...).

## Grouping

Stack related fields in `.zbk-input-group` (flex, driven by the `group-gap` and `group-direction` tokens; default column):

```html
<div class="zbk-input-group">
  <zbk-input name="first">First name</zbk-input>
  <zbk-input name="last">Last name</zbk-input>
</div>
```

## Accessible naming

Label text (default children) is the accessible name via the wrapping `<label>`. Label-free fields must provide `aria-label` (or `aria-labelledby`) — a placeholder is not a label, and a nameless field warns in dev with the fix.

## Styling

Everything is tokens: field canvas/border per state (`hover`, `focus`, `active`, `disabled`, `readonly`, `invalid`), entered-text and placeholder ink, caret color, label typography and gap, affix ink and icon sizing, padding, radius, focus ring, per-state box-shadows, and calm-fx motion with reduced-motion handling. See `tokens/tokens.ts` for the full annotated surface. The `.zbk-input` classes also work standalone on a native `label > span + span > input` structure — the element form is the documented entry point.
