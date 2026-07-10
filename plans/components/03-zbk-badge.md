# `<zbk-badge>` — Phase 1 handoff prompt

Status: READY · Build order: 3 · Depends on: nothing
Read first: `plans/components/00-conventions.md`, `GRAMMAR.md`. Precedence: GRAMMAR.md > this file > conventions.

## 1. Pattern definition

A small non-interactive status descriptor ("New", "Beta", "3 unread"). Static text with token-driven visuals. It is **not** interactive (that's `<zbk-tag>` or `<zbk-button>`), and it is not a live region — content changes are silent (announce through the consumer's flow or `announce()` if it matters).

## 2. Mirror & references

Simplest component in the system; nearest structural relative is button minus interactivity. No native element carries this pattern, so the core is a `<span>`.

## 3. Authored markup

```html
<zbk-badge>New</zbk-badge>
<zbk-badge variant="critical">3 failing</zbk-badge>
<zbk-badge variant="positive"><svg slot="icon" viewBox="0 0 24 24">…</svg>Passing</zbk-badge>
```

## 4. Rendered skeleton

```html
<zbk-badge>
  <span class="zbk-badge">
    <span class="zbk-badge__icon" aria-hidden="true"><svg>…</svg></span>
    <span class="zbk-badge__content">New</span>
  </span>
</zbk-badge>
```

Icon span renders only when `slot="icon"` content exists.

## 5. Attributes & properties

`variant` only.

## 6. Content model

Default children: the badge text. `icon` slot per the shared vocabulary (aria-hidden). Because the icon is presentational, any information it carries must also be in the text.

## 7. Behavior

None. Not focusable, no pointer handling. `nativeElement` returns the inner span (ARIA an author writes still relocates there).

## 8. ARIA & announcements

No role. Reads as inline text in document order. Docs guidance (§14): when a badge annotates a control (e.g. unread count on a nav item), the count must also be in that control's accessible name.

## 9. Token surface

Key `badge`, layer `base`.

| Token | Default | Type |
|---|---|---|
| `display` | `inline-flex` | `display` |
| `canvas` | `{app.canvas-muted}` | `color` |
| `ink` | `{app.ink}` | `color` |
| `border-color` | `transparent` | `color` |
| `border-width` | `{border.width-sm}` | `borderWidth` |
| `border-style` | `{border.style}` | `borderStyle` |
| `border-radius` | `{border.radius-xl}` | `borderRadius` |
| `padding-inline` | `{spacing.xs}` | `spacing` |
| `padding-block` | `0` | `spacing` |
| `gap` | `{spacing.2xs}` | `spacing` |
| `icon-size` | `1em` | `sizing` |
| `font-family` | `{font-family.interface}` | `fontFamily` |
| `font-size` | `{font-size.xs}` | `fontSize` |
| `font-weight` | `{font-weight.medium}` | `fontWeight` |
| `line-height` | `{line-height.2}` | `lineHeight` |
| `letter-spacing` | `{tracking.normal}` | `letterSpacing` |
| `min-height` | `1.5em` | `sizing` |

No interaction-state suffixes — the pattern has no interaction states.

## 10. Variants

Axis `status`, one file each, all remapping only `canvas` / `ink` / `border-color`:

| Name | canvas | ink |
|---|---|---|
| `info` | `{info.canvas-subtle}` | `{info.ink}` |
| `positive` | `{positive.canvas-subtle}` | `{positive.ink}` |
| `caution` | `{caution.canvas-subtle}` | `{caution.ink}` |
| `critical` | `{critical.canvas-subtle}` | `{critical.ink}` |

Plus axis `style`: `outline` — `canvas: transparent`, `border-color: currentColor`. Composable with a status variant (`variant="critical outline"`).

## 11. Custom events

None.

## 12. Dev-mode warnings

Empty badge (no default children and no icon): "Empty badge. Provide text children; a badge with no content renders as an unexplained shape."

## 13. Tests

Skeleton + classes; content adoption; icon slot aria-hidden and conditional; each status variant class applies; `critical outline` applies both classes without an axis-conflict warning; empty-badge warning.

## 14. Docs

Per conventions. Live examples: default, all four statuses, `outline`, `critical outline`, icon badge. Include the "count must be in the accessible name" guidance from §8.

## 15. Out of scope (do not build)

- Dot/indicator-only mode, positioning-on-a-corner-of-another-element (that's consumer CSS)
- Dismissible badges (that's `<zbk-tag>`)
- Numeric truncation ("99+") — consumer logic

## 16. Acceptance checklist

Conventions "Definition of done", plus: no interaction-state tokens exist; variants touch only the three color tokens.

## 17. Revision notes

(Empty at handoff. Fold anything written here into its home section above, then delete it.)
