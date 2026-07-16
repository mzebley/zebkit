# Changelog

All notable changes to zebkit are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Pre-1.0: minor versions are feature waves, patches are additive follow-ups; no back-compat guarantees until 1.0.0.

> Versions below 0.8.0 are retroactive — reconstructed from git history on 2026-07-16 to give the road to 1.0 a baseline. The only number that ever appeared in `package.json` before this file existed was a jump from 0.0.1 to 0.7.0 on 2026-06-20, which anchors the numbering. Nothing has been published to npm yet.

## [Unreleased]

Repository housekeeping (internal structure/tooling — no effect on the published package surface):

### Changed
- Grouped the binding concept docs into `foundations/` — `VISION.md`, `GRAMMAR.md`, `COMPONENT-VISION.md` (root markdown is now just README/CHANGELOG/INSTALL/CLAUDE/AGENTS)
- Renamed the documentation-site directory `docs/` → `doc-site/`; updated every build, config, and CI path (npm workspace, token + hero-theme output dirs, agent-context and CLI copy paths, `svelte.config.js`, Vercel `outputDirectory`)
- Moved theme build configs next to their tokens in `theme/` (`zebkit.docs.config.json`, `dynamowaves.config.json`, `markdown.config.json`)
- Relocated internal working docs under `plans/` (`plans/docs-site/` for the docs build plan and design brief, `plans/NOTES.md`)

### Removed
- Completed `HANDOFF-*.md` coordination docs, stale compiled theme CSS, the generated `theme/zebkit-baseline/` reference set, the redundant nested docs `package-lock.json`, and the obsolete `.babelrc`

### Fixed
- CI installed docs dependencies from a nested lockfile that no longer exists; the root `npm ci` covers the workspace, so that redundant step is removed
- Normalized a root-absolute manifesto link (`/foundations/VISION.md`) to a repo-relative path

### Added
- `.gitignore` rules for handoff docs, compiled theme CSS, the generated baseline reference, and local Claude settings

Road to 1.0:

- Rebuild `zbk-heading` to the GRAMMAR.md contract (the last pre-grammar component)
- Component wave Phase 1 (`plans/components/`): link, badge, tag, alert, progress, spinner, breadcrumb, disclosure, accordion, popover, dialog, menu
- Component wave Phase 2: combobox, toast, slider, table, pagination
- Dark-mode mechanism (the `*-inverse` app tokens exist; nothing toggles them yet)
- Per-component CSS/JS exclusion parity (`components` config should also shape the JS bundle)
- Docs: "For agents" prose, Cmd-K palette, accessibility audit, getting-started and config pages
- Prose token gaps: eyebrow, code/pre, link (see NOTES.md)
- JSON schema for `zebkit.config.json`
- First npm publish

## [0.8.1] — 2026-07-16

### Added
- Lede prose tokens and utility classes (#32)
- Expanded manifest-driven color utilities

### Fixed
- Vercel deployment for the docs site

## [0.8.0] — 2026-07-15

The component-grammar and production-hardening wave (#30, #31, #33).

### Added
- GRAMMAR.md, the binding component contract (naming, attributes, states, variants, content model), with COMPONENT-VISION.md as its narrative companion
- New components: `zbk-tooltip`, `zbk-toggle`, `zbk-input` (built-in masking), `zbk-select`, `zbk-textarea` — light-DOM Lit elements on `ZebkitElement`
- Component manifests (`zbk-*.manifest.json`) as source of truth: generated slot contracts, lint rules C1–C9, per-component agent docs
- Consumer variants: custom-variant JSON plus `registerVariants`
- `zebkit prune` to tree-shake built CSS, wired into `zebkit build` via `--prune` (#31)
- Per-component subpath exports (`zebkit/components/*`) and a multi-entry component build
- Agent context pipeline: `llms.txt` index, `llms-full.txt`, per-domain utility docs; ships with the CLI and copies into consuming projects on `zebkit init`

### Changed
- CLI hardened: real `--version`, threaded `--config`, new `--theme`/`--dest`/`--watch` flags, minify option, reproducible output ordering, loud build failures, bundled variant snapshot (#30)
- Contract enforcement: variant override typos fail the build; Zod validation errors name the fix

### Removed
- Stencil-era artifacts and stale scaffolding (repo hygiene pass)

## [0.7.0] — 2026-06-20

First real version bump, 0.0.1 to 0.7.0 (#29).

### Added
- Utility manifests (`*.utilities.manifest.json`) as single source of truth, with generated SCSS and a drift lint
- Margin, padding, grid, and gap utilities migrated onto manifests
- Breakpoint token module
- VISION.md manifesto and the COVERAGE.md utility benchmark against Tailwind
- Docs redesign: instrument/editorial aesthetic, runtime accessibility dials, and the hero "Reskin" driven by real compiled themes (Apple, Material, Atlassian, Carbon, Uber, Fluent) via the new `rootSelector` compiler option

## [0.6.0] — 2026-04-25

### Added
- `zebkit` CLI: `init` and `build`, per-project custom theming
- `zebkit pull` to merge updated token files without overwriting custom values
- `extendedTokens` config option to reduce output CSS size
- Editor autocomplete for token files via JSON schemas
- Lit adopted as the component base; `zbk-heading` prototype; Jest test suite

## [0.5.0] — 2026-01-19

### Changed
- Docs site migrated from Astro to SvelteKit

## [0.4.0] — 2026-01-12

### Added
- Foundation token modules: elevation, opacity, z-index, transition
- Token-driven, responsive utility class system built on generator mixins

### Fixed
- Variant override resolution

## [0.3.0] — 2025-11-29

### Added
- Astro docs site with a live button playground (#24) and token documentation tables (#25)
- Optional build config file, `zebkit.config.json` (#26)
- Docs synced to source token metadata (#27)

## [0.2.0] — 2025-10-02

### Added
- Checkbox component with full token surface and tests (#10–#12, #21)
- Radio component with group exclusivity (#22)
- Color token system refactor

### Fixed
- Button accessibility, lifecycle, and attribute-reactivity issues, each with test coverage (#1–#9)

## [0.1.0] — 2024-09-03

### Added
- Three-strata token pipeline — primitives, semantic aliases, component tokens — compiled to `--zbk-*` CSS custom properties
- `z-button` prototype and the initial build process
