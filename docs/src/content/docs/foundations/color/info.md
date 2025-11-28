---
title: Info colors
description: Informational palette for neutral alerts and tips.
---

Info colors convey neutral notices, hints, and contextual tips. They should draw attention without implying success or failure.

## Usage

- Backgrounds: `canvas-info-soft` for inline banners or `canvas-info` for feature callouts.
- Foreground: `ink-info` for body text and `ink-info-strong` for headings.
- Borders: `border-info` frames info panels or separates grouped details.

```html
<div class="canvas-info-soft border-info ink-info">
  Need help? Check the docs linked above.
</div>
```

## Tokens

Canvas, ink, and border roles include soft/muted/strong and inverse options to keep info blocks legible on any surface.

## Examples

Info tokens pair well with app canvases for inline guidance without overpowering primary flows.

## TODO

- Add examples for inline badges and tooltips using info ink.
