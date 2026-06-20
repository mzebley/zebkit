---
title: Layers
description: How zebkit uses CSS cascade layers to make overrides predictable — without !important.
layout: editorial
section: Foundations
status: draft
---

# Layers

Zebkit emits all of its CSS custom properties inside named **cascade layers**, in a fixed
order:

```css
@layer theme, base, components, utilities;
```

Layers let zebkit control *which token group wins* in the cascade without touching values or
selectors. Later layers beat earlier ones regardless of specificity, so the override story is
about *which layer* a rule lives in — not how many class names you can stack.

| Layer | Holds |
| --- | --- |
| `theme` | Scoped theme token sets (e.g. a `[data-zbk-theme="…"]` subtree). |
| `base` | Primitive and alias tokens — the default vocabulary. |
| `components` | Per-component token surfaces (`--zbk-button-*`). |
| `utilities` | Utility-class bindings, last so a utility can always win. |

<aside class="editorial-marginalia">
Token modules land in <code>base</code> by default; a module can opt into another layer.
The ordering is the contract — utilities sit last on purpose, so applying a utility class is
a reliable way to override, not a specificity gamble.
</aside>

## Why this matters

Cascade layers are zebkit's entire override strategy, and that's deliberate:

- **No `!important`.** A system that needs `!important` to win has lost control of its own
  cascade — and it steals the final word from the consumer, who should always have it. Layers
  give predictable precedence without it.
- **The consumer keeps the last word.** Anything you author outside zebkit's layers naturally
  outranks them, so you can always override without forking or fighting.

Re-theming, then, is just emitting token values into the right layer — which is exactly what
[the strata](/foundations/tokens) and the theming tools do.
