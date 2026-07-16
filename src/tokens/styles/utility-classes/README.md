---
title: Utilities Overview
description: Zebkit's utility class system and token-driven approach to responsive styling.
---

Zebkit generates utility classes with [manifests](../../../scripts/utilities/README.md). Every utility that can be is token-driven — classes like ```.visibility-hidden``` are hardcoded to ```visibility:hidden``` while things like ```.gap-05``` are set to ```gap: var(--zbk-spacing-05)``` — and supports responsive variants and state-based styling.

Learn why we use as many utility classes as we do in the [manifesto](../../../../foundations/VISION.md).

## How Utilities Are Generated

Utilities are built via [JSON manifest files](../../../scripts/utilities/README.md) that have been properly [schema'd](../../../../schemas/utility-manifest.schema.json) so that you can simply hover over a property name in your IDE to learn what the property is intended for. Use ```npm run generate:utilities``` to build SCSS files from all available manifests and ```npm run lint:utilities``` to insure they've been properly created.

Future vision is to be able to use our schemas to generate style code in languages beyond CSS/SCSS (Swift, Kotlin, Dart, etc) for token parity across websites, iOS, Android apps and more.

```JSON
// Example: margin.utilities.manifest.JSON
{
  "$schema": "../../../../schemas/utility-manifest.schema.json",
  "name": "Margin utilities",
  "key": "margin",
  "description": "Dictates spacing outside of the defined border of an element, separating it from neighboring elements.",
  "layer": "utilities",
  "families": [...]
}
```

Review the [margin manifest](./margin.utilities.manifest.json) and its generated [SCSS file](./margin.scss).

## Responsive Variants

All utilities generate breakpoint variants automatically using a mobile-first approach:

```html
<!-- Default on mobile, larger spacing on tablet and up -->
<div class="padding-2 tablet:padding-6 desktop:padding-8">
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

TODO: has changed with manifests andneeds to be addressed

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
<div class="display-flex align-items-center gap-4 padding-6 canvas-app-soft radius-full">
  <img src="..." alt="" />
  <div>
    <p class="font-lg text-semibold ink-app-strong">Title</p>
    <p class="font-sm ink-app-muted">Subtitle</p>
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
3. **Respect reduced motion**: Transition and animation utilities automatically respect `prefers-reduced-motion`.
4. **Trust the token system**: Every utility value is token-driven, so changes cascade safely across the entire UI.
