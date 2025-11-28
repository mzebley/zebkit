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

| Token | Value | Description |
| --- | --- | --- |
| `brand.canvas` | `{color.butterfield-200}` | Base brand canvas color for primary branded surfaces. |
| `brand.canvas-soft` | `{color.butterfield-50}` | Soft brand canvas color for lightly tinted branded surfaces. |
| `brand.canvas-muted` | `{color.butterfield-100}` | Muted brand canvas color for low-emphasis branded surfaces. |
| `brand.canvas-strong` | `{color.butterfield-600}` | Strong brand canvas color for high-emphasis branded surfaces. |
| `brand.canvas-inverse` | `{color.butterfield-600}` | Base inverse brand canvas color for branded surfaces on dark or inverted contexts. |
| `brand.canvas-inverse-soft` | `{color.butterfield-500}` | Soft inverse brand canvas color for lightly tinted branded surfaces in inverse contexts. |
| `brand.canvas-inverse-muted` | `{color.butterfield-300}` | Muted inverse brand canvas color for low-emphasis branded surfaces in inverse contexts. |
| `brand.canvas-inverse-strong` | `{color.butterfield-50}` | Strong inverse brand canvas color for high-emphasis branded surfaces in inverse contexts. |
| `brand.ink` | `{color.butterfield-800}` | Base brand ink color for text and icons on neutral or light canvases. |
| `brand.ink-soft` | `{color.butterfield-400}` | Soft brand ink color for lower-emphasis text and icons. |
| `brand.ink-muted` | `{color.butterfield-600}` | Muted brand ink color for subtle or secondary text and icons. |
| `brand.ink-strong` | `{color.butterfield-950}` | Strong brand ink color for high-emphasis text and icons. |
| `brand.ink-inverse` | `{color.butterfield-100}` | Base inverse brand ink color for text and icons on inverse or dark canvases. |
| `brand.ink-inverse-soft` | `{color.butterfield-200}` | Soft inverse brand ink color for lower-emphasis text and icons on inverse canvases. |
| `brand.ink-inverse-muted` | `{color.butterfield-300}` | Muted inverse brand ink color for subtle text and icons on inverse canvases. |
| `brand.ink-inverse-strong` | `{color.butterfield-50}` | Strong inverse brand ink color for high-emphasis text and icons on inverse canvases. |
| `brand.border` | `` | Base brand border color for outlines, strokes, and dividers. |
| `brand.border-soft` | `` | Soft brand border color for low-emphasis outlines and dividers. |
| `brand.border-muted` | `` | Muted brand border color for subtle outlines and dividers. |
| `brand.border-strong` | `` | Strong brand border color for high-emphasis outlines and dividers. |
| `brand.border-inverse` | `` | Base inverse brand border color for outlines and dividers on inverse canvases. |
| `brand.border-inverse-soft` | `` | Soft inverse brand border color for low-emphasis outlines on inverse canvases. |
| `brand.border-inverse-muted` | `` | Muted inverse brand border color for subtle outlines on inverse canvases. |
| `brand.border-inverse-strong` | `` | Strong inverse brand border color for high-emphasis outlines on inverse canvases. |

## Examples

Pair brand ink with brand canvases to maintain contrast, and use the inverse variants on strong backgrounds.

## TODO

- Document example swatches for each intensity.
- Add guidance for pairing brand with secondary accents.
