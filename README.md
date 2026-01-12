# zebkit

## Token Build Pipeline
- Token modules live in `src/core/**/tokens.ts` (and later `src/components/**/tokens.ts`) with matching `token-schema.ts` files.
- Shared token definitions and maps are under `src/definitions`.
- Build tokens and CSS with `npm run build:tokens` and follow the prompts to choose components, theme, output formats, and split mode.
- To skip prompts when running `npm run build:tokens` or `npm run build:components`, supply answers in a `zebkit.config.json` (or `zebkit-config.json` / `zekit.config.json`) file. You can also point to a custom location with `--config path/to/config.json`.
- Config files accept a `tokens` section (for component selection, destination, asset path, theme/custom overrides, export settings, split mode, and output formats) and a `components` section (for selected components and `jsOutput`).
- Theme overrides can be a single JSON file `src/themes/<name>.json` or a folder `src/themes/<name>/` containing multiple JSON override files.
- Combined mode writes one set of files per format (e.g., `<theme>-tokens.json`); per-module mode writes `zbk-<module>.tokens.<ext>` for each token module.

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
