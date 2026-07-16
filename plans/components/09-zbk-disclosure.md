# `<zbk-disclosure>` — Phase 1 handoff prompt

Status: READY · Build order: 9 · Depends on: nothing (10-zbk-accordion depends on this)
Read first: `plans/components/00-conventions.md`, `GRAMMAR.md`. Precedence: GRAMMAR.md > this file > conventions.

## 1. Pattern definition

A single expandable section built on native `<details>`/`<summary>`: a summary control that shows/hides its panel. The platform owns toggle behavior, keyboard support, and state; the component completes the pattern with the token surface, a themable indicator, and the shared content model. Grouping (single-open policy, arrow-key traversal) is `<zbk-accordion>` (10), not this.

## 2. Mirror & references

Child adoption split (summary slot vs default panel content) mirrors `src/components/select/index.ts`'s sorting approach. State-suffix styling bound to an attribute (`[open]` → `-expanded` tokens) is the same shape as checkbox's checked-state binding.

## 3. Authored markup

```html
<zbk-disclosure>
  <span slot="summary">Shipping details</span>
  <p>Orders placed before 2pm ship the same day…</p>
</zbk-disclosure>

<zbk-disclosure open>…</zbk-disclosure>
```

## 4. Rendered skeleton

```html
<zbk-disclosure>
  <details class="zbk-disclosure">
    <summary class="zbk-disclosure__summary">
      <span class="zbk-disclosure__summary-content">Shipping details</span>
      <span class="zbk-disclosure__indicator" aria-hidden="true"></span>
    </summary>
    <div class="zbk-disclosure__panel"><p>…</p></div>
  </details>
</zbk-disclosure>
```

The indicator is a CSS-drawn chevron (border/clip-path square, no SVG markup) that rotates on `[open]`. The native marker is removed in CSS (`summary::marker { content: none }` and `summary { list-style: none }`).

## 5. Attributes & properties

| Attribute | Type | Default | Notes |
|---|---|---|---|
| `variant` | string | — | Per GRAMMAR |
| `open` | boolean | false | Reflected both ways: attribute → native `open`; native toggle → host attribute (so consumers can observe the host) |

## 6. Content model

`summary` slot: the summary label (any inline markup). Default children: the panel content. Requires the GRAMMAR amendment in §16.

## 7. Behavior

- Toggle, Enter/Space on summary, find-in-page auto-expand: all native.
- Listen to the internal `details`' `toggle` to mirror `open` onto the host attribute and keep the Lit property in sync. Do **not** re-dispatch it (the native `toggle` event does not bubble; consumers who need it get the host's `open` attribute change or listen via the pattern shown in docs — see §11).

## 8. ARIA & announcements

Native `<summary>` announces expanded/collapsed. `nativeElement` returns the `<summary>` (focus forwards there; author ARIA relocates there). No announcer usage.

## 9. Token surface

Key `disclosure`, layer `base`. `-expanded` is the semantic state (bound to `[open]`).

| Token | Default | Type |
|---|---|---|
| `display` | `block` | `display` |
| `canvas` | `transparent` | `color` |
| `border-color` | `{app.border}` | `color` |
| `border-width` | `{border.width-sm}` | `borderWidth` |
| `border-style` | `{border.style}` | `borderStyle` |
| `border-radius` | `{border.radius-md}` | `borderRadius` |
| `summary-canvas` | `transparent` | `color` |
| `summary-canvas-hover` | `{app.canvas-subtle}` | `color` |
| `summary-canvas-expanded` | `transparent` | `color` |
| `summary-ink` | `{app.ink}` | `color` |
| `summary-ink-hover` | `{app.ink-emphasis}` | `color` |
| `summary-font-family` / `summary-font-size` / `summary-font-weight` / `summary-line-height` | interface / `{font-size.md}` / `{font-weight.medium}` / `{line-height.2}` | — |
| `summary-padding-inline` / `summary-padding-block` | `{spacing.sm}` / `{spacing.xs}` | `spacing` |
| `summary-gap` | `{spacing.sm}` | `spacing` |
| `summary-min-height` | `44px` | `sizing` (tap-target floor) |
| `indicator-size` | `0.75em` | `sizing` |
| `indicator-ink` | `{app.ink-muted}` | `color` |
| `indicator-rotation-expanded` | `90deg` | `utility` |
| `panel-padding-inline` / `panel-padding-block` | `{spacing.sm}` / `{spacing.xs}` | `spacing` |
| `panel-ink` | `{app.ink}` | `color` |
| `focus-color` / `focus-width` / `focus-offset` | focus aliases | — |
| `transition-duration` (`a11y: true`) / `transition-timing-function` / `transition-property` (`transform, background-color`) / `transition-delay` (`0`) | calm defaults | `transition` |

Indicator rotates via `transform: rotate(var(indicator-rotation-expanded))` under `[open]`; the transition token animates it (motion dies with reduced-motion via the a11y-flagged duration; no extra media query needed for a transform this small, but the duration token must carry `a11y: true`).

## 10. Variants

None shipped (accordion will provide the grouped presentation).

## 11. Custom events

None. Docs show observing open state: `MutationObserver` on the host's `open` attribute, or listening for `toggle` via `el.querySelector('details')` is **not** documented (internal DOM) — the attribute is the contract.

## 12. Dev-mode warnings

- Missing `summary` slot content: "No summary content. Provide the summary label via slot=\"summary\" — a disclosure without a visible control cannot be operated."

## 13. Tests

Skeleton; summary/panel adoption split; `open` attribute → native open; user toggle (dispatch `toggle` on details after flipping open) → host attribute mirrors; focus() lands on summary; marker suppressed (class present; CSS itself is not testable in jsdom — assert classes); warning.

## 14. Docs

Per conventions. Live examples: basic, initially open, rich panel content. Guidance: disclosure vs accordion boundary; don't nest interactive controls inside `summary`.

## 15. Out of scope (do not build)

- Grouping/exclusive-open (10-zbk-accordion)
- Animated height expansion (height animation on details is a can of worms; the indicator animates, the panel snaps — revisit if design demands)
- `name` attribute exclusive-details behavior (accordion will own grouping semantics explicitly)

## 16. Acceptance checklist

Conventions "Definition of done", plus: state suffix used is `-expanded` bound to `[open]`; GRAMMAR amendment applied.

### GRAMMAR.md amendment (apply verbatim)

In §7's slot vocabulary list, add:

> - `summary` — the visible label of an expandable pattern's control (any inline markup). Rendered inside the control the platform provides (e.g. `<summary>`); it is the control's accessible name.

## 17. Revision notes

(Empty at handoff. Fold anything written here into its home section above, then delete it.)
