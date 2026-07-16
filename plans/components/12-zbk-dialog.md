# `<zbk-dialog>` — Phase 1 handoff prompt

Status: READY · Build order: 12 · Depends on: nothing
Read first: `plans/components/00-conventions.md`, `GRAMMAR.md`. Precedence: GRAMMAR.md > this file > conventions.

## 1. Pattern definition

The modal dialog, built on native `<dialog>` + `showModal()`: focus trap, inertness of the page, Escape handling, top layer, and focus return are all platform behavior. **Always modal** — a non-modal anchored panel is `<zbk-popover>`; one intent, one spelling. The component completes the pattern: labeled-by wiring, token surface (including `::backdrop`), scroll containment, and a light-DOM-safe close signal.

## 2. Mirror & references

Child adoption split across named slots mirrors `src/components/select/index.ts`. This is the first component whose semantics-bearing native element (`<dialog>`) fires a non-bubbling lifecycle event authors need — §11 defines the one custom event and why it does not violate the never-proxy rule.

## 3. Authored markup

```html
<zbk-dialog>
  <h2 slot="title">Delete workspace?</h2>
  <p>This permanently removes the workspace and its 14 projects.</p>
  <div slot="footer">
    <zbk-button data-close>Cancel</zbk-button>
    <zbk-button variant="critical">Delete</zbk-button>
  </div>
</zbk-dialog>
```

Opened imperatively (`el.show()`) or by adding the `open` attribute.

## 4. Rendered skeleton

```html
<zbk-dialog>
  <dialog class="zbk-dialog" aria-labelledby="zbk-dialog-1-title">
    <div class="zbk-dialog__title" id="zbk-dialog-1-title"><h2>Delete workspace?</h2></div>
    <div class="zbk-dialog__content"><p>…</p></div>
    <div class="zbk-dialog__footer"><zbk-button data-close>…</zbk-button>…</div>
  </dialog>
</zbk-dialog>
```

Title and footer wrappers render only when their slots have content; `aria-labelledby` only when title content exists.

## 5. Attributes & properties

| Attribute | Type | Default | Notes |
|---|---|---|---|
| `variant` | string | — | Per GRAMMAR |
| `open` | boolean | false | Reflected both ways. Adding it calls `showModal()`; native close removes it. **Never** forward it as the native `open` attribute (that would render non-modal) — the property drives `showModal()`/`close()` calls |
| `closedby` | string | — | Forwarded verbatim to the `<dialog>` where the platform supports it (`any` = light dismiss). No polyfill: unsupported browsers simply don't light-dismiss |

Public methods: `show()` (calls native `showModal()`), `close(returnValue?)` (native `close`). The names are the zebkit spelling; docs never mention `showModal`.

## 6. Content model

Default children: the dialog body. `title` slot: the heading content (author keeps their own `<h2>`/`<h3>` — the component never chooses a heading level). `footer` slot: the action row. Requires the GRAMMAR amendment in §16. Any element inside the dialog carrying `data-close` closes it on click (delegated listener) — the declarative cancel-button spelling.

## 7. Behavior

- Open: `showModal()`; platform handles focus (honors `autofocus` in authored content), trap, inert page, Escape.
- Close paths: native Escape → `cancel` → `close`; `close()` method; `data-close` click; `closedby="any"` light dismiss where supported. On every path the internal `close` event fires → component syncs `open` off and dispatches `zbk-close` (§11).
- Scroll containment: `overscroll-behavior: contain` on the dialog (structural CSS). Do not touch `body` styles.
- While open, `document.body` gets no classes and no inline styles — the top layer and inertness make scroll-locking hacks unnecessary; note this in the README.

## 8. ARIA & announcements

`aria-labelledby` → generated title id (uidFor). Authors add `aria-describedby` themselves if needed (relocates to the `<dialog>`). `nativeElement` returns the `<dialog>`. No announcer usage (opening a modal dialog is self-announcing via focus).

## 9. Token surface

Key `dialog`, layer `base`.

