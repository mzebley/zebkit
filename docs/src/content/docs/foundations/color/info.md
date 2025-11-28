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

| Token | Value | Description |
| --- | --- | --- |
| `info.canvas` | `{color.dusk-50}` | Base info canvas color for primary surfaces. |
| `info.canvas-soft` | `` | Soft info canvas color for lightly tinted surfaces. |
| `info.canvas-muted` | `` | Muted info canvas color for low-emphasis surfaces. |
| `info.canvas-strong` | `` | Strong info canvas color for high-emphasis surfaces. |
| `info.canvas-inverse` | `` | Base inverse info canvas color for surfaces on dark or inverted contexts. |
| `info.canvas-inverse-soft` | `` | Soft inverse info canvas color for lightly tinted surfaces in inverse contexts. |
| `info.canvas-inverse-muted` | `` | Muted inverse info canvas color for low-emphasis surfaces in inverse contexts. |
| `info.canvas-inverse-strong` | `` | Strong inverse info canvas color for high-emphasis surfaces in inverse contexts. |
| `info.ink` | `` | Base info ink color for text and icons on neutral or light canvases. |
| `info.ink-soft` | `` | Soft info ink color for lower-emphasis text and icons. |
| `info.ink-muted` | `` | Muted info ink color for subtle or secondary text and icons. |
| `info.ink-strong` | `` | Strong info ink color for high-emphasis text and icons. |
| `info.ink-inverse` | `` | Base inverse info ink color for text and icons on inverse or dark canvases. |
| `info.ink-inverse-soft` | `` | Soft inverse info ink color for lower-emphasis text and icons on inverse canvases. |
| `info.ink-inverse-muted` | `` | Muted inverse info ink color for subtle text and icons on inverse canvases. |
| `info.ink-inverse-strong` | `` | Strong inverse info ink color for high-emphasis text and icons on inverse canvases. |
| `info.border` | `` | Base info border color for outlines, strokes, and dividers. |
| `info.border-soft` | `` | Soft info border color for low-emphasis outlines and dividers. |
| `info.border-muted` | `` | Muted info border color for subtle outlines and dividers. |
| `info.border-strong` | `` | Strong info border color for high-emphasis outlines and dividers. |
| `info.border-inverse` | `` | Base inverse info border color for outlines and dividers on inverse canvases. |
| `info.border-inverse-soft` | `` | Soft inverse info border color for low-emphasis outlines on inverse canvases. |
| `info.border-inverse-muted` | `` | Muted inverse info border color for subtle outlines on inverse canvases. |
| `info.border-inverse-strong` | `` | Strong inverse info border color for high-emphasis outlines on inverse canvases. |

## Examples

Info tokens pair well with app canvases for inline guidance without overpowering primary flows.

## TODO

- Add examples for inline badges and tooltips using info ink.
