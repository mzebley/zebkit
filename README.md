# zebkit

A token-driven, accessibility-first CSS design system. Every visual decision flows through a three-tier token system (primitives → aliases → component tokens) that compiles to CSS custom properties. Swap tokens to retheme any project without touching component markup or CSS structure.

## Using zebkit in your project

Install zebkit:

```bash
// npm install zebkit
// Use through GitHub for now
npm install github:mzebley/zebkit
```

Initialize zebkit in your project (creates `zebkit.config.json`, optionally copies default tokens for customization):

```bash
npx zebkit init
```

Build CSS:

```bash
npx zebkit build
```

Reference the output CSS in your project:

```html
<link rel="stylesheet" href="./dist/zbk-default.min.css" />
```

### Config file

`zebkit init` creates a `zebkit.config.json` in your project root. You can also create one manually:

```json
{
  "tokens": {
    "destinationPath": "./dist",
    "assetFilePath": "/",
    "theme": "default",
    "customTokenPath": "./tokens",
    "customThemeName": "my-project"
  }
}
```

Once the config exists, `zebkit build` is non-interactive — no prompts. Useful for CI and build scripts.

### Customizing tokens

Run `zebkit init` with the option to copy token files into your project. This places per-module JSON files in `./tokens/`:

```
tokens/
  zbk-button.json
  zbk-spacing.json
  zbk-color.json
  ...
```

The selected base theme remains the fallback source of truth. Edit only the files or token values you want to change:

```json
{
  "zbk-button": {
    "canvas": { "value": "#0057ff" },
    "border-radius": { "value": "0" }
  }
}
```

Run `zebkit build` to recompile CSS with your overrides applied on top of the selected base theme. Missing files or token keys in `./tokens/` fall back to the base theme automatically.

### Config reference

```json
{
  "tokens": {
    "destinationPath": "./dist",
    "assetFilePath": "/",
    "theme": "default",
    "customTokenPath": "./tokens",
    "customThemeName": "my-theme",
    "selectedComponents": [],
    "includeAllComponents": false,
    "exportTokens": false,
    "splitMode": "combined",
    "outputFormats": ["JSON"]
  }
}
```

| Field | Default | Description |
|---|---|---|
| `destinationPath` | `./dist` | Where to write the compiled CSS |
| `assetFilePath` | `/` | Base URL for asset references in CSS |
| `theme` | `default` | Base theme name. `zebkit init` prompts with `default` plus any bundled presets. |
| `customTokenPath` | — | Path to a JSON override file or folder of partial JSON overrides |
| `customThemeName` | theme name | Name used in the output filename |
| `selectedComponents` | `[]` | Components to include (empty = core only) |
| `includeAllComponents` | `false` | Include all available components |
| `exportTokens` | `false` | Also write token artifacts (JSON/TS/JS) |
| `splitMode` | `combined` | `combined` (one file) or `per-module` (one file per token module) |
| `outputFormats` | `["JSON"]` | `JSON`, `TypeScript`, and/or `JavaScript` |

---

## Development (working in this repo)

## Token Build Pipeline
- Token modules live in `src/core/**/tokens.ts` (and later `src/components/**/tokens.ts`) with matching `token-schema.ts` files.
- Shared token definitions and maps are under `src/definitions`.
- Build tokens and CSS with `npm run build:tokens` and follow the prompts to choose components, theme, output formats, and split mode.
- To skip prompts, supply answers in a `zebkit.config.json` (or `zebkit-config.json` / `zekit.config.json`) file. You can also point to a custom location with `--config path/to/config.json`.
- Config files accept a `tokens` section (for component selection, destination, asset path, theme/custom overrides, export settings, split mode, and output formats) and a `components` section (for selected components and `jsOutput`).
- Built-in theme presets live under `theme/<name>/` in this repo and are bundled into the published CLI as base-theme snapshots.
- Project overrides can be a single JSON file or a folder of partial JSON overrides.
- Combined mode writes one set of files per format (e.g., `<theme>-tokens.json`); per-module mode writes `zbk-<module>.tokens.<ext>` for each token module.

### Publishing

```bash
npm run build:defaults  # compile token defaults to dist/cli/defaults/
npm run build:cli       # bundle CLI to dist/cli/zebkit.mjs
npm publish             # runs prepublishOnly (both builds) then publishes
```

## Foundation Token Modules

Zebkit ships with foundation token modules for common design properties:

- **Elevation** (`src/core/elevation/`) - Box shadow scales for depth and layering (xs, sm, md, lg, xl, 2xl, inner variants)
- **Opacity** (`src/core/opacity/`) - Opacity scale from 0–100 in 5% increments for transparency control
- **Z-Index** (`src/core/z-index/`) - Stacking order system with numeric levels and semantic roles (dropdown, modal, tooltip, etc.)
- **Transition** (`src/core/transition/`) - Animation durations and easing curves separated by character (playful vs. calm) and type (motion vs. effects)
- **Semantic aliases** (`src/core/semantic/`) - Functional token aliases for color, border, and spacing that reference primitives

## Utility Class System

Zebkit generates utility classes via SCSS generators in `src/core/styles/utilities/`:

- All utilities are token-driven; no hard-coded values
- Responsive utilities support breakpoint variants
- Utilities cover color, spacing, layout, typography, border, and visual effects
- Generators prevent duplication; see `_generators.scss` for the mixin patterns

## Documentation site
- The canonical examples and usage guidance now live in the Astro + Starlight docs under `/docs` (Rapide theme).
- Install docs dependencies once with `cd docs && npm install`.
- Run the site locally with `npm run docs:dev` and build static output with `npm run docs:build`.
- Legacy static demos in `examples/` are deprecated in favor of the docs site; keep new feature examples inside the docs.
