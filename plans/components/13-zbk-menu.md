# `<zbk-menu>` + `<zbk-menu-item>` — Phase 1 handoff prompt

Status: READY · Build order: 13 (last of Phase 1) · Depends on: 11-zbk-popover (hard — shared positioning util and the trigger-slot grammar must be merged)
Read first: `plans/components/00-conventions.md`, `GRAMMAR.md`, `plans/components/11-zbk-popover.md`, `src/components/base/positioning.ts` (created in 11's Step 0). Precedence: GRAMMAR.md > this file > conventions.

## 1. Pattern definition

An **action menu** (APG menu-button pattern): a trigger button opens a `role="menu"` list of `role="menuitem"` commands with roving focus. Items *do things*; they never navigate (navigation lists are plain markup with `<zbk-link>`) and never hold form state (that's select). One menu level — no submenus. Two components ship together in `src/components/menu/` (menu-item lives at `src/components/menu/menu-item/` with its own tokens/schema, registered in the same PR).

## 2. Mirror & references

Overlay mechanics (open/close, positioning via `positionAnchored`/`trackAnchored`, popover-API promotion, outside-press/Escape listeners, `aria-expanded` on trigger) are popover's — reuse its implementation shapes exactly. Menu adds: menu semantics, roving tabindex, typeahead, close-on-activate.

## 3. Authored markup

```html
<zbk-menu>
  <zbk-button slot="trigger">Actions</zbk-button>
  <zbk-menu-item>Rename…</zbk-menu-item>
  <zbk-menu-item>Duplicate</zbk-menu-item>
  <hr />
  <zbk-menu-item variant="critical" disabled>Delete</zbk-menu-item>
</zbk-menu>
```

## 4. Rendered skeleton

```html
<zbk-menu>
  <zbk-button slot="trigger" aria-expanded="false" aria-haspopup="menu" aria-controls="zbk-menu-1-panel">Actions</zbk-button>
  <div class="zbk-menu" id="zbk-menu-1-panel" role="menu" popover="manual" data-zbk-menu-panel>
    <zbk-menu-item>…</zbk-menu-item>
    <zbk-menu-item>…</zbk-menu-item>
    <hr class="zbk-menu__separator" role="separator" />
    <zbk-menu-item>…</zbk-menu-item>
  </div>
</zbk-menu>

<!-- each item -->
<zbk-menu-item>
  <button type="button" class="zbk-menu-item" role="menuitem" tabindex="-1">
    <span class="zbk-menu-item__icon" aria-hidden="true"><svg>…</svg></span>
    <span class="zbk-menu-item__content">Rename…</span>
  </button>
</zbk-menu-item>
```

Menu-item's core is a native `<button role="menuitem">` — native activation (Enter/Space/click) for free, menu semantics for AT. Authored `<hr>` children adopt into the panel with the separator class.

## 5. Attributes & properties

`<zbk-menu>`:

| Attribute | Type | Default | Notes |
|---|---|---|---|
| `variant` | string | — | Per GRAMMAR |
| `open` | boolean | false | Reflected; same contract as popover |
| `placement` | string | `bottom-start` | floating-ui vocabulary |

Methods: `show()`, `hide()`, `toggle()` (popover's spellings).

`<zbk-menu-item>`:

| Attribute | Type | Default | Notes |
|---|---|---|---|
| `variant` | string | — | Per GRAMMAR |
| `disabled` | boolean | false | Forwarded to the native button; focusable via roving arrow keys per APG (`aria-disabled` + keep in traversal) — implement as `aria-disabled="true"` on the button and block activation, rather than native `disabled`, so keyboard users can discover it |

## 6. Content model

Menu: `trigger` slot (per the vocabulary amended in 11); default children restricted to `zbk-menu-item` and `hr` (anything else warns, §12, and is not adopted into the panel). Menu-item: default children = the command's label; `icon` slot per shared vocabulary.

## 7. Behavior

Keyboard, per APG menu-button (implement on the menu; items stay dumb):

- Trigger: `Enter`/`Space`/`ArrowDown` open and focus **first** item; `ArrowUp` opens and focuses **last** item. Click toggles (no auto-focus change on close).
- In the menu: `ArrowDown`/`ArrowUp` move focus (wrapping); `Home`/`End` first/last; `Escape` closes and returns focus to trigger; `Tab` closes and lets focus move on naturally (do not preventDefault).
- Typeahead: printable characters accumulate for 500ms and focus the next item whose text starts with the buffer (case-insensitive).
- Roving tabindex: every item button is `tabindex="-1"`; focus moves imperatively. The panel itself is never a tab stop.
- Activation: a menu-item click (any modality) closes the menu and returns focus to the trigger — listen for `click` from item buttons at the panel level, skip `aria-disabled` items. The item's own native click bubbling to the consumer IS the action signal (no custom event).
- Open/close mechanics, outside press, and positioning: identical to popover (§7 of 11).

## 8. ARIA & announcements

Trigger: `aria-haspopup="menu"`, `aria-expanded`, `aria-controls`. Panel: `role="menu"`. Item buttons: `role="menuitem"`, `aria-disabled` when disabled. Separators: `role="separator"` on the `<hr>` (native default, set explicitly). Menu's `nativeElement` = trigger; menu-item's = its button. No announcer usage.

## 9. Token surface

Key `menu` (panel) and key `menu-item` (items) — two token modules, two schemas.

`menu` (panel = popover's shell values):

| Token | Default | Type |
|---|---|---|
| `display` | `contents` | `display` |
| `canvas` | `{app.canvas}` | `color` |
| `border-color` / `border-width` / `border-style` / `border-radius` | `{app.border}` / `{border.width-sm}` / `{border.style}` / `{border.radius-md}` | — |
| `padding-inline` / `padding-block` | `{spacing.2xs}` / `{spacing.2xs}` | `spacing` |
| `min-width` | `12rem` | `sizing` |
| `max-height` | `40vh` | `sizing` (then scrolls) |
| `offset` | `{spacing.2xs}` | `sizing` |
| `box-shadow` | `{elevation.md}` | `boxShadow` |
| `z-index` | `{z-index.dropdown}` | `zIndex` (fallback path) |
| `separator-color` / `separator-width` | `{app.border}` / `{border.width-sm}` | — |
| `separator-margin-block` | `{spacing.2xs}` | `spacing` |
| `transition-duration` (`a11y: true`) / `transition-timing-function` | calm defaults | `transition` |

`menu-item`:

| Token | Default | Type |
|---|---|---|
| `display` | `block` | `display` |
| `canvas` | `transparent` | `color` |
| `canvas-hover` | `{app.canvas-subtle}` | `color` |
| `canvas-active` | `{app.canvas-muted}` | `color` |
| `canvas-focus` | `{app.canvas-subtle}` | `color` |
| `canvas-disabled` | `transparent` | `color` |
| `ink` | `{app.ink}` | `color` |
| `ink-hover` | `{app.ink-emphasis}` | `color` |
| `ink-disabled` | `{disabled.ink}` | `color` |
| `icon-size` | `1em` | `sizing` |
| `icon-ink` | `{app.ink-muted}` | `color` |
| `gap` | `{spacing.sm}` | `spacing` |
| `padding-inline` / `padding-block` | `{spacing.sm}` / `{spacing.xs}` | `spacing` |
| `border-radius` | `{border.radius-sm}` | `borderRadius` |
| `min-height` | `44px` | `sizing` (tap-target floor) |
| `font-family` / `font-size` / `font-weight` / `line-height` | interface / `{font-size.sm}` / `{font-weight.normal}` / `{line-height.2}` | — |
| `focus-color` / `focus-width` / `focus-offset` | focus aliases | — |
| `cursor` / `cursor-disabled` | `pointer` / `not-allowed` | `utility` |
| `transition-duration` (`a11y: true`) / `transition-timing-function` / `transition-property` (`background-color, color`) / `transition-delay` (`0`) | calm defaults | `transition` |

Focus visuals: menu items use `canvas-focus` on `:focus` (not `:focus-visible` — all focus in a menu is programmatic/keyboard) **plus** the outline trio on `:focus-visible` for the WHCM case.

## 10. Variants

Menu: none. Menu-item: `critical` (axis `status`): `ink: {critical.ink}`, `ink-hover: {critical.ink-emphasis}`, `canvas-hover: {critical.canvas-subtle}`, `icon-ink: {critical.ink}`.

## 11. Custom events

None. Item activation = the native click bubbling from the item's button through `<zbk-menu-item>` to the consumer.

## 12. Dev-mode warnings

- Trigger checks: popover's, verbatim.
- Non-menu-item/non-hr default child: "Menu children must be <zbk-menu-item> or <hr>; got <x>. For navigation lists use plain links, not a menu."
- Empty item label: standard accessible-name warning.

## 13. Tests

Skeleton for both components (roles, tabindex, adoption incl. `<hr>`); every keyboard behavior in §7 as its own test (open-and-focus-first/last, wrap, Home/End, Escape+focus return, Tab closes, typeahead, disabled item focusable-but-inert); activation closes + returns focus + consumer receives the item's click; outside press; `aria-expanded`/`aria-controls`/`aria-haspopup` wiring; `critical` variant; all §12 warnings.

## 14. Docs

One docs page (`/components/menu`) covering both elements. Live examples: actions menu (the §3 markup, working), disabled + critical items, placement. Guidance: menu = actions; select = form value; nav = links — the three-way table, cross-linked from select's page.

## 15. Out of scope (do not build)

- Submenus, checkable items (`menuitemcheckbox`/`menuitemradio`), context-menu (right-click) triggering, `href` on items — each is future scope with its own design pass

## 16. Acceptance checklist

Conventions "Definition of done" (×2 — both elements have full artifact sets: tokens, schemas, CEM entries, context output), plus: zero duplicated positioning code (imports from `base/positioning.ts`); every §7 keyboard behavior has a named test; menu-item registered and exported from `src/components/index.ts` alongside menu.

## 17. Revision notes

(Empty at handoff. Fold anything written here into its home section above, then delete it.)
