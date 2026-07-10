# `<zbk-accordion>` — Phase 1 handoff prompt

Status: READY · Build order: 10 · Depends on: 09-zbk-disclosure (hard dependency — must be merged first)
Read first: `plans/components/00-conventions.md`, `GRAMMAR.md`, `plans/components/09-zbk-disclosure.md`. Precedence: GRAMMAR.md > this file > conventions.

## 1. Pattern definition

A grouping layer over `<zbk-disclosure>` children: shared borders/dividers, optional exclusive-open policy, and arrow-key traversal between summaries (APG accordion keyboard pattern). The accordion owns *group* concerns only; each item stays a fully functional disclosure.

## 2. Mirror & references

Behavior component with minimal own rendering. Child coordination (finding, observing, delegating) has no exact precedent — keep it simple: query `:scope > zbk-disclosure` on demand rather than caching.

## 3. Authored markup

```html
<zbk-accordion single>
  <zbk-disclosure open>
    <span slot="summary">What is zebkit?</span>
    <p>…</p>
  </zbk-disclosure>
  <zbk-disclosure>
    <span slot="summary">How do tokens work?</span>
    <p>…</p>
  </zbk-disclosure>
</zbk-accordion>
```

## 4. Rendered skeleton

```html
<zbk-accordion single>
  <div class="zbk-accordion">
    <zbk-disclosure>…</zbk-disclosure>
    <zbk-disclosure>…</zbk-disclosure>
  </div>
</zbk-accordion>
```

Adopted children pass through unchanged; the wrapper div carries the group styling.

## 5. Attributes & properties

| Attribute | Type | Default | Notes |
|---|---|---|---|
| `variant` | string | — | Per GRAMMAR |
| `single` | boolean | false | Exclusive-open: opening one item closes the others |

## 6. Content model

Default children: `<zbk-disclosure>` elements (anything else warns, §12, and renders untouched).

## 7. Behavior

- **Exclusive open** (`single`): listen for `toggle` events from descendants in the capture phase on the wrapper (native `toggle` doesn't bubble; capture from an ancestor still sees it — verify in tests; if jsdom disagrees, observe each child's `open` attribute with one MutationObserver instead, and note which mechanism shipped in the README). When an item opens, remove `open` from the other items.
- **Keyboard traversal**, per APG: with focus on any child summary — `ArrowDown`/`ArrowUp` move focus to the next/previous summary (no wrap), `Home`/`End` jump to first/last. Implemented with one keydown listener on the wrapper; target summaries via each disclosure's `focus()` (which forwards to its summary). Enter/Space stay native to each disclosure. Tab order is untouched (every summary remains a tab stop).
- Dynamically added/removed disclosures work because children are queried on each event, not cached.

## 8. ARIA & announcements

No extra roles — a group of disclosures needs none (details/summary semantics suffice). `nativeElement` returns the wrapper div. No announcer usage.

## 9. Token surface

Key `accordion`, layer `base`.

| Token | Default | Type |
|---|---|---|
| `display` | `block` | `display` |
| `gap` | `0` | `spacing` (space between items; 0 = flush list) |
| `divider-color` | `{app.border}` | `color` |
| `divider-width` | `{border.width-sm}` | `borderWidth` |
| `border-color` | `{app.border}` | `color` (outer frame) |
| `border-width` | `{border.width-sm}` | `borderWidth` |
| `border-style` | `{border.style}` | `borderStyle` |
| `border-radius` | `{border.radius-md}` | `borderRadius` |
| `canvas` | `transparent` | `color` |

Styles: the wrapper draws the outer frame. Child disclosures get their own frames suppressed (`.zbk-accordion > zbk-disclosure > details.zbk-disclosure { border: none; border-radius: 0; }`) and dividers drawn between items using the longhand properties so each stays tokenable: `.zbk-accordion > zbk-disclosure + zbk-disclosure > details.zbk-disclosure { border-block-start-width: var(divider-width); border-block-start-style: var(border-style); border-block-start-color: var(divider-color); }` (all accordion tokens). The wrapper uses `overflow: hidden` (structural) so child corners clip to the frame radius; since that can clip focus outlines, inset the summary outline inside accordions — `.zbk-accordion summary:focus-visible { outline-offset: calc(var(focus-offset) * -1); }` with disclosure's focus tokens.

## 10. Variants

None shipped.

## 11. Custom events

None. Open state is each child's `open` attribute.

## 12. Dev-mode warnings

- Non-disclosure element child: "Accordion children must be <zbk-disclosure> elements; got <x>. Wrap the content in a disclosure or move it outside the accordion."
- `single` with multiple children authored `open`: keep the last-authored open, close the rest, and warn: "single accordion had N items open; keeping the last."

## 13. Tests

Wrapper skeleton + pass-through adoption; `single` closes siblings on open (whichever mechanism shipped); non-single leaves siblings alone; ArrowDown/ArrowUp/Home/End move focus between summaries (assert `document.activeElement`); no wrap at ends; non-disclosure child warning; multiple-open-with-single warning + resolution; dynamically appended disclosure participates.

## 14. Docs

Per conventions. Live examples: multi-open (default), `single`, FAQ-style long content. Guidance: accordion vs standalone disclosures; don't put critical content only inside collapsed panels.

## 15. Out of scope (do not build)

- Heading-level wiring (`<h3><summary>` structures) — details/summary can't nest in headings; document the limitation
- Animated panel height (same deferral as disclosure)
- Controlled/uncontrolled dual API — the `open` attributes are the single source of truth

## 16. Acceptance checklist

Conventions "Definition of done", plus: keyboard traversal test green; focus outline not clipped by the wrapper (manual check in docs page noted in PR); disclosure's own tests still green (no regression from the border-suppression selectors).

## 17. Revision notes

(Empty at handoff. Fold anything written here into its home section above, then delete it.)
