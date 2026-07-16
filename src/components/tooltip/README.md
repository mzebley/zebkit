# `<zbk-tooltip>`

One component, two trigger modes, one token surface. A light-DOM custom element that wraps its trigger and renders a positioned bubble — the invisible 90% (ARIA wiring, WCAG 1.4.13 behavior, focus/touch handling, positioning) done once.

Contract details live in [GRAMMAR.md](../../../GRAMMAR.md).

## Usage

```html
<!-- hint (default): hover/focus description for a labelled control -->
<zbk-tooltip content="Copies the link to your clipboard">
  <zbk-button aria-label="Copy link"><svg slot="icon">…</svg></zbk-button>
</zbk-tooltip>

<!-- toggle: click-triggered info — the right pattern for touch + icon buttons -->
<zbk-tooltip mode="toggle" content="Estimates include weekends and holidays.">
  <zbk-button aria-label="About this estimate">?</zbk-button>
</zbk-tooltip>
```

The trigger is the element's child content. Tooltip text is the `content` attribute — plain text only, because `aria-describedby` flattens to a string anyway. Rich or interactive overlay content is a different pattern (popover/dialog), not a tooltip.

## Modes

| | `hint` (default) | `toggle` |
|---|---|---|
| Trigger | hover + keyboard focus (+ touch focus) | click |
| Bubble semantics | `role="tooltip"`, linked via `aria-describedby` | `aria-hidden` (visual only) |
| Screen reader channel | description read with the control | shared live region announces on open |
| Trigger state | — | `aria-expanded` |
| Dismissal | Escape; pointer/focus leaving (with hover grace) | Escape (returns focus), outside press, second click |

WCAG 1.4.13 in hint mode: shows on hover **and** focus, Escape-dismissible, and hoverable — the `hide-grace` token gives the pointer time to cross onto the bubble.

## Attributes

| Attribute | Type | Default | Notes |
|---|---|---|---|
| `content` | string | — | The tooltip text. Empty content warns in dev. |
| `mode` | `hint \| toggle` | `hint` | Trigger semantics (table above). |
| `placement` | `top \| right \| bottom \| left` (+ `-start`/`-end`) | `top` | Preferred side; flips/shifts automatically when it can't fit. |

## Positioning

`@floating-ui/dom` (flip, shift, arrow, autoUpdate) — works on every browser your users actually have. Where the popover API exists the bubble is promoted to the top layer; elsewhere the `z-index` token applies. CSS anchor positioning is a future swap, not a requirement.

## Styling

Everything is `--zbk-tooltip-*` tokens: surface (canvas/ink/border), typography, spacing, `max-width`, `arrow-size`, `offset`, elevation, stacking, and motion. Show/hide timing is tokens too — `show-delay` and `hide-grace` are read by the element at runtime and carry the `a11y` flag, so runtime accessibility machinery can reach them. See `tokens/tokens.ts` for the full annotated surface.
