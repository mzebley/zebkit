# `<zbk-pagination>`

A light-DOM custom element rendering the APG pagination pattern: a `<nav aria-label="Pagination">` wrapping a list of page items with previous/next controls, the current page marked `aria-current="page"`, and a windowed page display with non-interactive ellipses.

One spelling per navigation intent: with `href-template` every item is a real link and the browser navigates (crawlers, middle-click, open-in-new-tab all work); without it items are buttons and a page choice surfaces as the cancelable `zbk-page-change` event.

Contract details (naming, states, ARIA relocation, content model) live in [GRAMMAR.md](../../../foundations/GRAMMAR.md).

## Usage

```html
<zbk-pagination current="3" total="12"></zbk-pagination>
```

Renders (light DOM, inspectable):

```html
<zbk-pagination current="3" total="12">
  <nav class="zbk-pagination" aria-label="Pagination">
    <ul class="zbk-pagination__list">
      <li><button type="button" class="zbk-pagination__item zbk-pagination__item--previous" aria-label="Previous page">…</button></li>
      <li><button type="button" class="zbk-pagination__item zbk-pagination__item--page" aria-label="Page 1">1</button></li>
      <li><button type="button" class="zbk-pagination__item zbk-pagination__item--page" aria-label="Page 2">2</button></li>
      <li><button type="button" class="zbk-pagination__item zbk-pagination__item--page" aria-label="Page 3" aria-current="page">3</button></li>
      <li><button type="button" class="zbk-pagination__item zbk-pagination__item--page" aria-label="Page 4">4</button></li>
      <li><button type="button" class="zbk-pagination__item zbk-pagination__item--page" aria-label="Page 5">5</button></li>
      <li><span class="zbk-pagination__ellipsis" aria-hidden="true">…</span></li>
      <li><button type="button" class="zbk-pagination__item zbk-pagination__item--page" aria-label="Page 12">12</button></li>
      <li><button type="button" class="zbk-pagination__item zbk-pagination__item--next" aria-label="Next page">…</button></li>
    </ul>
  </nav>
</zbk-pagination>
```

Register once at bootstrap:

```ts
import { defineZbkPagination } from "zebkit/components/pagination";
defineZbkPagination(); // no-ops if already registered
```

## Attributes

| Attribute | Type | Default | Notes |
|---|---|---|---|
| `current` | number | `1` | The current page, 1-based. Out-of-range values warn and clamp. |
| `total` | number | `1` | Total number of pages. |
| `siblings` | number | `1` | Page neighbors shown on each side of the current page. |
| `boundaries` | number | `1` | Pages pinned at each end of the window. |
| `compact` | boolean | `false` | Previous/next around a "Page X of Y" readout instead of the page window. |
| `href-template` | string | — | URL template with a `{page}` placeholder (e.g. `?page={page}`). When set, items render as real links. |
| `variant` | string | — | Space-separated registered variant names, e.g. `"sm"`. |
| `aria-*`, `role` | — | — | Write them on `<zbk-pagination>`; they relocate to the inner `<nav>` (whose name defaults to "Pagination"). |

## Events

| Event | Fires when | Detail |
|---|---|---|
| `zbk-page-change` | A page is chosen in button mode (no `href-template`). Cancelable: `preventDefault()` keeps `current` unchanged for consumers that own the state; uncanceled, the element adopts the page and announces "Page X of Y" through the shared live region. | `{ page: number }` |

In link mode there is no event — navigation is the browser's.

## The window

Constant width of `boundaries * 2 + siblings * 2 + 3` items, so the control never reflows while paging; an ellipsis never hides a single page (the page renders instead). At the defaults (`siblings=1`, `boundaries=1`, `total=12`):

| `current` | Window |
|---|---|
| 1–4 | 1 2 3 4 5 … 12 |
| 5 | 1 … 4 5 6 … 12 |
| 8 | 1 … 7 8 9 … 12 |
| 9–12 | 1 … 8 9 10 11 12 |

The algorithm (and its full worked table) lives in [`window.ts`](./window.ts).

## Slots

`slot="icon"` replaces a drawn chevron: `data-position="start"` for the previous control's glyph, `data-position="end"` for the next control's. Glyphs render aria-hidden; the controls keep their "Previous page" / "Next page" accessible names.

```html
<zbk-pagination current="2" total="5">
  <span slot="icon" data-position="start">&#8592;</span>
  <span slot="icon" data-position="end">&#8594;</span>
</zbk-pagination>
```

## Shipped variants

| Variant | Axis | Remaps |
|---|---|---|
| `sm` | size | Smaller type (glyphs follow via `icon-size`); keeps the 44px tap target. |
| `lg` | size | Larger type and roomier item padding. |

## Accessibility

- Disabled previous/next controls use `aria-disabled` (not native `disabled`) in button mode, so keyboard users reaching the first/last page don't lose their place; in link mode they drop their `href` (a placeholder link).
- Page adoption in button mode announces through the shared live-region announcer — no private live regions.
- Every item keeps the `{a11y.min-interaction-size}` minimum tap target at every variant size.

## Styling

One item surface (`ink`/`canvas`/`border-color` with `-hover`, `-active`, `-disabled`, and `-selected` states) covers page, previous, and next controls; the current page is the `-selected` semantic state, bound to `aria-current="page"`. `ellipsis-ink` and `status-ink` color the two non-interactive sub-elements. See `tokens/tokens.ts` for the full annotated surface.
