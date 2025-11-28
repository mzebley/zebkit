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

The critical family exposes canvas, ink, and border tokens with soft/muted/strong intensities plus inverse variants for dark UIs.

## Examples

Pair critical ink with app or brand canvases only when the destructive message needs to dominate the region.

## TODO

- Add form validation recipes that combine critical borders with app ink.
