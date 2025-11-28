---
title: Positive colors
description: Success palette for confirmations and “done” states.
---

Positive colors highlight success and completion. Use them to reinforce confirmations, status chips, and celebratory states.

## Usage

- Surfaces: `canvas-positive-soft` for inline confirmations and `canvas-positive-strong` for celebratory cards.
- Text: `ink-positive` for success messaging and `ink-positive-inverse` when paired with strong canvases.
- Borders: `border-positive` outlines success toasts or form confirmations.

```html
<span class="canvas-positive-soft border-positive ink-positive">
  Saved
</span>
```

## Tokens

| Token | Value | Description |
| --- | --- | --- |
| `positive.canvas` | `{color.dusk-50}` | Base positive canvas color for primary surfaces. |
| `positive.canvas-soft` | `` | Soft positive canvas color for lightly tinted surfaces. |
| `positive.canvas-muted` | `` | Muted positive canvas color for low-emphasis surfaces. |
| `positive.canvas-strong` | `` | Strong positive canvas color for high-emphasis surfaces. |
| `positive.canvas-inverse` | `` | Base inverse positive canvas color for surfaces on dark or inverted contexts. |
| `positive.canvas-inverse-soft` | `` | Soft inverse positive canvas color for lightly tinted surfaces in inverse contexts. |
| `positive.canvas-inverse-muted` | `` | Muted inverse positive canvas color for low-emphasis surfaces in inverse contexts. |
| `positive.canvas-inverse-strong` | `` | Strong inverse positive canvas color for high-emphasis surfaces in inverse contexts. |
| `positive.ink` | `` | Base positive ink color for text and icons on neutral or light canvases. |
| `positive.ink-soft` | `` | Soft positive ink color for lower-emphasis text and icons. |
| `positive.ink-muted` | `` | Muted positive ink color for subtle or secondary text and icons. |
| `positive.ink-strong` | `` | Strong positive ink color for high-emphasis text and icons. |
| `positive.ink-inverse` | `` | Base inverse positive ink color for text and icons on inverse or dark canvases. |
| `positive.ink-inverse-soft` | `` | Soft inverse positive ink color for lower-emphasis text and icons on inverse canvases. |
| `positive.ink-inverse-muted` | `` | Muted inverse positive ink color for subtle text and icons on inverse canvases. |
| `positive.ink-inverse-strong` | `` | Strong inverse positive ink color for high-emphasis text and icons on inverse canvases. |
| `positive.border` | `` | Base positive border color for outlines, strokes, and dividers. |
| `positive.border-soft` | `` | Soft positive border color for low-emphasis outlines and dividers. |
| `positive.border-muted` | `` | Muted positive border color for subtle outlines and dividers. |
| `positive.border-strong` | `` | Strong positive border color for high-emphasis outlines and dividers. |
| `positive.border-inverse` | `` | Base inverse positive border color for outlines and dividers on inverse canvases. |
| `positive.border-inverse-soft` | `` | Soft inverse positive border color for low-emphasis outlines on inverse canvases. |
| `positive.border-inverse-muted` | `` | Muted inverse positive border color for subtle outlines on inverse canvases. |
| `positive.border-inverse-strong` | `` | Strong inverse positive border color for high-emphasis outlines on inverse canvases. |

## Examples

Pair positive ink with app canvases for inline confirmations or with brand canvases for celebratory banners.

## TODO

- Document success toast patterns that mix positive ink with brand buttons.
