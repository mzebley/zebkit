---
title: Caution colors
description: Warning palette for cautionary feedback and soft alerts.
---

Caution colors express warnings that need attention without implying failure. Use them for pre-error states, reminders, and
non-destructive confirmations.

## Usage

- Backgrounds: `canvas-caution-soft` for inline banners or `canvas-caution-strong` when the warning needs to stand out.
- Text: `ink-caution` keeps messaging readable; switch to `ink-caution-inverse` on stronger canvases.
- Borders: `border-caution` and `border-caution-strong` frame alerts or form warnings.

```html
<div class="canvas-caution-soft border-caution ink-caution">
  Double-check this setting before continuing.
</div>
```

## Tokens

| Token | Value | Description |
| --- | --- | --- |
| `caution.canvas` | `{color.dusk-50}` | Base caution canvas color for primary surfaces. |
| `caution.canvas-soft` | `` | Soft caution canvas color for lightly tinted surfaces. |
| `caution.canvas-muted` | `` | Muted caution canvas color for low-emphasis surfaces. |
| `caution.canvas-strong` | `` | Strong caution canvas color for high-emphasis surfaces. |
| `caution.canvas-inverse` | `` | Base inverse caution canvas color for surfaces on dark or inverted contexts. |
| `caution.canvas-inverse-soft` | `` | Soft inverse caution canvas color for lightly tinted surfaces in inverse contexts. |
| `caution.canvas-inverse-muted` | `` | Muted inverse caution canvas color for low-emphasis surfaces in inverse contexts. |
| `caution.canvas-inverse-strong` | `` | Strong inverse caution canvas color for high-emphasis surfaces in inverse contexts. |
| `caution.ink` | `` | Base caution ink color for text and icons on neutral or light canvases. |
| `caution.ink-soft` | `` | Soft caution ink color for lower-emphasis text and icons. |
| `caution.ink-muted` | `` | Muted caution ink color for subtle or secondary text and icons. |
| `caution.ink-strong` | `` | Strong caution ink color for high-emphasis text and icons. |
| `caution.ink-inverse` | `` | Base inverse caution ink color for text and icons on inverse or dark canvases. |
| `caution.ink-inverse-soft` | `` | Soft inverse caution ink color for lower-emphasis text and icons on inverse canvases. |
| `caution.ink-inverse-muted` | `` | Muted inverse caution ink color for subtle text and icons on inverse canvases. |
| `caution.ink-inverse-strong` | `` | Strong inverse caution ink color for high-emphasis text and icons on inverse canvases. |
| `caution.border` | `` | Base caution border color for outlines, strokes, and dividers. |
| `caution.border-soft` | `` | Soft caution border color for low-emphasis outlines and dividers. |
| `caution.border-muted` | `` | Muted caution border color for subtle outlines and dividers. |
| `caution.border-strong` | `` | Strong caution border color for high-emphasis outlines and dividers. |
| `caution.border-inverse` | `` | Base inverse caution border color for outlines and dividers on inverse canvases. |
| `caution.border-inverse-soft` | `` | Soft inverse caution border color for low-emphasis outlines on inverse canvases. |
| `caution.border-inverse-muted` | `` | Muted inverse caution border color for subtle outlines on inverse canvases. |
| `caution.border-inverse-strong` | `` | Strong inverse caution border color for high-emphasis outlines on inverse canvases. |

## Examples

Pair caution backgrounds with app ink when you need a quieter reminder, or switch to caution ink and border for clearer focus.

## TODO

- Add recommended iconography pairings for caution callouts.
