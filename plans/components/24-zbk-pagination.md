# `<zbk-pagination>` — Phase 2 plan (deferred)

Status: DEFERRED — high-level plan, not yet a handoff prompt. Promote using the Phase 1 section skeleton once §7 is satisfied.

## 1. Pattern definition

Page navigation for a partitioned collection: a `<nav aria-label="Pagination">` of page links/buttons with previous/next, current-page marking (`aria-current="page"`), and windowed page-number display with ellipses.

## 2. Why deferred

- Low urgency and fully buildable from stable primitives once link/button patterns settle.
- One real design fork (links vs buttons, §4.1) depends on how consumers route — worth observing real zebkit usage first.

## 3. Anticipated anatomy (sketch)

`<zbk-pagination current="3" total="12">` → `nav > ul > li*` with prev/next controls and windowed numbers. Component computes the window (first, last, neighbors of current, ellipses as non-interactive spans). Breadcrumb is the structural precedent (nav + list + aria-current + CSS-content separators).

## 4. Key decisions to resolve

1. Links (`href` template/builder for real URL-per-page — better for crawlers and modified-click) vs buttons + `zbk-page-change` event (SPA-friendly). Supporting both is a two-spellings smell; likely: links when an `href-template` attribute is present, buttons otherwise — needs the GRAMMAR argument written.
2. Window algorithm parameters as attributes (`siblings`, `boundaries`) or fixed opinion.
3. Compact variant ("Page 3 of 12" + prev/next only) — variant, attribute, or separate presentation?
4. Announcer usage on page change (leaning: yes, `announce("Page 3 of 12")` when buttons are used).

## 5. Prior art to reuse

Breadcrumb (nav/list/aria-current skeleton, adoption, warnings); link and button token surfaces (pagination items will lean on `{action.*}` aliases the same way); tag's event-contract style if the event route wins.

## 6. Risks

The dual links/buttons mode doubling the test surface; ellipsis windows are a classic off-by-one nest — the promoted plan must include a worked example table of expected windows.

## 7. Promotion checklist

- [ ] Link and button shipped long enough to see real routing usage
- [ ] §4.1 decided with the one-spelling argument recorded
- [ ] Full prompt written, including the window-algorithm example table and keyboard/AT walkthrough

## 8. Revision notes

(Working notes welcome here while the component is deferred.)
