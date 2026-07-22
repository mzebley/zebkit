# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Read [VISION.md](foundations/VISION.md) before making design decisions.** It is the project manifesto: the core beliefs, principles, and anti-goals that every architectural and design choice must trace back to. Its "For AI agents and tooling" section is binding. **[GRAMMAR.md](foundations/GRAMMAR.md) is the binding component contract** — naming, attributes, states, variants, content model — for any component work.

**Log notable changes in [CHANGELOG.md](CHANGELOG.md) as you complete them.** Add bullets under `## [Unreleased]` using Keep a Changelog subsections (Added/Changed/Fixed/Removed); this project tracks changes toward v1. Bump the `package.json` version only when cutting a release — do not create a new version heading for uncommitted work.

## Build & Development Commands

```bash
npm test                    # Run Jest tests
npm run test:watch          # Run tests in watch mode
npm run type-check          # TypeScript type checking (tsc --noEmit)
npm run build:tokens        # Build design tokens (interactive prompts)
npm run build:components    # Build web components
npm run generate            # Regenerate all derived source (utilities + components + palette SCSS)
npm run generate:utilities  # Utility SCSS from utility manifests
npm run generate:components # Component slot-contract.ts from component manifests
npm run generate:palette    # Palette SCSS from the palette token definition
npm run build               # Full build: generate -> CEM -> tokens/CSS -> components -> doc-site/context -> editor/CLI
npm run lint                # Lint components + utilities
npm run lint:utilities      # Lint utility manifests against generated SCSS
npm run lint:components     # Lint component manifests against code (slots, examples)
npm run check               # Full gate: tests, type-check, both lints, drift checks, docs build
npm run docs:dev            # Refresh every generated artifact, then run the docs dev server
npm run docs:build          # Refresh every generated artifact, then build static docs
```

**Configuration**: Token/component builds can skip prompts via `zebkit.config.json`, or pass `--config path/to/config.json`.

**Manifests are the source of truth.** Utility classes are generated from hand-authored `*utilities.manifest.json` contracts (`src/scripts/utilities/README.md`); component slot contracts and agent docs are generated from `zbk-*.manifest.json` (`src/scripts/components/README.md`); the primitive palette SCSS (mixin, family partials, globals) is generated from `src/tokens/colors/palette/tokens/palette-definition.ts`. Never hand-edit a generated `*.scss` partial or `slot-contract.ts` — edit the manifest/definition and regenerate.

## Architecture Overview

Zebkit is a **token-driven, accessibility-first web component library**. Design decisions flow through a three-tier token system that compiles to CSS custom properties.

### Token System (Three Strata)

1. **Primitive tokens**: Foundational values (`--zbk-color-*`, `--zbk-spacing-*`, `--zbk-font-size-*`)
2. **Alias tokens**: Semantic mappings (`--zbk-primary-*`, `--zbk-body-background`) that reference primitives
3. **Component tokens**: Namespaced per-component (`--zbk-button-*`) that default to aliases

All CSS variables use the `--zbk-` prefix. Interaction-state suffixes (default state is unsuffixed): `-hover`, `-active`, `-focus`, `-disabled`. Semantic-state suffixes (`-selected`, `-checked`, `-invalid`, ...) apply only where the pattern has that semantic — see GRAMMAR.md.

### Directory Structure

- `src/tokens/` - The token language: primitive + semantic token modules and utility SCSS
- `src/tokens/semantic/` - Semantic token aliases (border, color, spacing) that merge with primitives
- `src/components/` - Web components; each owns `index.ts`, `tokens/tokens.ts`, `variants/`, `styles.scss` (and, only where structural constraints require it, a bespoke `tokens/token-schema.ts`)
- `src/components/base/` - `ZebkitElement` (light-DOM Lit base class) and the shared live-region announcer
- `src/definitions/` - Shared token types, maps, and Zod schemas
- `src/scripts/tokens/` - Token build pipeline (gather, compile, convert to CSS vars)
- `doc-site/` - SvelteKit documentation site

### Token Module Structure

Each token module exports:
- `key`: Module namespace string
- Default export: Token map object. Most modules validate against the generic `tokenModuleSchema`; a module supplies its own `token-schema.ts` only for structural constraints (breakpoint ordering, generated scale steps, font-family loading metadata)

Token entries follow the DTCG 2025.10 shape — `TokenObject` from `src/definitions/tokens.ts`; anything zebkit-specific (the `a11y` modifier opt-in, font metadata, scale-step index) is namespaced under `$extensions["dev.zebkit"]`:
```typescript
{ $value: string | number | StructuredValue, $type: AllowedTokenTypes, $description: string, $extensions?: { "dev.zebkit": { a11y?: boolean | string, ... } } }
```

### Foundation Token Modules

Zebkit includes foundation token modules for common visual properties:

- **Elevation** (`src/tokens/elevation/`) - Box shadow scales with inner variants (xs, sm, md, lg, xl, 2xl, inner)
- **Opacity** (`src/tokens/opacity/`) - Opacity scale from 0 to 100 in 5% increments
- **Z-Index** (`src/tokens/z-index/`) - Stacking order system with semantic tokens (dropdown, sticky, fixed, modal, tooltip)
- **Transition** (`src/tokens/transition/`) - Animation durations and easing curves for motion (playful/calm, motion/effects)
- **Colors** (`src/tokens/colors/`) - Primitive color palettes organized by intent (neutral, brand, accent, status)
- **Spacing** (`src/tokens/spacing/`) - Size-based spacing scale for layout and component padding/margins
- **Typography** (`src/tokens/typography/`) - Font families and sizing scales

### Utility Class System

Zebkit generates utility classes via SCSS generators in `src/tokens/styles/mixins/`:

- **Responsive utilities** - Generated utilities support responsive breakpoints via `@media` queries
- **Token-driven** - All utilities reference design tokens; no hard-coded values
- **Generator mixins** - Utilities are built from reusable SCSS generators to prevent duplication
- See `_generators.scss` for the mixin patterns; utilities include color, spacing, layout, typography, and border utilities

### Path Aliases

- `@config` → `src/config/zebkit.ts`
- `@definitions/*` → `src/definitions/*`
- `@token-scripts/*` → `src/scripts/tokens/*`

## Core Principles

- **Accessibility before aesthetics**: Keyboard, screen reader, and reduced-motion support are mandatory
- **Tokens over hard-coded values**: Every visual decision is a token; direct values only in primitives
- **Composable HTML**: Components use light DOM with progressive enhancement
- **Deterministic overrides**: Re-theming happens through tokens, not component internals
- **Pre-release, no back-compat**: The project has not shipped. When updating an existing feature, change it cleanly — do NOT add backward-compatibility shims, legacy fallbacks, deprecation paths, or dual-format support. Migrate callers/data to the new shape instead.

## Component Authoring

- Components are Lit custom elements rendering into light DOM, extending `ZebkitElement` (`src/components/base/`)
- Include keyboard interactions, focus management, and ARIA hooks in base HTML
- Provide visual state tokens for: `default`, `hover`, `active`, `focus-visible`, `disabled`
- Token entries use the DTCG `$value`/`$type`/`$description` shape and validate against the generic `tokenModuleSchema` by default; add a bespoke `token-schema.ts` only for structural constraints
