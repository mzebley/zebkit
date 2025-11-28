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

Caution mirrors the standard canvas/ink/border roles with intensity and inverse variants for both subtle and forceful warnings.

## Examples

Pair caution backgrounds with app ink when you need a quieter reminder, or switch to caution ink and border for clearer focus.

## TODO

- Add recommended iconography pairings for caution callouts.
