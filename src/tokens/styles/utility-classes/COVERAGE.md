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

All legacy partials have been migrated. `LEGACY_PARTIALS` is now empty.

- [x] **color** mixin (`_color.scss`) -> migrated to `color.utilities.manifest.json` (`statePattern` kind); generates `color-palette.scss`, `color-semi-semantic.scss`, `color-semantic.scss`
- [x] **font** mixin -> migrated (typography manifest)
- [x] **border** mixin -> migrated (border manifest)
- [x] **position** mixin -> migrated (spacing manifest, top/right/bottom/left)
- [x] **spacing/size** mixin -> migrated (spacing + page/section manifests)

---

## Layout

- [x] display
- [x] position
- [x] visibility
- [x] object-fit
- [x] object-position
- [x] overflow (+ -x / -y)
- [x] top / right / bottom / left offsets (spacing manifest; physical edges + negatives, no `inset` shorthand yet)
- [x] z-index (+ semantic layers)
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

## Sizing

- [x] width / min-width / max-width (spacing manifest — scale + keywords + semantic sizes)
- [x] height / min-height / max-height
- [x] max-width for text (`measure-*`, typography manifest)
- [ ] size (w+h shorthand)

## Typography

- [x] white-space, word-break, overflow-wrap, hyphens, text-wrap, text-overflow, truncate
- [x] font-family
- [x] font-size (`font-*` / `text-*`)
- [x] font-weight
- [x] line-height
- [x] letter-spacing (`tracking-*`)
- [x] line-clamp
- [x] text-measure (`measure-*`)
- [x] text-align
- [x] text-transform (uppercase/lowercase/capitalize)
- [x] text-decoration-line (underline / overline / line-through / no-underline)
- [ ] font-style (italic)
- [ ] text-decoration-color / -style / -thickness / underline-offset
- [ ] vertical-align
- [ ] text-indent
- [ ] font-smoothing (antialiased)
- [ ] font-variant-numeric
- [ ] list-style-type / -position / -image
- [ ] content `(scope?)`

## Colors / Backgrounds

- [x] text color (`ink-*`) — with hover/focus/active/disabled states
- [x] background-color (`canvas-*`)
- [ ] background-image / gradients `(scope?)`
- [ ] background-position / -size / -repeat / -attachment / -clip / -origin `(scope?)`

## Borders

- [x] border-width (+ x/y/per-side)
- [x] border-radius (+ per-corner + pill)
- [x] border-color (`border-*`)
- [x] border-style (solid/dashed/dotted)
- [ ] outline-width / -color / -style / -offset (focus ring covered via `.focusable`)
- [ ] divide-x / -y / -color `(scope?)`

## Effects

- [x] box-shadow (`shadow-*`, incl. inner)
- [x] opacity (`opacity-*`)
- [ ] mix-blend-mode / background-blend-mode `(scope?)`

## Transitions & Animation

- [x] transition timing-function / duration (`transition-*`, incl. speed + motion personality)
- [ ] transition-property scale beyond the common set / -delay
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

- [x] fill (`fill-*`)
- [ ] stroke / stroke-width

## Tables

- [ ] border-collapse / border-spacing / table-layout / caption-side `(scope?)`

## Accessibility

- [x] sr-only (`visually-hidden`)
- [ ] forced-color-adjust

---

## Bare-minimum candidates

Most of the previous bare-minimum backlog has landed (sizing, text-align, border-style, z-index/opacity/box-shadow/transition, position offsets, text-decoration/transform). Remaining honest gaps that fit zebkit's token-driven philosophy:

1. **Color migration** — move the `_color.scss` mixin (`ink-*`/`canvas-*`/`border-*`/`fill-*`, with hover/focus/active/disabled states) onto a manifest. Needs a state-prefixed color-family grammar extension (see the legacy backlog note); it is the last legacy surface.
2. **size (w+h shorthand)** and **inset shorthand / logical position offsets**.
3. **font-style (italic)** and remaining text-decoration controls.
4. **box-sizing, aspect-ratio, resize** and other single-property layout/interactivity utilities.
