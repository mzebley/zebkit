# `<zbk-table>` — Phase 2 plan (deferred)

Status: DEFERRED — high-level plan, not yet a handoff prompt. Promote using the Phase 1 section skeleton once §7 is satisfied.

## 1. Pattern definition

Tabular data presentation. The zebkit-honest version is likely **not** a data grid: native `<table>` semantics are already perfect, so the component's value is the token surface (row striping, header treatment, density, borders, sticky header) applied to authored table markup — plus, maybe, completion behaviors (sortable headers) as a second phase.

## 2. Why deferred

- Scope decision dominates everything: styled native table vs sortable table vs selectable-rows grid are three different components with three different a11y stories. Deciding this before button/link/menu patterns matured would bake in regret.
- A styled-table-only version might not even be a custom element — possibly a class + token namespace (`.zbk-table` on a native `<table>`), which would be a new kind of artifact for the system and deserves its own argument against GRAMMAR §1's "the custom element is the single documented entry point."

## 3. Anticipated anatomy (sketch)

Phase A: `.zbk-table` token-driven styling for authored `<table>` (possibly wrapped by `<zbk-table>` for grammar consistency and future behavior attachment; the wrapper adopts the authored table verbatim). Phase B (separate plan): `aria-sort` header buttons + `zbk-sort` event, consumer sorts data.

## 4. Key decisions to resolve

1. Element vs class-only entry point (the GRAMMAR §1 question above) — this is the blocking decision.
2. Scope line: styling only, or styling + sort affordance? (Selection, pagination-integration, virtualization: explicitly never in v1.)
3. Responsive strategy: horizontal scroll container (leaning) vs stacked-card reflow (anti-goal risk: reflow changes reading semantics).
4. Sticky header as token (`header-position`) or attribute.
5. Density as `size`-axis variants (`compact`, `spacious`)?

## 5. Prior art to reuse

Utility-manifest philosophy for the "vocabulary of table treatments"; breadcrumb's adopt-authored-markup-verbatim approach if the wrapper route wins.

## 6. Risks

Scope creep toward a data grid (an entire product); wrapper element intercepting table semantics if adoption is done carelessly (never re-parent `<tr>`s across table sections).

## 7. Promotion checklist

- [ ] §4 decision 1 and 2 made and written up (with the GRAMMAR argument if class-only wins)
- [ ] Full prompt written for the chosen scope; sort affordance split into its own follow-up plan file

## 8. Revision notes

(Working notes welcome here while the component is deferred.)
