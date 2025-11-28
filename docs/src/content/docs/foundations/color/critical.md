---
title: Critical colors
description: Destructive palette for errors and irreversible actions.
---

Critical colors communicate errors, destructive actions, and blocking states. Reserve them for irreversible or high-risk flows.

## Usage

- Surfaces: `canvas-critical-strong` backs destructive confirmations; use `canvas-critical-soft` for inline error messaging.
- Foreground: `ink-critical` and `ink-critical-strong` for error text or destructive button labels.
- Borders: `border-critical` highlights invalid fields or destructive button outlines.

```html
<button class="zbk-button canvas-critical-strong ink-critical-inverse">
  Delete item
</button>
```

## Tokens

| Token | Value | Description |
| --- | --- | --- |
| `critical.canvas` | `{color.dusk-50}` | Base critical canvas color for primary surfaces. |
| `critical.canvas-soft` | `` | Soft critical canvas color for lightly tinted surfaces. |
| `critical.canvas-muted` | `` | Muted critical canvas color for low-emphasis surfaces. |
| `critical.canvas-strong` | `` | Strong critical canvas color for high-emphasis surfaces. |
| `critical.canvas-inverse` | `` | Base inverse critical canvas color for surfaces on dark or inverted contexts. |
| `critical.canvas-inverse-soft` | `` | Soft inverse critical canvas color for lightly tinted surfaces in inverse contexts. |
| `critical.canvas-inverse-muted` | `` | Muted inverse critical canvas color for low-emphasis surfaces in inverse contexts. |
| `critical.canvas-inverse-strong` | `` | Strong inverse critical canvas color for high-emphasis surfaces in inverse contexts. |
| `critical.ink` | `` | Base critical ink color for text and icons on neutral or light canvases. |
| `critical.ink-soft` | `` | Soft critical ink color for lower-emphasis text and icons. |
| `critical.ink-muted` | `` | Muted critical ink color for subtle or secondary text and icons. |
| `critical.ink-strong` | `` | Strong critical ink color for high-emphasis text and icons. |
| `critical.ink-inverse` | `` | Base inverse critical ink color for text and icons on inverse or dark canvases. |
| `critical.ink-inverse-soft` | `` | Soft inverse critical ink color for lower-emphasis text and icons on inverse canvases. |
| `critical.ink-inverse-muted` | `` | Muted inverse critical ink color for subtle text and icons on inverse canvases. |
| `critical.ink-inverse-strong` | `` | Strong inverse critical ink color for high-emphasis text and icons on inverse canvases. |
| `critical.border` | `` | Base critical border color for outlines, strokes, and dividers. |
| `critical.border-soft` | `` | Soft critical border color for low-emphasis outlines and dividers. |
| `critical.border-muted` | `` | Muted critical border color for subtle outlines and dividers. |
| `critical.border-strong` | `` | Strong critical border color for high-emphasis outlines and dividers. |
| `critical.border-inverse` | `` | Base inverse critical border color for outlines and dividers on inverse canvases. |
| `critical.border-inverse-soft` | `` | Soft inverse critical border color for low-emphasis outlines on inverse canvases. |
| `critical.border-inverse-muted` | `` | Muted inverse critical border color for subtle outlines on inverse canvases. |
| `critical.border-inverse-strong` | `` | Strong inverse critical border color for high-emphasis outlines on inverse canvases. |

## Examples

Pair critical ink with app or brand canvases only when the destructive message needs to dominate the region.

## TODO

- Add form validation recipes that combine critical borders with app ink.
