---
title: Action colors
description: Semantic action palette for interactive controls and links.
---

Action colors emphasize interactive affordances and call-to-action moments without borrowing from the core brand ramp.

## Usage

- Set control backgrounds with `canvas-action` or `canvas-action-strong` for higher emphasis.
- Align icons and labels to `ink-action` and move to `ink-action-inverse` on dark canvases.
- Outlines and dividers can use `border-action` or `border-action-strong` for interactive hover/focus borders.

```html
<a class="ink-action hover:ink-action-strong border-action-muted" href="#">
  Inline action link
</a>
```

## Tokens

Action exposes canvas, ink, and border roles with soft/muted/strong intensities and full inverse coverage for dark contexts.

## Examples

Pair action colors with app canvases to separate secondary controls from primary brand buttons.

## TODO

- Add guidance for composing action tokens with stateful utilities on buttons.
