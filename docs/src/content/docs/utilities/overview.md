---
title: Utilities Overview
description: Zebkit's utility class system and token-driven approach to responsive styling.
---

Zebkit generates utility classes from design tokens. Every utility is token-driven—no hard-coded values—and supports responsive variants and state-based styling.

## Philosophy

Utilities exist to reduce repetition, but never at the cost of maintainability. All utilities reference tokens, so:

- **Theming is consistent**: Change a token, all utilities automatically update
- **Customization is safe**: No color hex codes or pixel magic in utility rules
- **Responsive is built-in**: Breakpoint variants are generated automatically
- **State is explicit**: Utilities use prefixes like `hover:`, `focus:`, `disabled:` to control when they apply

## How Utilities Are Generated

Utilities are built via SCSS generators in `src/core/styles/utilities/`:

```scss
// Example: _color.scss
@mixin generate-color-utilities($families, $roles, $breakpoints) {
  @each $family in $families {
    @each $role in $roles {
      .canvas-#{$family}-#{$role} {
        background-color: var(--zbk-color-#{$family}-#{$role});
      }
    }
  }

  // Generate responsive variants
  @each $bp-name, $bp-query in $breakpoints {
    @media #{$bp-query} {
      // Same utilities with <breakpoint>: prefix
    }
  }
}
```

See `_generators.scss` for the complete mixin library.

## Utility Categories

### Color Utilities

Semantic color utilities follow the family/role/variant/intensity pattern:

```html
<!-- Background color (canvas) -->
<div class="canvas-brand-strong">Strong brand canvas</div>
<div class="canvas-brand-muted">Muted brand canvas</div>

<!-- Text color (ink) -->
<div class="ink-brand-default">Brand text</div>
<div class="ink-critical-strong">Critical red text</div>

<!-- Border color -->
<div class="border-positive-default">Positive border</div>
```

Primitive color utilities for precise ramp steps:

```html
<div class="canvas-stone-200">Light gray canvas</div>
<div class="ink-stone-950">Dark charcoal text</div>
```

### Spacing Utilities

Apply padding, margin, and gap tokens:

```html
<div class="p-spacing-4">Padding small</div>
<div class="m-spacing-8">Margin medium</div>
<div class="gap-spacing-card">Card spacing gap</div>
```

### Layout Utilities

Flexbox, grid, and positioning helpers:

```html
<div class="flex flex-center">Centered flex</div>
<div class="grid grid-cols-3">3-column grid</div>
<div class="flex-1">Flex grow</div>
```

### Typography Utilities

Text scaling and styling from token scales:

```html
<h1 class="text-size-xl">Large heading</h1>
<p class="text-size-sm">Small caption</p>
<p class="font-family-mono">Monospace</p>
```

### Border Utilities

Semantic border tokens applied as utilities:

```html
<div class="border-hairline">Hairline border</div>
<div class="border-control">Control-weight border</div>
<div class="border-emphasis">Emphasis border</div>
```

## Responsive Variants

All utilities generate breakpoint variants automatically using a mobile-first approach:

```html
<!-- Default on mobile, larger spacing on tablet and up -->
<div class="p-spacing-2 tablet:p-spacing-6 desktop:p-spacing-8">
  Responsive padding
</div>

<!-- Hidden on mobile, visible at tablet width -->
<div class="display-none tablet:display-flex">
  Desktop navigation
</div>
```

Breakpoint prefixes:

| Prefix | Min-width | Target |
|---|---|---|
| `tablet:` | 40rem | Tablets and up |
| `tablet-lg:` | 50rem | Large tablets and up |
| `desktop:` | 70rem | Desktop and up |
| `desktop-lg:` | 80rem | Large desktop and up |
| `widescreen:` | 100rem | Widescreen displays |

### Controlling which breakpoints are compiled

By default all five breakpoints are generated. Use `extendedTokens.breakpoints` in `zebkit.config.json` to reduce output:

```json
{
  "tokens": {
    "extendedTokens": {
      "breakpoints": ["tablet", "desktop"]
    }
  }
}
```

Set to `false` to generate no responsive classes at all. Only the breakpoints you list will have utility prefixes compiled into the CSS.

## State Variants

Utilities support state prefixes for interaction styling:

```html
<button class="canvas-brand hover:canvas-brand-strong focus:ring-focus active:canvas-brand-muted disabled:opacity-40">
  Interactive button
</button>
```

State prefixes:
- `hover:` - On mouse hover
- `focus:` - On focus (including focus-visible)
- `active:` - On active/pressed state
- `disabled:` - When aria-disabled or disabled attribute is set
- `focus-visible:` - On keyboard focus only

## Combining Utilities

Utilities compose freely. Build complex layouts without custom CSS:

```html
<div class="flex flex-center gap-spacing-4 p-spacing-6 canvas-app-soft rounded">
  <img src="..." alt="" />
  <div>
    <p class="text-size-lg font-weight-600 ink-app-strong">Title</p>
    <p class="text-size-sm ink-app-muted">Subtitle</p>
  </div>
</div>
```

## Customization and Theming

All utility values reference tokens. Override them per theme:

```json
{
  "color": {
    "brand-500": {
      "value": "#0066cc"
    }
  },
  "spacing": {
    "4": {
      "value": "1.125rem"
    }
  }
}
```

Utilities automatically reflect the new token values—no CSS changes needed.

## Best Practices

1. **Prefer semantic utilities** over primitives: Use `canvas-brand` instead of `canvas-blue-600`.
2. **Use responsive prefixes** for mobile-first design: Start with mobile styles, then add breakpoint overrides.
3. **Combine with design tokens**: For complex or one-off styling, reach for CSS custom properties instead of utility classes.
4. **Respect reduced motion**: Transition and animation utilities automatically respect `prefers-reduced-motion`.
5. **Trust the token system**: Every utility value is token-driven, so changes cascade safely across the entire UI.

## Advanced: Generator Mixins

If you need to extend utilities, see `_generators.scss` for reusable SCSS mixins:

```scss
// Import the generator mixins
@import '@token-scripts/utilities/generators';

// Create a custom utility class
@include generate-custom-spacing-utility('gap', 'gap', $spacing-tokens, $breakpoints);
```

Generators handle responsive variant generation and ensure consistency across utility families.