| Token | Default | Type |
|---|---|---|
| `display` | `contents` | `display` |
| `canvas` | `{app.canvas}` | `color` |
| `ink` | `{app.ink}` | `color` |
| `border-color` | `transparent` | `color` |
| `border-width` | `{border.width-sm}` | `borderWidth` |
| `border-style` | `{border.style}` | `borderStyle` |
| `border-radius` | `{border.radius-lg}` | `borderRadius` |
| `padding-inline` / `padding-block` | `{spacing.lg}` / `{spacing.lg}` | `spacing` |
| `width` | `32rem` | `sizing` |
| `max-width` | `calc(100vw - 2 * {spacing.lg})` — implement as `max-inline-size` with the spacing token var | `sizing` |
| `max-height` | `85vh` | `sizing` (content area scrolls beyond it) |
| `gap` | `{spacing.md}` | `spacing` (title/content/footer stack gap) |
| `box-shadow` | `{elevation.xl}` | `boxShadow` |
| `backdrop-canvas` | `{app.canvas-inverse}` | `color` |
| `backdrop-opacity` | `{opacity.50}` | `opacity` |
| `backdrop-blur` | `0` | `sizing` |
| `title-ink` / `title-font-family` / `title-font-size` / `title-font-weight` | `{app.ink-emphasis}` / interface / `{font-size.lg}` / `{font-weight.bold}` | — |
| `footer-gap` | `{spacing.sm}` | `spacing` |
| `footer-justify` | `flex-end` | `utility` |
| `font-family` / `font-size` / `line-height` | interface / `{font-size.md}` / `{line-height.2}` | — |
| `transition-duration` (`a11y: true`) / `transition-timing-function` | calm defaults | `transition` |

`::backdrop` styling: `dialog.zbk-dialog::backdrop { background-color: var(backdrop-canvas); opacity: var(backdrop-opacity); backdrop-filter: blur(var(backdrop-blur)); }` — custom properties don't inherit into `::backdrop` in all engines; set the vars explicitly on the `::backdrop` rule via the same `var()` references with their compiled fallback values (the token build emits values on `:root`, which `::backdrop` can read in modern engines; verify in the docs page and note the result in the PR).

## 10. Variants

`sm` (axis `size`): `width: 24rem`. `lg` (axis `size`): `width: 44rem`.

## 11. Custom events

`zbk-close` — dispatched from the host after the dialog closes. Bubbles, composed, not cancelable. `detail: { returnValue: string }`. Justification (record in the component header comment): the platform's `close` event exists but does not bubble and fires on internal DOM the author must never query (GRAMMAR §7); re-targeting the semantic to the host is completing the pattern, not offering a second spelling of a reachable native event. There is no `zbk-open` (opening is something the consumer did; closing is something that happens to them).

## 12. Dev-mode warnings

- No title slot and no author `aria-label`/`aria-labelledby`: "Dialog has no accessible name. Provide slot=\"title\" content or aria-label."
- `open` authored in initial markup: allowed (component calls `showModal()` on first update), but warn if `showModal` throws (not connected corner cases) with the fix.

## 13. Tests

Skeleton + conditional title/footer wrappers + labelledby wiring; `show()`/`close()` toggle native open state and the host `open` attribute; `open` attribute set/removed triggers the methods; `zbk-close` fires on method close and on native close event with `returnValue`; `data-close` click closes; no-name warning; variants. jsdom's `<dialog>` support is partial — if `showModal` is missing, stub it on the prototype in tests (assert it was called) rather than skipping.

## 14. Docs

Per conventions. Live examples: confirm dialog (the §3 markup, working), form-in-dialog with `returnValue`, `sm`/`lg`, `closedby="any"`. Guidance: dialog vs popover; destructive-action confirmation wording; keep dialogs one decision deep.

## 15. Out of scope (do not build)

- Non-modal mode (popover's job) and side-sheet/drawer presentations (future variant work, needs design)
- Open/close animation (dialog + top-layer animation needs `@starting-style`; defer as a follow-up)
- Router/URL integration, nested-dialog management

## 16. Acceptance checklist

Conventions "Definition of done", plus: the native `open` attribute is never authored/forwarded (modal invariant); `zbk-close` justification comment present; backdrop var behavior verified in the docs page; GRAMMAR amendment applied.

### GRAMMAR.md amendment (apply verbatim)

In §7's slot vocabulary list, add:

> - `title` — the pattern's heading content (author-supplied heading element; the component wires `aria-labelledby`, never chooses the heading level).
> - `footer` — the pattern's trailing action row (any markup, typically buttons).

## 17. Revision notes

(Empty at handoff. Fold anything written here into its home section above, then delete it.)
