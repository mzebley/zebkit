---
title: App colors
description: Neutral application surfaces and ink pairings.
---

App colors support everyday UI surfaces: layouts, panels, navigation, and default text. They give you neutral contrast without
drifting into accent territory.

## Usage

- Lay down `canvas-app` or `canvas-app-soft` for primary surfaces.
- Use `ink-app` and `ink-app-strong` for body text, navigation labels, and dense forms.
- Borders like `border-app-muted` help separate sections without pulling focus.

```html
<section class="canvas-app ink-app">
  <h2 class="ink-app-strong">Dashboard</h2>
  <p>Use app ink for the everyday reading experience.</p>
</section>
```

## Tokens

| Token | Value | Description |
| --- | --- | --- |
| `app.canvas` | `{color.dusk-50}` | Base app canvas color for primary surfaces. |
| `app.canvas-soft` | `` | Soft app canvas color for lightly tinted surfaces. |
| `app.canvas-muted` | `` | Muted app canvas color for low-emphasis surfaces. |
| `app.canvas-strong` | `` | Strong app canvas color for high-emphasis surfaces. |
| `app.canvas-inverse` | `` | Base inverse app canvas color for surfaces on dark or inverted contexts. |
| `app.canvas-inverse-soft` | `` | Soft inverse app canvas color for lightly tinted surfaces in inverse contexts. |
| `app.canvas-inverse-muted` | `` | Muted inverse app canvas color for low-emphasis surfaces in inverse contexts. |
| `app.canvas-inverse-strong` | `` | Strong inverse app canvas color for high-emphasis surfaces in inverse contexts. |
| `app.ink` | `` | Base app ink color for text and icons on neutral or light canvases. |
| `app.ink-soft` | `` | Soft app ink color for lower-emphasis text and icons. |
| `app.ink-muted` | `` | Muted app ink color for subtle or secondary text and icons. |
| `app.ink-strong` | `` | Strong app ink color for high-emphasis text and icons. |
| `app.ink-inverse` | `` | Base inverse app ink color for text and icons on inverse or dark canvases. |
| `app.ink-inverse-soft` | `` | Soft inverse app ink color for lower-emphasis text and icons on inverse canvases. |
| `app.ink-inverse-muted` | `` | Muted inverse app ink color for subtle text and icons on inverse canvases. |
| `app.ink-inverse-strong` | `` | Strong inverse app ink color for high-emphasis text and icons on inverse canvases. |
| `app.border` | `` | Base app border color for outlines, strokes, and dividers. |
| `app.border-soft` | `` | Soft app border color for low-emphasis outlines and dividers. |
| `app.border-muted` | `` | Muted app border color for subtle outlines and dividers. |
| `app.border-strong` | `` | Strong app border color for high-emphasis outlines and dividers. |
| `app.border-inverse` | `` | Base inverse app border color for outlines and dividers on inverse canvases. |
| `app.border-inverse-soft` | `` | Soft inverse app border color for low-emphasis outlines on inverse canvases. |
| `app.border-inverse-muted` | `` | Muted inverse app border color for subtle outlines on inverse canvases. |
| `app.border-inverse-strong` | `` | Strong inverse app border color for high-emphasis outlines on inverse canvases. |

## Examples

App tokens pair naturally with accent families for callouts and with brand tokens for primary actions.

## TODO

- Add contrast guidance for app text on inverse canvases.
