# `<zbk-link>` — Phase 1 handoff prompt

Status: READY · Build order: 2 · Depends on: nothing
Read first: `plans/components/00-conventions.md`, `GRAMMAR.md`. Precedence: GRAMMAR.md > this file > conventions.

## 1. Pattern definition

The zebkit navigational link: a light-DOM element wrapping a real `<a>`. A link **navigates**; an action that mutates state is `<zbk-button>`. This component never renders a button and never accepts a click-handler-only usage pattern as documented practice.

## 2. Mirror & references

Structure mirrors `src/components/button/index.ts` (simple interactive control, default content + icon slot). Token/style organization mirrors button's files. Everything below is where link differs.

## 3. Authored markup

```html
<zbk-link href="/pricing">See pricing</zbk-link>

<zbk-link href="https://example.com" target="_blank" rel="noopener">
  Docs
  <svg slot="icon" viewBox="0 0 24 24">…</svg>
</zbk-link>
```

## 4. Rendered skeleton

```html
<zbk-link href="/pricing">
  <a class="zbk-link" href="/pricing">
    <span class="zbk-link__content">See pricing</span>
    <span class="zbk-link__icon" aria-hidden="true"><svg>…</svg></span>
  </a>
</zbk-link>
```

Icon span renders only when `slot="icon"` content exists.

## 5. Attributes & properties

`variant` per GRAMMAR. Forwarded verbatim to the internal `<a>`:

| Attribute | Type | Default | Notes |
|---|---|---|---|
| `href` | string | — | Destination. Without it the anchor is a placeholder link (not focusable) — see §12 |
| `target` | string | — | Native |
| `rel` | string | — | Native |
| `download` | string/boolean | — | Native |
| `hreflang` / `type` | string | — | Native |

## 6. Content model

Default children: the link text (the accessible name). `icon` slot: supplementary pictogram, aria-hidden, per the shared vocabulary.

## 7. Behavior

Fully native — navigation, modified-click, context menu, focus all belong to the `<a>`. The component adds nothing behavioral.

## 8. ARIA & announcements

Base-class mechanics only. `aria-current` written by the author relocates to the `<a>` and drives the `-current` state visuals (§9). No custom events; clicks bubble natively.

## 9. Token surface

Key `link`, layer `base`. Type defaults are `inherit` so links sit inside running text; component tokens exist so variants and themes can diverge.

| Token | Default | Type |
|---|---|---|
| `display` | `inline` | `display` |
| `ink` | `{action.ink}` | `color` |
| `ink-hover` | `{action.ink-emphasis}` | `color` |
| `ink-active` | `{action.ink-emphasis}` | `color` |
| `ink-visited` | `{link.ink}` | `color` |
| `ink-current` | `{app.ink}` | `color` |
| `decoration-line` | `underline` | `utility` |
| `decoration-line-hover` | `underline` | `utility` |
| `decoration-color` | `currentColor` | `color` |
| `decoration-thickness` | `{border.width-sm}` | `borderWidth` |
| `underline-offset` | `0.2em` | `sizing` |
| `icon-size` | `1em` | `sizing` |
| `icon-gap` | `{spacing.2xs}` | `spacing` |
| `font-family` / `font-size` / `font-weight` / `line-height` / `letter-spacing` | `inherit` | (matching types) |
| `focus-color` / `focus-width` / `focus-offset` | `{focus.color}` / `{focus.width}` / `{focus.offset}` | — |
| `border-radius` | `{border.radius-xs}` | `borderRadius` | (focus-outline rounding) |
| `transition-duration` (`a11y: true`) / `transition-timing-function` / `transition-property` (`color, text-decoration-color`) / `transition-delay` (`0`) | calm defaults, mirror input | `transition` |

State mapping in styles.scss: `:hover`, `:active`, `:visited` → `-visited` tokens, `[aria-current]` → `-current` tokens, `:focus-visible` → focus outline. When icon content exists the anchor gets `display: inline-flex; align-items: center; gap: var(icon-gap)` scoped by a `:has(.zbk-link__icon)` selector (or a modifier class set at render time — pick the modifier class; it works everywhere).

## 10. Variants

One shipped variant, axis `style`:

- `subtle` — `decoration-line: none`, `decoration-line-hover: underline`, `ink: {app.ink}`. Description: "No underline at rest; underline returns on hover so the affordance is never lost for keyboard/low-vision users."

## 11. Custom events

None.

## 12. Dev-mode warnings

- Empty accessible name (icon-only with no text/aria-label): base pattern, message per GRAMMAR §9.
- `target="_blank"` without `rel` containing `noopener` or `noreferrer`: "target=\"_blank\" without rel=\"noopener\". Add rel=\"noopener\" (or noreferrer) to prevent the opened page from scripting this one."
- Missing `href`: "No href. A link without a destination is not focusable or announced as a link — use <zbk-button> for actions."

## 13. Tests

Skeleton + class; default children become content; icon slot renders aria-hidden and absent without content; all §5 attributes forward; `aria-current` relocates to the anchor; each §12 warning fires (and does not fire in the valid case); `subtle` variant class applies.

## 14. Docs

Per conventions. Live examples: inline-in-paragraph link, icon link, `subtle`, `aria-current="page"`. Prominent guidance box: link navigates / button acts, cross-linking `<zbk-button>` (and the same note added to button's page).

## 15. Out of scope (do not build)

- Router integration or click interception of any kind
- Automatic external-link icon injection (authors slot their own)
- A `disabled` state — disabled links are an anti-pattern; remove the href instead

## 16. Acceptance checklist

Conventions "Definition of done", plus: GRAMMAR amendment below applied; `:visited` styling works with plain CSS (no JS state); focus outline renders on `:focus-visible` only.

### GRAMMAR.md amendment (apply verbatim)

In §4, extend the semantic-state vocabulary list to include `-visited` and `-current`:

> **Semantic states** — drawn from a shared vocabulary (`-selected`, `-checked`, `-indeterminate`, `-invalid`, `-readonly`, `-expanded`, `-visited`, `-current`, ...)

## 17. Revision notes

(Empty at handoff. Fold anything written here into its home section above, then delete it.)
