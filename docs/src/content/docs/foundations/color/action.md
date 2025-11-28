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

| Token | Value | Description |
| --- | --- | --- |
| `action.canvas` | `{color.dusk-50}` | Base action canvas color for primary surfaces. |
| `action.canvas-soft` | `` | Soft action canvas color for lightly tinted surfaces. |
| `action.canvas-muted` | `` | Muted action canvas color for low-emphasis surfaces. |
| `action.canvas-strong` | `` | Strong action canvas color for high-emphasis surfaces. |
| `action.canvas-inverse` | `` | Base inverse action canvas color for surfaces on dark or inverted contexts. |
| `action.canvas-inverse-soft` | `` | Soft inverse action canvas color for lightly tinted surfaces in inverse contexts. |
| `action.canvas-inverse-muted` | `` | Muted inverse action canvas color for low-emphasis surfaces in inverse contexts. |
| `action.canvas-inverse-strong` | `` | Strong inverse action canvas color for high-emphasis surfaces in inverse contexts. |
| `action.ink` | `` | Base action ink color for text and icons on neutral or light canvases. |
| `action.ink-soft` | `` | Soft action ink color for lower-emphasis text and icons. |
| `action.ink-muted` | `` | Muted action ink color for subtle or secondary text and icons. |
| `action.ink-strong` | `` | Strong action ink color for high-emphasis text and icons. |
| `action.ink-inverse` | `` | Base inverse action ink color for text and icons on inverse or dark canvases. |
| `action.ink-inverse-soft` | `` | Soft inverse action ink color for lower-emphasis text and icons on inverse canvases. |
| `action.ink-inverse-muted` | `` | Muted inverse action ink color for subtle text and icons on inverse canvases. |
| `action.ink-inverse-strong` | `` | Strong inverse action ink color for high-emphasis text and icons on inverse canvases. |
| `action.border` | `` | Base action border color for outlines, strokes, and dividers. |
| `action.border-soft` | `` | Soft action border color for low-emphasis outlines and dividers. |
| `action.border-muted` | `` | Muted action border color for subtle outlines and dividers. |
| `action.border-strong` | `` | Strong action border color for high-emphasis outlines and dividers. |
| `action.border-inverse` | `` | Base inverse action border color for outlines and dividers on inverse canvases. |
| `action.border-inverse-soft` | `` | Soft inverse action border color for low-emphasis outlines on inverse canvases. |
| `action.border-inverse-muted` | `` | Muted inverse action border color for subtle outlines on inverse canvases. |
| `action.border-inverse-strong` | `` | Strong inverse action border color for high-emphasis outlines on inverse canvases. |

## Examples

Pair action colors with app canvases to separate secondary controls from primary brand buttons.

## TODO

- Add guidance for composing action tokens with stateful utilities on buttons.
