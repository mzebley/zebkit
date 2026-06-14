# Utility Class Coverage Benchmark

Tracks zebkit's utility-class surface against Tailwind's catalog so we can see how far we are from our internal bare-minimum. Organized by Tailwind's own doc categories.

**Status key**

- `[x]` — covered via manifest (single source of truth)
- `[x] LEGACY` — works via an un-migrated mixin; **owes a manifest migration**
- `[~]` — partial coverage; see note
- `[ ]` — missing
- `(scope?)` — needs an explicit keep/drop decision against [VISION.md](../../../../VISION.md)

Migrating a `LEGACY` family does **not** add coverage — it moves the tag to a plain `[x]`.

---

## Legacy migration backlog (refactor map)

Five mixin families are the entire legacy surface. Everything tagged `LEGACY` below rolls up to one of these:

- [ ] **color** mixin -> `ink-*` (text), `canvas-*` (bg), `border-*` (border-color), `fill-*` — incl. hover/focus/active/disabled states
- [ ] **font** mixin -> font-family, font-size, font-weight, line-height, letter-spacing (`tracking`), line-clamp, text-measure (`measure`)
- [ ] **border** mixin -> border-width, border-radius
- [ ] **position** mixin -> physical-edge offsets (top/right/bottom/left)
- [ ] **spacing** mixin -> largely superseded by margin/padding manifests; confirm nothing remains

---

## Layout

- [x] display
- [x] position
- [x] visibility
- [x] object-fit
- [x] object-position
- [x] overflow (+ -x / -y)
- [~] LEGACY inset / top-right-bottom-left — position mixin; physical edges only, no logical, no `inset` shorthand, no `auto`
- [ ] z-index — token module exists, no classes
- [ ] box-sizing
- [ ] aspect-ratio
- [ ] float / clear
- [ ] isolation
- [ ] overscroll-behavior
- [ ] columns / break-before / -after / -inside `(scope?)`
- [ ] box-decoration-break `(scope?)`

## Flexbox & Grid — fully covered (manifest)

- [x] flex-direction, flex-wrap, flex, flex-grow, flex-shrink, flex-basis, order
- [x] grid-template-columns / -rows, grid-column (+span/start/end), grid-row (+span/start/end)
- [x] grid-auto-flow / -columns / -rows
- [x] gap (+ row/column)
- [x] justify-content / -items / -self
- [x] align-content / -items / -self
- [x] place-content / -items / -self

## Spacing

- [x] margin (logical edges + `auto`)
- [x] padding (logical edges)
- [ ] space-between (`space-x` / `space-y`) `(scope? — gap preferred)`

## Sizing — large gap

- [ ] width / min-width / max-width
- [~] LEGACY max-width for text only (`measure-*`, via font mixin) — no general `max-w`
- [ ] height / min-height / max-height
- [ ] size (w+h shorthand)

## Typography

- [x] white-space, word-break, overflow-wrap, hyphens, text-wrap, text-overflow, truncate
- [x] LEGACY font-family
- [x] LEGACY font-size (`font-*` / `text-*`)
- [x] LEGACY font-weight
- [x] LEGACY line-height
- [x] LEGACY letter-spacing (`tracking-*`)
- [x] LEGACY line-clamp
- [~] LEGACY text-measure (`measure-*`)
- [ ] text-align — bare-minimum miss
- [ ] text-transform (uppercase/lowercase/capitalize)
- [ ] font-style (italic)
- [ ] text-decoration-line (underline / line-through / no-underline)
- [ ] text-decoration-color / -style / -thickness / underline-offset
- [ ] vertical-align
- [ ] text-indent
- [ ] font-smoothing (antialiased)
- [ ] font-variant-numeric
- [ ] list-style-type / -position / -image
- [ ] content `(scope?)`

## Colors / Backgrounds

- [x] LEGACY text color (`ink-*`) — with hover/focus/active/disabled states
- [x] LEGACY background-color (`canvas-*`)
- [ ] background-image / gradients `(scope?)`
- [ ] background-position / -size / -repeat / -attachment / -clip / -origin `(scope?)`

## Borders

- [x] LEGACY border-width (+ x/y/per-side)
- [x] LEGACY border-radius (+ per-corner)
- [x] LEGACY border-color (`border-*`)
- [ ] border-style (solid/dashed/dotted/none) — bare-minimum miss; widths exist, no style control
- [ ] outline-width / -color / -style / -offset
- [ ] divide-x / -y / -color `(scope?)`

## Effects

- [ ] box-shadow — elevation token module exists, no utility
- [ ] opacity — opacity token module exists, no utility
- [ ] mix-blend-mode / background-blend-mode `(scope?)`

## Transitions & Animation

- [ ] transition-property / -duration / -timing-function / -delay — transition token module exists, no utility
- [ ] animation `(scope?)`

## Transforms

- [ ] scale / rotate / translate / skew / transform-origin `(scope?)`

## Filters

- [ ] blur / brightness / contrast / grayscale / invert / saturate / sepia / drop-shadow `(scope?)`
- [ ] backdrop-filter family `(scope?)`

## Interactivity

- [x] cursor
- [x] pointer-events
- [x] user-select
- [x] touch-action
- [ ] resize
- [ ] scroll-behavior
- [ ] scroll-margin / scroll-padding
- [ ] scroll-snap (type/align/stop)
- [ ] accent-color
- [ ] caret-color
- [ ] appearance
- [ ] will-change `(scope?)`

## SVG

- [x] LEGACY fill (`fill-*`)
- [ ] stroke / stroke-width

## Tables

- [ ] border-collapse / border-spacing / table-layout / caption-side `(scope?)`

## Accessibility

- [x] sr-only (`visually-hidden`)
- [ ] forced-color-adjust

---

## Bare-minimum candidates

Honest gaps that fit zebkit's token-driven philosophy and would most likely clear an internal bare-minimum bar:

1. **Sizing** — width / height / min / max / size (biggest single hole). Spacing token group already carries `sizing`-type tokens, so a token source is ready.
2. **text-align** (typography)
3. **border-style** (have width + color, can't switch style)
4. **z-index, opacity, box-shadow, transition** utilities — all four have token modules already; low-effort, high-value.
5. **inset/position offsets** upgraded to logical edges + manifest (currently physical-only legacy).
6. **text-decoration + text-transform** (typography polish).
