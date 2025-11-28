# Zebkit Cascade Layers

Zebkit tokens now carry simple metadata that declares which CSS `@layer` they belong to. Cascade layers let us control which groups of variables win in the cascade without changing the selectors or the token values themselves.

## Layer catalog

| Layer | What belongs here |
| --- | --- |
| `theme` | Theme overrides and semantic tokens that intentionally change base values (brand palettes, theme spacing/typography tweaks). |
| `base` | Primitive tokens and foundations (scales for spacing, sizing, color, typography primitives). |
| `components` | Component-scoped tokens (button, input, card, etc.). |
| `utilities` | Tokens that back utility classes or helpers (spacing utilities, typography helpers, future functional utilities). |

## Assigning a layer in a token module

Every `tokens.ts` file can export a `layer` alongside `key` and the default token map. Import `LayerName` for type safety and set a layer string:

```ts
// src/components/button/tokens.ts
import type { LayerName } from '@definitions/layers';
import type { TokenInterface } from '@definitions/tokens';

export const layer: LayerName = 'components';
export const key = 'button';

const tokens: TokenInterface = {
  // ...
};

export default tokens;
```

Core token modules default to `layer: 'base'`; component token modules default to `layer: 'components'`. You can opt into `theme` or `utilities` when you need different cascade behavior.

## How the compiler uses layers

- `buildZebkitTokens` reads the `layer` export from each token module (falling back to `base`) and returns a `layers` map keyed by the token key (e.g., `zbk-spacing`).
- `convertTokensToCssVars(tokens, { layers })` uses that map to wrap each module’s `:root` block inside the appropriate `@layer`.
- The generated CSS always declares the layer order up front:

  ```
  @layer theme, base, components, utilities;
  ```

  Only layers that contain tokens are emitted after that line.

## Mental model

- If you ignore layers and keep `layer: 'base'`, nothing breaks—your CSS variables still land in `:root`.
- When theming or tightening the cascade, place primitives in `base`, theme overrides in `theme`, component tokens in `components`, and utility-backed tokens in `utilities`.
- Layers don’t change token values; they only decide which cascade bucket holds the generated CSS variables.
