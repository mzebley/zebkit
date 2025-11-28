---
title: Color
description: How Zebkit structures primitives, semantic families, and utilities for accessible color.
---

Zebkit treats color as a layered system: primitives define raw ramps, semantic families express intent, and utilities expose both
layers as ergonomic classes. Families such as `brand`, `accent-primary`, `action`, and `positive` follow the same structure so you
can swap palettes without rewriting markup.

## Philosophy: primitives, semantics, roles, and state

- **Primitive ramps**: base palettes are generated as scale steps (50–950) using utilities like `primitiveColor`, which builds
  `--zbk-color-<family>-<step>` variables for each hue and saturation. Use primitive utilities when you need a specific shade for
data viz or bespoke UI. 
- **Semantic families**: the color README defines a matrix of families (brand, accent, app, action, caution, critical, info,
  positive) and roles (canvas, ink, border) with optional variants (`inverse`) and intensities (`soft`, `muted`, `strong`). A name
  like `brand-ink-inverse-muted` reads as family → role → variant → intensity and resolves to a semantic CSS variable.
- **Utilities mirror semantics**: the semantic color utility generator maps those tokens to classes such as
  `.canvas-brand-muted`, `.ink-brand-strong`, or `.focus:border-action-inverse`. State prefixes (`hover:`, `focus:`, `active:`,
  `disabled:`) are baked in so interaction styling stays consistent.

## Using color utilities in UI

Pick the utility that matches your intent, not a hard-coded hex:

```html
<button class="zbk-button canvas-brand-strong focus:border-brand-inverse">
  Primary action
</button>
```

```html
<div class="canvas-app-soft ink-app-strong hover:ink-app-inverse">
  Soft app canvas with brighter ink when hovered
</div>
```

- Apply **primitive utilities** (`canvas-stone-200`, `ink-stone-950`) when you need a precise ramp step.
- Reach for **semantic utilities** (`canvas-brand`, `border-positive-strong`) to keep components palette-agnostic.
- State-prefixed classes (`hover:`, `focus:`, `active:`, `disabled:`) only apply on relevant devices and respect accessibility
  behaviors baked into the utilities.

## Accessibility and contrast

Semantic roles (canvas/ink/border) are tuned for contrast: base `ink` colors sit on their matching `canvas` backgrounds and expose
`inverse` variants for dark or over-branded surfaces. Prefer semantic pairings when you need predictable contrast, and reserve
primitives for cases where you’ll manually verify WCAG ratios.

## Color families

Each family has its own page with usage notes and token hooks:

- [Brand](/foundations/color/brand)
- [Accent Primary](/foundations/color/accent-primary)
- [Accent Secondary](/foundations/color/accent-secondary)
- [App](/foundations/color/app)
- [Action](/foundations/color/action)
- [Caution](/foundations/color/caution)
- [Critical](/foundations/color/critical)
- [Info](/foundations/color/info)
- [Positive](/foundations/color/positive)

Start with the landing guidance here, then drill into a family to see how it expresses canvas, ink, and border roles.
