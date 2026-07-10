# `<zbk-tag>` — Phase 1 handoff prompt

Status: READY · Build order: 4 · Depends on: 03-zbk-badge (pattern precedent; no code dependency)
Read first: `plans/components/00-conventions.md`, `GRAMMAR.md`. Precedence: GRAMMAR.md > this file > conventions.

## 1. Pattern definition

A labeled entity in a collection — a filter, a recipient, a selected option — optionally removable via a built-in dismiss button. Distinct from `<zbk-badge>` (pure status, never removable) and from `<zbk-button>` (an action). The tag itself is not focusable; only its dismiss button is.

## 2. Mirror & references

Visual shell mirrors badge; the dismiss button mirrors button's native-`<button>` discipline. The `zbk-dismiss` event named in GRAMMAR.md §2 is this component's event — this is its first implementation.

## 3. Authored markup

```html
<zbk-tag>Design systems</zbk-tag>
<zbk-tag dismissible>React</zbk-tag>
```

## 4. Rendered skeleton

```html
<zbk-tag dismissible>
  <span class="zbk-tag">
    <span class="zbk-tag__content">React</span>
    <button type="button" class="zbk-tag__dismiss" aria-label="Remove React">
      <span class="zbk-tag__dismiss-glyph" aria-hidden="true">×</span>
    </button>
  </span>
</zbk-tag>
```

Dismiss button renders only when `dismissible` is present. The default glyph is the CSS-styled `×` character; slotted `dismiss-glyph` content replaces it (§6).

## 5. Attributes & properties

| Attribute | Type | Default | Notes |
|---|---|---|---|
| `variant` | string | — | Per GRAMMAR |
| `dismissible` | boolean | false | Renders the dismiss button |
| `dismiss-label` | string | `Remove {text}` | Accessible name for the dismiss button; `{text}` is the tag's text content. Set explicitly when the visible text is not self-describing |

## 6. Content model

Default children: the tag text. `icon` slot (aria-hidden, before content) per the shared vocabulary. `dismiss-glyph` slot: replaces the default `×` inside the dismiss button (aria-hidden — the button's aria-label carries the name). Requires the GRAMMAR amendment in §16.

## 7. Behavior

- Activating the dismiss button (native click — Enter/Space are free) dispatches `zbk-dismiss` (§11). **The component does not remove itself**; the consumer owns the collection and removes the element. Docs (§14) show the pattern including moving focus to the next tag or the collection's label after removal.
- `nativeElement` returns the dismiss button when present, else the inner span; `focus()` therefore reaches the dismiss button on a dismissible tag.

## 8. ARIA & announcements

- Dismiss button aria-label from `dismiss-label` (recomputed if the attribute or text changes).
- No live announcements from the component (removal is consumer-owned; consumer calls `announce()` — shown in docs).

## 9. Token surface

Key `tag`, layer `base`. Start from badge's full table (§9 of 03-zbk-badge) with `{app.canvas-muted}` canvas, then add:

| Token | Default | Type |
|---|---|---|
| `dismiss-size` | `1.25em` | `sizing` |
| `dismiss-ink` | `{app.ink-muted}` | `color` |
| `dismiss-ink-hover` | `{app.ink}` | `color` |
| `dismiss-canvas` | `transparent` | `color` |
| `dismiss-canvas-hover` | `{app.canvas-emphasis}` | `color` |
| `dismiss-border-radius` | `{border.radius-xl}` | `borderRadius` |
| `focus-color` / `focus-width` / `focus-offset` | `{focus.color}` / `{focus.width}` / `{focus.offset}` | — |
| `transition-duration` (`a11y: true`) / `transition-timing-function` / `transition-property` (`background-color, color`) / `transition-delay` (`0`) | calm defaults, mirror input | `transition` |

Interaction-state suffixes apply to the dismiss tokens only (the shell stays static). Dismiss button hit area must be ≥ 24px even when the glyph is smaller — pad inside `dismiss-size` styling with a comment naming the target-size floor.

## 10. Variants

Same `status` axis set as badge (`info`, `positive`, `caution`, `critical`, remapping `canvas`/`ink`/`border-color` to the `-subtle`/ink aliases), plus `sm` (axis `size`: `font-size: {font-size.xs}` — badge already defaults to xs, so tag's base `font-size` is `{font-size.sm}` and `sm` steps down).

## 11. Custom events

`zbk-dismiss` — dispatched from the host when the dismiss button is activated. Bubbles, composed, **not cancelable** (it announces a request, not an action the component will take). `detail: { text: string }` (the tag's text content at dispatch time).

## 12. Dev-mode warnings

- Empty tag: same as badge's empty warning, adapted.
- `dismiss-label` still resolving to "Remove " (empty text, no explicit label): "Dismiss button has no accessible name. Provide text children or set dismiss-label."

## 13. Tests

Skeleton with and without `dismissible`; adoption; computed and explicit `dismiss-label`; clicking dismiss dispatches `zbk-dismiss` with detail and does **not** remove the element; `focus()` lands on the dismiss button; `dismiss-glyph` slot replaces the default glyph; status + `sm` variants; both warnings.

## 14. Docs

Per conventions. Live examples: static tags, dismissible set with working removal script (including focus handoff and an `announce('Removed …')` call), status variants, custom glyph. Cross-link badge with a one-line "which one?" rule.

## 15. Out of scope (do not build)

- Selectable/toggle tags (future: interplay with `-selected` state, needs its own design)
- Tag input (combobox-adjacent, Phase 2 territory)
- Keyboard navigation between tags (roving collection is a consumer/list concern for now)

## 16. Acceptance checklist

Conventions "Definition of done", plus: dismiss event verified non-cancelable and bubbling; element never self-removes; GRAMMAR amendment applied.

### GRAMMAR.md amendment (apply verbatim)

In §7's slot vocabulary list, add:

> - `dismiss-glyph` — replacement content for a component's built-in dismiss affordance (any markup). Rendered aria-hidden inside the dismiss control; the control's accessible name comes from the component, never from this content.

## 17. Revision notes

(Empty at handoff. Fold anything written here into its home section above, then delete it.)
