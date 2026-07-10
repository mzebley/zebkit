# `<zbk-breadcrumb>` — Phase 1 handoff prompt

Status: READY · Build order: 8 · Depends on: 02-zbk-link recommended (examples use it), not required
Read first: `plans/components/00-conventions.md`, `GRAMMAR.md`. Precedence: GRAMMAR.md > this file > conventions.

## 1. Pattern definition

A trail of ancestor-page links ending at the current page: `<nav>` landmark wrapping an ordered list. The component supplies the landmark, list structure, separators, and `aria-current` bookkeeping; the author supplies plain links as children.

## 2. Mirror & references

Child adoption with per-child wrapping mirrors `src/components/select/index.ts` (children are sorted into structure, not dumped into one bucket). Separators are CSS-generated content driven by a token — no separator markup for AT to read.

## 3. Authored markup

```html
<zbk-breadcrumb>
  <a href="/">Home</a>
  <a href="/docs">Docs</a>
  <a href="/docs/components" aria-current="page">Components</a>
</zbk-breadcrumb>
```

## 4. Rendered skeleton

```html
<zbk-breadcrumb>
  <nav class="zbk-breadcrumb" aria-label="Breadcrumb">
    <ol class="zbk-breadcrumb__list">
      <li class="zbk-breadcrumb__item"><a href="/">Home</a></li>
      <li class="zbk-breadcrumb__item"><a href="/docs">Docs</a></li>
      <li class="zbk-breadcrumb__item"><a href="/docs/components" aria-current="page">Components</a></li>
    </ol>
  </nav>
</zbk-breadcrumb>
```

Each authored element child becomes one `<li>`, in order. Separators are `::before` content on every `__item` except the first.

## 5. Attributes & properties

| Attribute | Type | Default | Notes |
|---|---|---|---|
| `variant` | string | — | Per GRAMMAR |

The landmark's default `aria-label="Breadcrumb"` is component-supplied; an author writing `aria-label` on `<zbk-breadcrumb>` overrides it via normal ARIA relocation to the `<nav>`.

## 6. Content model

Default children: the trail's items, one element per crumb — typically `<a>` or `<zbk-link>`; the current page may be a plain `<span>` or a link with `aria-current="page"`. Whitespace-only text nodes are dropped; element order is preserved.

## 7. Behavior

- On render, if **no** child carries `aria-current`, set `aria-current="page"` on the last element child (only when it is a link — a plain `<span>` last item needs no marking). Author-set `aria-current` is never touched (generated-ids rule: preserved, appended-to, never clobbered).
- Navigation itself is native.

## 8. ARIA & announcements

`<nav aria-label="Breadcrumb">` + `<ol>` gives AT the landmark, count, and position. Separators are CSS content and therefore not announced. `nativeElement` returns the `<nav>`.

## 9. Token surface

Key `breadcrumb`, layer `base`.

| Token | Default | Type |
|---|---|---|
| `display` | `block` | `display` |
| `gap` | `{spacing.xs}` | `spacing` (space around separators) |
| `separator-content` | `"/"` | `utility` (CSS `content` string; themes swap for `"›"` etc.) |
| `separator-ink` | `{app.ink-subtle}` | `color` |
| `ink` | `{action.ink}` | `color` (trail links; `<zbk-link>` children keep their own tokens) |
| `ink-current` | `{app.ink}` | `color` (`[aria-current]` item) |
| `font-family` / `font-size` / `line-height` | interface / `{font-size.sm}` / `{line-height.2}` | — |
| `wrap` | `wrap` | `utility` (flex-wrap of the list) |

List styling: `ol` is `display: flex; flex-wrap: var(wrap); gap: var(gap); list-style: none; margin: 0; padding: 0` (structural). `[aria-current]` inside an item gets `ink-current` and `text-decoration: none`.

## 10. Variants

None shipped.

## 11. Custom events

None.

## 12. Dev-mode warnings

- Fewer than two element children: "A breadcrumb with fewer than two items is not a trail. Provide the ancestor pages as links, ending at the current page."
- A non-element/non-link structure is tolerated silently (spans allowed for current page).

## 13. Tests

Skeleton (nav label, ol, li per child, order); default `aria-current` applied to last link only when absent; author `aria-current` respected (and not duplicated); span-as-last-item handled; `aria-label` override relocates; fewer-than-two warning; separator is CSS-only (no separator elements in DOM).

## 14. Docs

Per conventions. Live examples: three-level trail with `<a>`, same with `<zbk-link>` children, custom separator via token override. Guidance: last item = current page; don't make the current page a self-link unless it truly navigates.

## 15. Out of scope (do not build)

- Overflow collapsing ("… " menu for deep trails) — needs menu; revisit after 13
- Structured-data (schema.org) markup
- Router awareness

## 16. Acceptance checklist

Conventions "Definition of done", plus: separators invisible to AT; `aria-current` logic covered by tests in all three authoring shapes.

## 17. Revision notes

(Empty at handoff. Fold anything written here into its home section above, then delete it.)
