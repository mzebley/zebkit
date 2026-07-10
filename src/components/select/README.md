# `<zbk-select>`

A light-DOM custom element wrapping a real `<select>` inside its own `<label>`. Authored `<option>`, `<optgroup>`, and `<hr>` children are adopted into the native select; every other default child is the visible label. The field box carries optional prefix/suffix affixes and draws a chevron indicator that slotted suffix content replaces. Every visual property is a `--zbk-select-*` token.

Contract details (naming, states, ARIA relocation, content model) live in [GRAMMAR.md](../../../GRAMMAR.md). For free text, use [`<zbk-input>`](../input/README.md).

## Usage

```html
<zbk-select name="country" value="ca">
  Country
  <option value="us">United States</option>
  <option value="ca">Canada</option>
</zbk-select>
```

Renders (light DOM, inspectable):

```html
<zbk-select name="country" value="ca">
  <label class="zbk-select">
    <span class="zbk-select__label">Country</span>
    <span class="zbk-select__field">
      <select class="zbk-select__select" name="country">
        <option value="us">United States</option>
        <option value="ca">Canada</option>
      </select>
    </span>
  </label>
</zbk-select>
```

Register once at bootstrap:

```ts
import { defineZbkSelect } from "zebkit/components/select";
defineZbkSelect(); // no-ops if already registered
```

## Attributes

| Attribute | Type | Default | Notes |
|---|---|---|---|
| `variant` | string | — | Space-separated registered variant names, e.g. `"lg"`. Unknown names warn with the registered vocabulary. |
| `value` | string | — | The selected option's value. Leave unset for uncontrolled behavior; syncs from user interaction. |
| `disabled` | boolean | `false` | Native disabled: out of tab order, blocks interaction. |
| `required` | boolean | `false` | Forwarded for native constraint validation. |
| `multiple` | boolean | `false` | Native multiple selection: renders as a list box (the chevron retires). |
| `size` | number | — | Number of visible rows, forwarded verbatim. |
| `name`, `form`, `autocomplete` | string | — | Forwarded for native form participation. |
| `aria-*`, `role` | — | — | Write them on `<zbk-select>` as if it were the select; they relocate to the inner `<select>` automatically. |

## Events

None custom. The native `change`/`input` bubble out of the light DOM on their own — listen for `change` on `<zbk-select>` like any element.

## Content model

Default children partition by what a native select accepts: `<option>`, `<optgroup>`, and `<hr>` go into the select; everything else is the visible label. Option text is never the accessible name.

## Affix slots and the chevron

Put any authored content at the field's inline start or end; suffix content replaces the drawn chevron:

```html
<zbk-select name="lang">
  <svg slot="prefix" viewBox="0 0 24 24">…</svg>
  <i class="ti ti-caret-down" slot="suffix"></i>
  Language
  <option value="en">English</option>
</zbk-select>
```

Affixes size from the `icon-size` token (`1em` by default, so size variants rescale them) and inherit `affix-ink` (icon fonts and `currentColor` SVGs pick it up automatically). They render aria-hidden — presentational only. The drawn chevron is pure structure colored by `indicator-color`; it retires when a suffix is slotted or when `multiple` makes the select a list box.

## Grouping

Stack related fields in `.zbk-select-group` (flex, driven by the `group-gap` and `group-direction` tokens; default column).

## Accessible naming

Non-option label content (default children) is the accessible name via the wrapping `<label>`. Label-free selects must provide `aria-label` (or `aria-labelledby`) — a nameless select warns in dev with the fix.

## Styling

Everything is tokens: field canvas/border per state (`hover`, `focus`, `active`, `disabled`, `invalid`), selected-option ink, label typography and gap, affix ink and icon sizing, chevron color/size/stroke, padding, radius, focus ring, per-state box-shadows, and calm-fx motion with reduced-motion handling. See `tokens/tokens.ts` for the full annotated surface. The `.zbk-select` classes also work standalone on a native `label > span + span > select` structure — the element form is the documented entry point.
