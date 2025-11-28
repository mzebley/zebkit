---
title: Brand colors
description: Primary identity palette used for core actions and hero moments.
---

Brand colors are the anchor palette for Zebkit. Use them for primary actions, high-visibility surfaces, and UI that should read as
“on brand.”

## Usage

- Default surfaces: `canvas-brand` or `canvas-brand-soft` for subtle tints.
- Text and icons: `ink-brand` for base text, `ink-brand-strong` for emphasis, and `ink-brand-inverse` when sitting on strong brand
  canvases.
- Borders and outlines: `border-brand-muted` for dividers or `border-brand-strong` for interactive affordances.

```html
<button class="zbk-button canvas-brand focus:border-brand-inverse">
  Primary action
</button>
```

## Tokens

- `brand-canvas`, `brand-canvas-soft`, `brand-canvas-muted`, `brand-canvas-strong`
- `brand-canvas-inverse`, `brand-canvas-inverse-soft`, `brand-canvas-inverse-muted`, `brand-canvas-inverse-strong`
- `brand-ink`, `brand-ink-soft`, `brand-ink-muted`, `brand-ink-strong` plus matching inverse variants
- `brand-border`, `brand-border-soft`, `brand-border-muted`, `brand-border-strong` plus matching inverse variants

## Examples

Pair brand ink with brand canvases to maintain contrast, and use the inverse variants on strong backgrounds.

## TODO

- Document example swatches for each intensity.
- Add guidance for pairing brand with secondary accents.
