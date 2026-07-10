# `<zbk-combobox>` — Phase 2 plan (deferred)

Status: DEFERRED — high-level plan, not yet a handoff prompt. Promote using the Phase 1 section skeleton (see any 0x/1x file) once §7 is satisfied.

## 1. Pattern definition

A text input that filters and selects from a popup listbox (APG combobox pattern, `role="combobox"` + `aria-activedescendant` + `role="listbox"` popup). Covers autocomplete, searchable select, and async option loading. The hardest form control in the catalog.

## 2. Why deferred

- Needs popover's positioning util and menu's roving-focus/typeahead learnings shipped and stress-tested first.
- `aria-activedescendant` (focus stays in the input; highlight is virtual) is a different focus model than menu's roving tabindex — getting both patterns coherent in one grammar deserves hindsight from menu.
- Filtering, async options, and free-text-vs-strict selection multiply the API surface; premature commitment here is expensive.

## 3. Anticipated anatomy (sketch)

`<zbk-combobox>` wrapping: label (input's label spelling) → `input[role=combobox][aria-expanded][aria-controls][aria-activedescendant]` → popup `[role=listbox]` of `[role=option]` elements. Options authored as children (select's adoption-filtering precedent) or supplied via property for dynamic data. Reuses input's field-box shell (affixes, states) and popover's panel shell.

## 4. Key decisions to resolve

1. Option supply: authored `<option>`-like children only, a data property only, or both (both risks "two spellings" — likely authored children as the one spelling, with a documented DOM-update pattern for async).
2. Free text allowed (`strict` attribute?) and what `value` means in each mode.
3. Filtering built-in (startsWith/contains token-of-behavior?) vs consumer-driven (component only renders what's there — likely this, it's smaller and honest).
4. Multi-select in scope? (Leaning: no — separate future pattern with tag integration.)
5. Custom event surface: selection is not expressible natively here (no native element owns the pattern) — likely `zbk-change` with selected option detail; must be argued against GRAMMAR §8.
6. Empty/loading/no-results states: slots or attributes.

## 5. Prior art to reuse

`base/positioning.ts`; input's field shell, label wiring, and warning; menu's typeahead/scroll-into-view; select's adoption filtering; tooltip/popover's popover-API promotion and dismiss listeners.

## 6. Risks

`aria-activedescendant` support quirks across AT; filtering + IME composition; jsdom coverage limits (may need integration tests via `test:integration`).

## 7. Promotion checklist

- [ ] Popover and menu merged, no open a11y bugs against either
- [ ] §4 decisions made and recorded here (then this section becomes the spec inputs)
- [ ] Full Phase 1-style prompt written, including exact ARIA wiring table and keyboard matrix

## 8. Revision notes

(Working notes welcome here while the component is deferred.)
