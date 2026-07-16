

# Spacing Primitives

Zebkit’s **spacing scale** is the single source of truth for both sizing and spacing throughout the system. Instead of splitting spacing and sizing into different conceptual ladders, Zebkit treats them as a unified primitive: a consistent, predictable numerical scale that can drive margins, padding, gaps, layout spacing, component dimensions, and even macro‑layout tiers.

This file documents:
- What the spacing scale is
- Why Zebkit uses a unified spacing+sizing primitive
- How to use spacing tokens in components and layouts
- How the scale is structured (negative → precision → core → layout tiers)

---

## Why a unified spacing + sizing scale?
Most design systems fragment the concept of “distance” into separate scales:
- *spacing* for margins/padding
- *sizing* for widths/heights
- *layout spacing* for larger structural gaps

That separation often becomes a maintenance burden. Zebkit instead uses one ladder for **all physical distances**, small or large. This ensures:

### 1. Consistency
If two values should visually relate, they should literally come from the same scale.

### 2. Predictability
Designers and developers don’t need to remember which scale applies where—distance is distance.

### 3. Theming power
Updating a single value reshapes spacing everywhere consistently, from tight UI clusters to full-page layout breathing room.

### 4. A11y scalability
Because the ladder supports `rootSize` tokens with responsive/a11y modifiers, Zebkit can scale spacing dynamically without breaking layout composition.

---

## Structure of the Scale
Zebkit’s spacing primitives include:

### **Negative spacing**
For intentional overlap, optical nudging, or advanced layout effects.  
Includes extremely large pulls down to hairline adjustments.

### **Zero**
Neutral spacing (`0`).

### **Precision spacing**
Pixel-level adjustments (e.g., `1px`, `2px`).  
Used sparingly—mainly for borders, icon alignment, and system-level corrections.

### **Core spacing**
The most commonly used range from tiny → small → base → medium → large → XL.
These tokens power everyday UI:
- component padding
- gaps between form elements
- button spacing
- grid cell spacing

### **Expanded layout tiers**
A continuation of the same scale into very large sizes (3XL → 13XL).  
Meant for:
- section padding
- grid gutters
- full-screen breathing room
- hero spacing
- responsive layout patterns

These values are intentionally huge—they’re not for component-level work.

---

## Usage
Spacing tokens are exported through the Zebkit token processor and become CSS custom properties:

```
var(--zbk-spacing-3);
var(--zbk-spacing-neg-2);
var(--zbk-spacing-50);
```

Components should *never* hardcode spacing values. Instead, they reference the primitives so themes and user adjustments continue to work:

```scss
.zbk-button {
  padding-inline: var(--zbk-spacing-2);
  padding-block: var(--zbk-spacing-105);
  gap: var(--zbk-spacing-1);
}
```

Larger layouts use the extended scales the same way:

```scss
.page-section {
  padding-block: var(--zbk-spacing-40);
  gap: var(--zbk-spacing-15);
}
```

Negative tokens enable advanced composition when needed:

```scss
.badge--overlap {
  margin-inline-start: var(--zbk-spacing-neg-3);
}
```

---

## Responsive + A11y Behavior
All spacing tokens use the `rootSize` type, meaning:
- They scale according to Zebkit’s a11y modifiers
- They can optionally scale with viewport factors
- Themes can redefine any value without rewriting component code

This makes layouts fluid, predictable, and accessible by default.

---

## When to use spacing tokens
Use the spacing scale for:
- margin
- padding
- gap
- inset
- width/height (when tied to rhythm)
- grid templates
- flex spacing
- responsive layout spacing

Avoid using spacing tokens for:
- typography sizes (use `fontSize`)
- motion durations (use `duration` future module)

---

## Future Layout Module
A future `layout/` core module will:
- provide semantic aliases (`section-padding`, `screen-gutter`, etc.)
- map directly to large spacing tiers
- standardize full-page responsive patterns

But the raw values will always come from **this** spacing scale.

---

## Summary
Zebkit’s spacing primitives are:
- **Unified** (sizing + spacing together)
- **Predictable**
- **Themeable**
- **Accessible**
- **Component-safe**

This ladder is the foundation for every physical measurement in the system.  
If a distance exists, it should come from here.