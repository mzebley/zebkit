# `<zbk-button>`

A light-DOM custom element wrapping a real `<button>`. The platform already ships the platonic button; `<zbk-button>` completes the pattern: it renders the token-driven skeleton, reflects `variant` into classes, forwards native semantics, and adds the one behavior a native button lacks (`loading`). It carries zero visual opinion — every visual property is a `--zbk-button-*` token.

Contract details (naming, states, ARIA relocation, content model) live in [GRAMMAR.md](../../../GRAMMAR.md).

## Usage

```html
<zbk-button variant="ghost lg" type="submit">
  <svg slot="icon" data-position="start" viewBox="0 0 24 24">…</svg>
  Save draft
</zbk-button>
```

Slotted icons use `data-position="start|end"` for explicit placement. If
`data-position` is omitted, placement is inferred from the icon's original
authored order relative to the default label content.

Renders (light DOM, inspectable):

```html
<zbk-button variant="ghost lg" type="submit">
  <button class="zbk-button zbk-button--ghost zbk-button--lg" type="submit">
    <span class="zbk-button__icon zbk-button__icon--start" aria-hidden="true"
      ><svg>…</svg></span
    >
    <span class="zbk-button__label">Save draft</span>
  </button>
</zbk-button>
```

Register once at bootstrap:

```ts
import { defineZbkButton } from "zebkit/components/button";
defineZbkButton(); // no-ops if already registered
```

## Attributes

| Attribute | Type | Default | Notes |
|---|---|---|---|
| `variant` | string | — | Space-separated registered variant names, e.g. `"outline sm"`. Unknown names warn with the registered vocabulary. |
| `type` | `button \| submit \| reset` | `button` | Forwarded to the inner button. Defaults to `button` (not the platform's `submit` footgun). |
| `disabled` | boolean | `false` | Native disabled: out of tab order, blocks interaction. |
| `loading` | boolean | `false` | Sets `aria-busy`, suppresses activation, **keeps focus** so keyboard/SR users don't lose their place. |
| `name`, `value`, `form` | string | — | Forwarded for native form participation. |
| `aria-*`, `role` | — | — | Write them on `<zbk-button>` as if it were the button; they relocate to the inner `<button>` automatically. |

## Events

None. The native `click` bubbles out of the light DOM on its own — listen for `click` on `<zbk-button>` like any element. Keyboard activation (Enter/Space) arrives as a click, so one listener covers everything.

## Shipped variants

Structural recipes on the consumer's `action` aliases — override or replace any of them via variant JSON overlays.

| Variant | Axis | Remaps |
|---|---|---|
| `ghost` | style | Transparent canvas + border; ink takes the action role, subtle hover wash. |
| `outline` | style | Transparent canvas, action-colored border. |
| `subtle` | style | Low-emphasis fill on the subtle action canvas. |
| `sm` | size | Smaller type/padding. Keeps the 44px tap-target floor. |
| `lg` | size | Larger type/padding. |

Different-axis variants compose (`variant="outline lg"`). Same-axis combinations warn in dev; the later class wins.

## Accessible naming

Label text is the accessible name. Icon-only buttons must provide `aria-label` (or `aria-labelledby`) — a nameless button warns in dev with the fix.

## Styling

Everything is tokens: base state plus `-hover`, `-active`, `-focus`, `-disabled`, and `-loading` surfaces for ink/canvas/border, geometry, typography, spacing, shadows, transitions. See `tokens/tokens.ts` for the full annotated surface. The `.zbk-button` classes also work standalone on a native `<button>` if you need them without JS — the element form is the documented entry point.
