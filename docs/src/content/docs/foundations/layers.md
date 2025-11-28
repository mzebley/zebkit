---
title: Cascade layers
description: Layer metadata keeps Zebkit tokens deterministic in the cascade.
---

Zebkit tokens carry metadata that declares which CSS `@layer` they belong to. Layers keep token overrides predictable without
changing selectors or token values.

## Layer catalog

| Layer | What belongs here |
| --- | --- |
| `theme` | Theme overrides and semantic tokens that intentionally change base values (brand palettes, theme spacing/typography tweaks). |
| `base` | Primitive tokens and foundations (spacing, sizing, color, typography primitives). |
| `components` | Component-scoped tokens (button, input, card, etc.). |
| `utilities` | Tokens that back utility classes or helpers (spacing utilities, typography helpers). |

## Assigning a layer in a token module

Export a `layer` alongside `key` and the default token map:

```ts
import type { LayerName } from '@definitions/layers';

export const layer: LayerName = 'components';
export const key = 'button';
```

Core token modules default to `layer: "base"`; component token modules default to `layer: "components"`. Opt into `theme` or
`utilities` when you need different cascade behavior.

## How the compiler uses layers

- `buildZebkitTokens` reads the `layer` export and returns a `layers` map keyed by token key.
- `convertTokensToCssVars(tokens, { layers })` wraps each module’s `:root` block inside the appropriate `@layer` declaration.
- The generated CSS declares the layer order up front so overrides are deterministic:

```css
@layer theme, base, components, utilities;
```

If you ignore layers and keep `layer: "base"`, your CSS variables still land in `:root`. When theming or tightening the cascade,
place primitives in `base`, theme overrides in `theme`, component tokens in `components`, and utility-backed tokens in
`utilities`.
