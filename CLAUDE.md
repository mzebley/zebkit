# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Read [VISION.md](VISION.md) before making design decisions.** It is the project manifesto: the core beliefs, principles, and anti-goals that every architectural and design choice must trace back to. Its "For AI agents and tooling" section is binding.

## Build & Development Commands

```bash
npm test                    # Run Jest tests
npm run test:watch          # Run tests in watch mode
npm run type-check          # TypeScript type checking (tsc --noEmit)
npm run build:tokens        # Build design tokens (interactive prompts)
npm run build:components    # Build web components
npm run docs:dev            # Run docs dev server (Astro)
npm run docs:build          # Build static docs
```

**Configuration**: Token/component builds can skip prompts via `zebkit.config.json`, or pass `--config path/to/config.json`.

## Architecture Overview

Zebkit is a **token-driven, accessibility-first web component library**. Design decisions flow through a three-tier token system that compiles to CSS custom properties.

### Token System (Three Strata)

1. **Primitive tokens**: Foundational values (`--zbk-color-*`, `--zbk-spacing-*`, `--zbk-font-size-*`)
2. **Alias tokens**: Semantic mappings (`--zbk-primary-*`, `--zbk-body-background`) that reference primitives
3. **Component tokens**: Namespaced per-component (`--zbk-button-*`) that default to aliases

All CSS variables use the `--zbk-` prefix. State suffixes: `-default`, `-hover`, `-active`, `-focus`, `-disabled`, `-danger`.

### Directory Structure

- `src/core/` - Core components and primitive token modules
- `src/core/[component]/` - Component with `index.ts`, `tokens/tokens.ts`, `tokens/token-schema.ts`
- `src/core/semantic/` - Semantic token aliases (border, color, spacing) that merge with primitives
- `src/definitions/` - Shared token types, maps, and Zod schemas
- `src/scripts/tokens/` - Token build pipeline (gather, compile, convert to CSS vars)
- `src/scripts/components/` - Component build scripts
- `docs/` - Astro + Starlight documentation site

### Token Module Structure

Each token module exports:
- `key`: Module namespace string
- Default export: Token map object matching the Zod schema in `token-schema.ts`

Token entries follow `TokenObject` shape from `src/definitions/tokens.ts`:
```typescript
{ value: string | number, type: AllowedTokenTypes, description: string, a11y?: boolean | string }
```

### Foundation Token Modules

Zebkit includes foundation token modules for common visual properties:

- **Elevation** (`src/core/elevation/`) - Box shadow scales with inner variants (xs, sm, md, lg, xl, 2xl, inner)
- **Opacity** (`src/core/opacity/`) - Opacity scale from 0 to 100 in 5% increments
- **Z-Index** (`src/core/z-index/`) - Stacking order system with semantic tokens (dropdown, sticky, fixed, modal, tooltip)
- **Transition** (`src/core/transition/`) - Animation durations and easing curves for motion (playful/calm, motion/effects)
- **Colors** (`src/core/colors/`) - Primitive color palettes organized by intent (neutral, brand, accent, status)
- **Spacing** (`src/core/spacing/`) - Size-based spacing scale for layout and component padding/margins
- **Typography** (`src/core/typography/`) - Font families and sizing scales

### Utility Class System

Zebkit generates utility classes via SCSS generators in `src/core/styles/mixins/`:

- **Responsive utilities** - Generated utilities support responsive breakpoints via `@media` queries
- **Token-driven** - All utilities reference design tokens; no hard-coded values
- **Generator mixins** - Utilities are built from reusable SCSS generators to prevent duplication
- See `_generators.scss` for the mixin patterns; utilities include color, spacing, layout, typography, and border utilities

### Path Aliases

- `@config` → `src/config/zebkit.ts`
- `@definitions/*` → `src/definitions/*`
- `@token-scripts/*` → `src/scripts/tokens/*`
- `@component-scripts/*` → `src/scripts/components/*`

## Core Principles

- **Accessibility before aesthetics**: Keyboard, screen reader, and reduced-motion support are mandatory
- **Tokens over hard-coded values**: Every visual decision is a token; direct values only in primitives
- **Composable HTML**: Components use light DOM with progressive enhancement
- **Deterministic overrides**: Re-theming happens through tokens, not component internals
- **Pre-release, no back-compat**: The project has not shipped. When updating an existing feature, change it cleanly — do NOT add backward-compatibility shims, legacy fallbacks, deprecation paths, or dual-format support. Migrate callers/data to the new shape instead.

## Component Authoring

- Components are custom elements (web components) using light DOM
- Include keyboard interactions, focus management, and ARIA hooks in base HTML
- Provide visual state tokens for: `default`, `hover`, `active`, `focus-visible`, `disabled`
- Token schemas use Zod for validation; keep `token-schema.ts` in sync with `tokens.ts`
