# `<zbk-popover>` — Phase 1 handoff prompt

Status: READY · Build order: 11 · Depends on: nothing (13-zbk-menu depends on this; includes a tooltip refactor step)
Read first: `plans/components/00-conventions.md`, `GRAMMAR.md`, `src/components/tooltip/index.ts` (the direct ancestor of this pattern). Precedence: GRAMMAR.md > this file > conventions.

## 1. Pattern definition

The anchored-overlay primitive: a trigger button toggles a positioned panel of **interactive** content (form controls, links, rich markup). This is what tooltip is not — tooltip carries supplementary text, popover carries things you operate. Non-modal: focus is not trapped, the page stays interactive, light dismiss closes it. Modal blocking is `<zbk-dialog>` (12).

## 2. Mirror & references

Tooltip is the reference for: floating-ui usage (`computePosition`, `offset`/`flip`/`shift`/`arrow`, `autoUpdate`), popover-API promotion with `hidden` fallback, document-level Escape/outside-press listeners with `AbortController`, token-driven timing/sizing reads. Reuse its solutions verbatim where this plan doesn't say otherwise.

### Step 0 — shared positioning util (do this first, separate commit)

Extract tooltip's positioning core into `src/components/base/positioning.ts`:

- `export interface AnchoredPosition { placement: Placement; offsetPx: number; arrowEl?: HTMLElement }` (shape may vary; keep it minimal)
- `export function positionAnchored(anchor: HTMLElement, panel: HTMLElement, opts): Promise<void>` — the body of tooltip's `place()` generalized (arrow optional)
- `export function trackAnchored(anchor, panel, opts): () => void` — the `autoUpdate` wiring with the jsdom/no-ResizeObserver fallback

Refactor tooltip to consume it (no behavior change — its tests must pass untouched, pre-release rules: no compatibility shim, just move the code). Popover and later menu consume the same util.

## 3. Authored markup

```html
<zbk-popover placement="bottom-start">
  <zbk-button slot="trigger">Filters</zbk-button>
  <form>… interactive content …</form>
</zbk-popover>
```

## 4. Rendered skeleton

```html
<zbk-popover placement="bottom-start">
  <zbk-button slot="trigger" aria-expanded="false" aria-controls="zbk-popover-1-panel">Filters</zbk-button>
  <div class="zbk-popover" id="zbk-popover-1-panel" popover="manual" data-zbk-popover-panel>
    <div class="zbk-popover__content"><form>…</form></div>
    <span class="zbk-popover__arrow" aria-hidden="true"></span>
  </div>
</zbk-popover>
```

