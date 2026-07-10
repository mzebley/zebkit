# `<zbk-spinner>` — Phase 1 handoff prompt

Status: READY · Build order: 7 · Depends on: nothing
Read first: `plans/components/00-conventions.md`, `GRAMMAR.md`. Precedence: GRAMMAR.md > this file > conventions.

## 1. Pattern definition

An indeterminate activity indicator for a wait with no measurable completion. Distinct from `<zbk-progress>` (measurable task). The spinning visual is presentational; the accessible signal is the visually-hidden label text plus the `aria-busy` guidance in §8.

## 2. Mirror & references

Structurally the simplest animated component. Reduced-motion handling per conventions. Visually-hidden text technique: copy the inline style block from `src/components/base/announce.ts` into a `.zbk-spinner__label` CSS rule (structural CSS, not tokens).

## 3. Authored markup

```html
<zbk-spinner>Loading results</zbk-spinner>
```

## 4. Rendered skeleton

```html
<zbk-spinner>
  <span class="zbk-spinner">
    <span class="zbk-spinner__indicator" aria-hidden="true"></span>
    <span class="zbk-spinner__label">Loading results</span>
  </span>
</zbk-spinner>
```

The indicator is an empty span drawn entirely in CSS (border ring + rotate keyframe). The label span is visually hidden but always rendered.

## 5. Attributes & properties

`variant` only.

## 6. Content model

Default children: the label text (required — see §12). No other slots.

## 7. Behavior

None. Not focusable. Animation is pure CSS.

## 8. ARIA & announcements

- No role, no live region (GRAMMAR §8: the announcer is the one spelling; a `role="status"` spinner would be a private live region).
- Docs guidance (§14, load-bearing): the consumer sets `aria-busy="true"` on the region being loaded and removes it after, and announces completion via `announce()` when it matters. The spinner alone is not the accessibility story.

## 9. Token surface

Key `spinner`, layer `base`.

| Token | Default | Type |
|---|---|---|
| `display` | `inline-flex` | `display` |
| `size` | `1.5em` | `sizing` |
| `track-color` | `{app.border-muted}` | `color` |
| `indicator-color` | `{accent-primary.500}` | `color` |
| `thickness` | `{border.width-md}` | `borderWidth` |
| `duration` | `0.8s` | `transition`, `a11y: true` |

Styles: indicator span is `inline-size/block-size: var(size)`, `border: var(thickness) solid var(track-color)`, `border-top-color: var(indicator-color)`, `border-radius: 50%` (structural literal — a ring is a circle by definition), `animation: rotate var(duration) linear infinite`. Under `@media (prefers-reduced-motion: reduce)`: animation becomes an opacity pulse between `{opacity.70}`-driven values at the same duration — no rotation.

## 10. Variants

None shipped. Size is `--zbk-spinner-size` (em-based, so it also tracks font-size in context).

## 11. Custom events

None.

## 12. Dev-mode warnings

No label text (empty default children and no aria-label): "No accessible label. Provide text children (visually hidden) so screen reader users know what is loading."

## 13. Tests

Skeleton; indicator is aria-hidden; label text adopted into the hidden span and present in `textContent`; warning on empty; no role/aria-live anywhere in rendered output.

## 14. Docs

Per conventions. Live examples: default, sized via token override in context, inside a button-adjacent loading row. The §8 `aria-busy` + `announce()` guidance gets its own subsection with a complete working example.

## 15. Out of scope (do not build)

- Determinate mode (that's progress), overlay/blocking mode, delayed-appearance logic

## 16. Acceptance checklist

Conventions "Definition of done", plus: reduced-motion swaps rotation for a non-motion cue; rendered output contains no live-region semantics.

## 17. Revision notes

(Empty at handoff. Fold anything written here into its home section above, then delete it.)
