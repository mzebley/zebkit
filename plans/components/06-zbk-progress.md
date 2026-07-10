# `<zbk-progress>` — Phase 1 handoff prompt

Status: READY · Build order: 6 · Depends on: nothing
Read first: `plans/components/00-conventions.md`, `GRAMMAR.md`. Precedence: GRAMMAR.md > this file > conventions.

## 1. Pattern definition

Task-completion measurement: a labeled bar built on a native `<progress>`. Determinate when `value` is set; indeterminate when it is absent. It is **not** a busy indicator for a region with unknown duration and no measurable task — that is `<zbk-spinner>` (07).

## 2. Mirror & references

Field pattern (label wrapper) mirrors `src/components/input/index.ts` — `<progress>` is labelable, so the same wrapping-`<label>` spelling gives the accessible name. Native-`<progress>` styling requires vendor pseudo-elements; §9 specifies the exact selectors so nothing is improvised.

## 3. Authored markup

```html
<zbk-progress value="3" max="10">Uploading 3 of 10 files</zbk-progress>
<zbk-progress>Preparing export</zbk-progress> <!-- indeterminate -->
```

## 4. Rendered skeleton

```html
<zbk-progress value="3" max="10">
  <label class="zbk-progress">
    <span class="zbk-progress__label">Uploading 3 of 10 files</span>
    <progress class="zbk-progress__bar" value="3" max="10"></progress>
  </label>
</zbk-progress>
```

Label span renders only when default children exist. When `value` is unset, the `value` attribute is omitted from the native element entirely (that is what makes it indeterminate — never render `value=""`).

## 5. Attributes & properties

| Attribute | Type | Default | Notes |
|---|---|---|---|
| `variant` | string | — | Per GRAMMAR |
| `value` | number | — (indeterminate) | Forwarded; omit to render indeterminate |
| `max` | number | `100` | Forwarded. The component defaults it to 100 (the value authors expect) rather than the platform's 1 — always render `max` explicitly so the DOM is unambiguous |

## 6. Content model

Default children: the visible label. No other slots.

## 7. Behavior

Purely declarative — reflect `value`/`max` changes to the native element. No pointer/keyboard behavior.

## 8. ARIA & announcements

The native `<progress>` provides role and value semantics; the wrapping label names it. No live announcements (progress chatter is a consumer decision; docs show `announce("Upload complete")` at completion). Author `aria-*` relocates to the `<progress>`.

## 9. Token surface

Key `progress`, layer `base`.

| Token | Default | Type |
|---|---|---|
| `display` | `contents` | `display` (host; label is layout root, mirror input) |
| `track-canvas` | `{app.canvas-muted}` | `color` |
| `fill-canvas` | `{accent-primary.500}` | `color` |
| `height` | `{spacing.xs}` | `sizing` |
| `border-radius` | `{border.radius-xl}` | `borderRadius` |
| `width` / `min-width` / `max-width` | `100%` / `0` / `100%` | `sizing` |
| `label-ink` / `label-font-size` / `label-font-weight` / `label-gap` | mirror input's label tokens | — |
| `font-family` | `{font-family.interface}` | `fontFamily` |
| `indeterminate-duration` | `1.5s` | `transition`, `a11y: true` |
| `transition-duration` (`a11y: true`) / `transition-timing-function` | calm defaults | `transition` |

### styles.scss selectors (write exactly these; this is the hazard zone)

```scss
progress.zbk-progress__bar {
  appearance: none; -webkit-appearance: none;
  border: none;
  block-size: var(...-height); inline-size: var(...-width);
  background-color: var(...-track-canvas);           // Firefox track
  border-radius: var(...-border-radius); overflow: hidden;
}
progress.zbk-progress__bar::-webkit-progress-bar { background-color: var(...-track-canvas); border-radius: var(...-border-radius); }
progress.zbk-progress__bar::-webkit-progress-value { background-color: var(...-fill-canvas); border-radius: var(...-border-radius); transition: inline-size var(...-transition-duration) var(...-transition-timing-function); }
progress.zbk-progress__bar::-moz-progress-bar { background-color: var(...-fill-canvas); border-radius: var(...-border-radius); }
```

(`...` = `--#{prefix.$cssVar}-progress`.) Keep the `-webkit-` and `-moz-` rule sets in **separate rules** — a combined selector list is dropped entirely by browsers that don't recognize one of its pseudo-elements.

Indeterminate (`progress.zbk-progress__bar:indeterminate`): hide the value pseudo-elements' fill and animate a keyframe sweep (a `fill-canvas` gradient translating across the track, `indeterminate-duration` per cycle, `linear`). Under `@media (prefers-reduced-motion: reduce)`, replace the sweep with a static two-tone track (no motion).

## 10. Variants

`sm` (axis `size`): `height: {spacing.2xs}`, `label-font-size: {font-size.xs}`. `lg` (axis `size`): `height: {spacing.sm}`.

## 11. Custom events

None.

## 12. Dev-mode warnings

No accessible name (no children, no aria-label/labelledby): input's message adapted — "No accessible name. Provide label text as children, or aria-label / aria-labelledby."

## 13. Tests

Skeleton; label adoption and conditional label span; `value`/`max` forwarding; unset `value` renders no value attribute (`el.querySelector('progress').hasAttribute('value') === false`); `max` defaults to 100 in the DOM; value updates reflect; variants; name warning.

## 14. Docs

Per conventions. Live examples: determinate with a play button that advances value, indeterminate, `sm`/`lg`. Guidance: progress (measurable task) vs spinner (indeterminate wait) — cross-link 07.

## 15. Out of scope (do not build)

- Circular/radial rendering (spinner covers the circular case; a radial *determinate* gauge is a future component)
- Value text ("30%") rendering — authors put it in the label
- Buffer/secondary value (media-style)

## 16. Acceptance checklist

Conventions "Definition of done", plus: vendor pseudo-element rules present and separate; indeterminate animation disabled under reduced motion; indeterminate = attribute genuinely absent.

## 17. Revision notes

(Empty at handoff. Fold anything written here into its home section above, then delete it.)
