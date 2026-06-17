# Installing zebkit

## Requirements

- Node 18+
- A bundler that supports ESM (Vite, webpack 5, Rollup, etc.)

---

## 1. Install

```bash
# Install zebkit and its peer dependency
npm install github:mzebley/zebkit lit
```

`lit` is a peer dependency required for the web components. Your bundler resolves it alongside zebkit so you share a single copy.

---

## 2. CSS / design tokens

zebkit's CSS is generated per-project from your token configuration. Run the CLI once to set up:

```bash
npx zebkit init   # creates zebkit.config.json, optionally copies token files
npx zebkit build  # compiles tokens → CSS custom properties
```

Reference the output in your HTML:

```html
<link rel="stylesheet" href="./dist/zbk-default.min.css" />
```

After the initial setup, `zebkit build` is non-interactive and safe to add to your build pipeline.

### Customizing tokens

`zebkit init` can copy token files into `./tokens/`. Edit only the values you want to override — everything else falls back to the base theme:

```json
{
  "zbk-button": {
    "canvas": { "value": "#0057ff" },
    "border-radius": { "value": "0" }
  }
}
```

Point your config at the folder and rebuild:

```json
{
  "tokens": {
    "tokenPath": "./tokens",
    "themeName": "my-project"
  }
}
```

---

## 3. Web components

Import and register components before using them in HTML:

```ts
import { defineZbkHeading, defineZbkButton } from 'zebkit/components';

defineZbkHeading();
defineZbkButton();
```

Or register everything at once:

```ts
import { defineCoreComponents } from 'zebkit/components';

defineCoreComponents();
```

Then use the elements anywhere in your HTML:

```html
<zbk-heading level="1" anchor copy-link>Getting started</zbk-heading>

<zbk-button variant="primary">Save</zbk-button>
```

### TypeScript

The `zebkit/components` export ships with full type declarations. No extra `@types` package needed.

---

## 4. Config reference

Full `zebkit.config.json` shape:

```json
{
  "tokens": {
    "destinationPath": "./dist",
    "basePreset": "default",
    "tokenPath": "./tokens",
    "themeName": "my-project",
    "extendedTokens": {
      "colors": "smart",
      "breakpoints": ["tablet", "desktop"]
    },
    "overlays": [
      {
        "themeName": "dark",
        "tokenPath": "./tokens-dark",
        "rootSelector": "[data-zbk-theme=\"dark\"]"
      }
    ]
  }
}
```

| Field | Default | Description |
|---|---|---|
| `destinationPath` | `./dist` | Where to write compiled CSS |
| `basePreset` | `default` | Base preset to start from. Run `zebkit init` to see available presets. |
| `tokenPath` | — | Path to a JSON override file or folder |
| `themeName` | preset name | Used in the output filename |
| `overlays` | — | Scoped overlay themes — each redeclares only the tokens it changes. See below. |
| `extendedTokens.colors` | `"all"` | `"smart"` trims unused primitive color palettes from the output |
| `extendedTokens.breakpoints` | all | Array of breakpoints to include, `false` for none |

### Overlay themes

An overlay emits a tiny, selector-scoped stylesheet (`zbk-<themeName>.css`) that redeclares **only** the tokens its `tokenPath` overrides — no palettes, utilities, or reset, since those already ship in the base CSS. Load the base CSS plus the overlay, then toggle the selector (e.g. `data-zbk-theme="dark"`) to re-skin via the cascade.

| Overlay field | Default | Description |
|---|---|---|
| `tokenPath` | — (required) | Override file or folder; only its tokens are emitted |
| `themeName` | — (required) | Output filename `zbk-<themeName>.css` |
| `rootSelector` | `[data-zbk-theme="<themeName>"]` | Selector to scope the overlay under (must not be `:root`) |
| `destinationPath` | base `destinationPath` | Output directory |
| `fonts.strategy` | base `fonts.strategy` | Google Fonts delivery strategy for this overlay |

---

## Publishing checklist (maintainers)

```bash
npm run build:defaults    # token snapshots → dist/cli/defaults/
npm run build:cli         # CLI bundle     → dist/cli/zebkit.mjs
npm run build:components  # component ESM  → dist/components/
npm publish               # prepublishOnly runs all three automatically
```