- Trigger: the `trigger`-slotted element, rendered in place (before the panel). `aria-expanded`/`aria-controls` are set on it (on its internal focusable when it's a zebkit component — write to the slotted element; ZebkitElement relocation handles the rest for zbk-* triggers; for a native `<button>` trigger write directly).
- `popover="manual"` (not `auto`) because the component owns light-dismiss itself, identically in both the top-layer and fallback paths — one code path for dismiss logic, same as tooltip. Fallback when the popover API is missing: `hidden` attribute, positioned `fixed` (tooltip's exact approach).
- Arrow renders only when `arrow` attribute is present (§5).

## 5. Attributes & properties

| Attribute | Type | Default | Notes |
|---|---|---|---|
| `variant` | string | — | Per GRAMMAR |
| `open` | boolean | false | Reflected; set/removed by the component on show/hide, settable by consumers |
| `placement` | string | `bottom` | floating-ui vocabulary (side, optional `-start`/`-end`), same as tooltip |
| `arrow` | boolean | false | Draw the caret |

Public methods: `show()`, `hide()`, `toggle()` — one spelling each; `open` attribute changes route through them.

## 6. Content model

`trigger` slot: the single element that toggles the panel (must be, or contain, a real button — same dev check as tooltip's toggle mode). Default children: the panel content (any markup). Requires the GRAMMAR amendment in §16.

## 7. Behavior

- Trigger click toggles.
- **Open**: show panel (popover API or fallback), start `trackAnchored`, set `aria-expanded="true"`, add document listeners (capture-phase `pointerdown` for outside-press, `keydown` for Escape — tooltip's exact pattern). Focus is **not** moved (WAI non-modal popover guidance: focus stays on the trigger; the panel is next in tab order because it renders immediately after the trigger in light DOM — tab reaches the content naturally).
- **Close**: on Escape (return focus to trigger), on outside press (no focus change), on trigger click, on `hide()`. Also close when focus leaves both trigger and panel via keyboard (`focusout` where `relatedTarget` is outside `this`).
- No hover behavior of any kind.

## 8. ARIA & announcements

`aria-expanded` + `aria-controls` on the trigger; panel has no role (generic container — content brings its own semantics). `nativeElement` returns the trigger element; `focusTarget` the same. No announcer usage.

## 9. Token surface

Key `popover`, layer `base`. Mirror tooltip's surface with these values:

| Token | Default | Type |
|---|---|---|
| `display` | `contents` | `display` |
| `canvas` | `{app.canvas}` | `color` |
| `ink` | `{app.ink}` | `color` |
| `border-color` | `{app.border}` | `color` |
| `border-width` | `{border.width-sm}` | `borderWidth` |
| `border-style` | `{border.style}` | `borderStyle` |
| `border-radius` | `{border.radius-md}` | `borderRadius` |
| `padding-inline` / `padding-block` | `{spacing.md}` / `{spacing.sm}` | `spacing` |
| `max-width` | `20rem` | `sizing` |
| `arrow-size` | `8px` | `sizing` |
| `offset` | `{popover.arrow-size}` | `sizing` |
| `box-shadow` | `{elevation.md}` | `boxShadow` |
| `z-index` | `{z-index.popover}` | `zIndex` (fallback path only) |
| `font-family` / `font-size` / `line-height` | interface / `{font-size.sm}` / `{line-height.2}` | — |
| `transition-duration` (`a11y: true`) / `transition-timing-function` | calm defaults | `transition` |

No show-delay/hide-grace (those are hover-timing tokens; popover has no hover behavior).

## 10. Variants

None shipped.

## 11. Custom events

None. Open state is the reflected `open` attribute; methods are the imperative API. (Tooltip precedent: no custom events for overlay state.)

## 12. Dev-mode warnings

- No trigger content: tooltip's missing-trigger message adapted to the `trigger` slot.
- Trigger is not/doesn't contain a button: tooltip's toggle-mode control check, verbatim logic.

## 13. Tests

Skeleton (trigger placement, panel id/popover attribute, conditional arrow); click toggles + `aria-expanded` sync + `open` reflection; Escape closes and returns focus to trigger; outside press closes without focus change; focusout-to-outside closes; `show()`/`hide()`/`toggle()`; content stays interactive (click a button inside the panel — panel stays open); both warnings; fallback path (jsdom has no popover API, so the fallback IS the tested path — add one test stubbing `showPopover` to cover the promotion branch, mirroring tooltip's tests).

## 14. Docs

Per conventions. Live examples: filter-form popover, arrow variant, placement showcase. Guidance table: tooltip vs popover vs dialog vs (future) menu — one row each, when to use which. Add the popover row to tooltip's page too.

## 15. Out of scope (do not build)

- Hover/focus triggering (tooltip's job)
- Focus trap, inertness, backdrop (dialog's job)
- `role="menu"` semantics (menu's job)
- Nested-popover coordination

## 16. Acceptance checklist

Conventions "Definition of done", plus: Step 0 refactor landed first with tooltip tests green and zero tooltip behavior change; dismiss logic identical across top-layer and fallback paths; GRAMMAR amendment applied.

### GRAMMAR.md amendment (apply verbatim)

In §7's slot vocabulary list, add:

> - `trigger` — the single interactive element that opens/closes an overlay pattern (a real button or a component wrapping one). Rendered in place, before the overlay panel; the component wires its `aria-expanded`/`aria-controls`.

## 17. Revision notes

(Empty at handoff. Fold anything written here into its home section above, then delete it.)
