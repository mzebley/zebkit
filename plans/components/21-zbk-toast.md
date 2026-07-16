# `<zbk-toast>` — Phase 2 plan (deferred)

Status: DEFERRED — high-level plan, not yet a handoff prompt. Promote using the Phase 1 section skeleton once §7 is satisfied.

## 1. Pattern definition

Transient, self-positioning notifications: alert content that appears in a viewport corner, stacks, optionally auto-dismisses, and announces via the shared announcer. Visually an alert; behaviorally a queue.

## 2. Why deferred

- Should reuse alert's shell and dismiss contract — alert must ship first and settle.
- The hard part is not a component but a *service*: a queue/region manager (max visible, ordering, pause-on-hover, timer semantics under reduced motion, focus rules for actionable toasts). That's an API design exercise, not a pattern-completion exercise.

## 3. Anticipated anatomy (sketch)

A viewport-fixed region element (`<zbk-toast-region>`, one per app, owns stacking + placement tokens) plus an imperative `toast(...)` function exported from the components package (mirroring `announce()`'s "one spelling" precedent) that renders `<zbk-toast>` items — each item composing alert's visual shell with a timer.

## 4. Key decisions to resolve

1. Imperative `toast()` API vs declarative-only elements (leaning: imperative function + declarative region, matching how `announce()` already works).
2. Auto-dismiss defaults and the a11y stance: WCAG 2.2.1 timing — pause on hover/focus, no auto-dismiss for toasts with actions (leaning: no-action toasts 6s default token; action toasts persist).
3. Announcer urgency mapping per status; do critical toasts interrupt (`assertive`)?
4. Placement vocabulary (`inline-start/end × block-start/end`) as region attribute or token.
5. Motion: enter/exit transitions under `@starting-style` + reduced-motion story.
6. Does `zbk-dismiss` fire on auto-dismiss too, or only user dismissal (leaning: both, with `detail.reason`).

## 5. Prior art to reuse

Alert's entire shell, status variants, and dismiss contract; `announce()`; z-index `{z-index.fixed}`/`{z-index.tooltip}` strata decision from tooltip.

## 6. Risks

Timer + reduced-motion + screen-reader interplay is easy to get subtly wrong; queue APIs invite scope creep (promise returns, update-in-place, progress toasts) — anti-goal pressure.

## 7. Promotion checklist

- [ ] Alert merged and its dismiss contract proven in real usage
- [ ] §4 decisions recorded
- [ ] Full prompt written, including the region/service API spec and timing-token table

## 8. Revision notes

(Working notes welcome here while the component is deferred.)
