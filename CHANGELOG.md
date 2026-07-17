# Changelog

All notable changes to zebkit are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Pre-1.0: minor versions are feature waves, patches are additive follow-ups; no back-compat guarantees until 1.0.0.

> Versions below 0.8.0 are retroactive — reconstructed from git history on 2026-07-16 to give the road to 1.0 a baseline. The only number that ever appeared in `package.json` before this file existed was a jump from 0.0.1 to 0.7.0 on 2026-06-20, which anchors the numbering. Nothing has been published to npm yet.

## [Unreleased]

Primitive palette redesign plus repository housekeeping (the palette change affects the published CSS surface; the rest is internal structure/tooling):

### Changed
- Re-spaced the primitive palette so every family earns its slot (was 22 families with several 5–10&deg; hue collisions). Vivid wheel retunes: `orange` 24&deg;→28&deg;/88%, `gold` 42&deg;→40&deg;/85% (amber-leaning), `yellow` 52&deg;→56&deg;/85% (lemon; `butterfield` stays the soft yellow via its lower saturation), `deepcurrent` 220&deg;→224&deg;/85%, `indigo` 228&deg;→243&deg;/72% (true blue-violet indigo), `violet` 265&deg;→268&deg;, `merlot` 330&deg;→320&deg;/62% (wine red-purple, no longer pink's twin). Four near-duplicates moved to a muted register alongside `dusk`/`stone`/`charcoal`: `mint` 158&deg;/42% (sage-mint), `sea` 196&deg;/36% (sea-glass), `lavenderfield` 258&deg;/42% (soft lavender), `rosewater` 352&deg;/40% (finally the soft pink its name promises). Unchanged: `red`, `ember`, `butterfield`, `green`, `teal`, `cyan`, `blue`, `pink`, `dusk`, `stone`, `charcoal`
- Redesigned the color docs visualizations around the palette's two registers. The primitives page now groups families into hue-ordered vivid and muted sections with a single shared step header instead of per-swatch labels, hairline swatch rings (keeps dusk-900 visible on the dark canvas), click-to-copy CSS variables with an aria-live status pill, and `#family-<name>` deep links (scrolled manually — the shell's root `scroll-behavior: smooth` swallows native hash targeting). The color overview teaser swaps flat 500-step chips for tri-band (500/300/700) swatches with name and hue&deg;/sat% labels, linked to each family's anchor; also fixed the overview's strata numbers riding a spacing-ladder misread (`spacing-4` &asymp; 4rem circles)
- Docs editorial register cleanup. Docs theme now overrides the prose tokens (`theme/zebkit-docs/zbk-h1..h6|p|lede.tokens.json`): Instrument Serif at its native 400 for h1/h2 (no more synthesized faux-bold), Newsreader for h3–h5, mono uppercase instrument labels for h6, 65ch paragraph measure, and a real flow rhythm (`p-spacing-after: spacing-1`, heading before/after gaps). `editorial.css` rewritten: killed the double `font-size-md` application that inflated lists/tables/asides to ~125% of body copy, floats inline `<aside class="editorial-marginalia">` into the reserved rail Tufte-style at the full regime (inset sidenote below it), auto-adopts the lede treatment on each page's opening paragraph, and adds token-bound stopgap treatments for tables (mono uppercase headers, print-style rules), lists, code, blockquote, hr, and links
- Docs component/foundations register (`DefaultLayout`): replaced dead Tailwind-style utility classes and spacing-ladder misreads (`gap: spacing-4` ≈ 92px between every block, `h2 margin-top: spacing-8` ≈ 192px — zebkit's ladder is 1 = 1rem) with scoped token-bound rules; body and list text now ride the `--zbk-p-*` prose tokens
- Cleared all `npm audit` findings (was 35: 1 critical, 13 high). Safe transitive bumps plus dev/build-tooling majors: `inquirer` 10→14 (annotated the one `default` callback that lost cross-question inference), `esbuild` 0.23→0.25, `@rollup/plugin-terser` 0.4→1.0, and the doc-site toolchain `vite` 5→7 / `@sveltejs/vite-plugin-svelte` 4→6 / `@sveltejs/kit` + `adapter-static` refreshed. Added a `cookie` `^0.7.0` override (kit still pins the vulnerable `^0.6.0`) and dropped the obsolete `@types/inquirer` (v14 bundles its own types). No change to the published package runtime — all affected deps are dev/build/docs only
- Grouped the binding concept docs into `foundations/` — `VISION.md`, `GRAMMAR.md`, `COMPONENT-VISION.md` (root markdown is now just README/CHANGELOG/INSTALL/CLAUDE/AGENTS)
- Renamed the documentation-site directory `docs/` → `doc-site/`; updated every build, config, and CI path (npm workspace, token + hero-theme output dirs, agent-context and CLI copy paths, `svelte.config.js`, Vercel `outputDirectory`)
- Moved theme build configs next to their tokens in `theme/` (`zebkit.docs.config.json`, `dynamowaves.config.json`, `markdown.config.json`)
- Relocated internal working docs under `plans/` (`plans/docs-site/` for the docs build plan and design brief, `plans/NOTES.md`)

### Removed
- Completed `HANDOFF-*.md` coordination docs, stale compiled theme CSS, the generated `theme/zebkit-baseline/` reference set, the redundant nested docs `package-lock.json`, and the obsolete `.babelrc`

### Fixed
- Config files now fail fast on unknown keys with the full dotted path, valid keys, and a specific move or typo suggestion when one can be inferred, instead of silently ignoring the item and falling back to defaults
- Dead CSS variable references across the doc site that silently fell back to inherited values: `--zbk-app-ink-soft`/`--zbk-disabled-ink-soft` → `-subtle` (a dozen components incl. TopBar, LeftNav, Inspector, TokenTable), `--zbk-line-height-relaxed` → numbered scale, `--zbk-font-family-mono` → `-code`, `--zbk-radius-sm` → `--zbk-border-radius-sm`, `--zbk-action` → `--zbk-action-ink`, `--zbk-app-canvas-soft` → `-subtle`, `--zbk-font-size-base` → `-md`
- Removed `EditorialLayout`'s grid rail + `marginalia` snippet: mdsvex pages can't fill Svelte snippets, so the rail sat permanently empty while every inline aside stacked at 24ch inside the reading column (with a stray rail `padding-top` inflating the gaps around it)
- CI installed docs dependencies from a nested lockfile that no longer exists; the root `npm ci` covers the workspace, so that redundant step is removed
- Normalized a root-absolute manifesto link (`/foundations/VISION.md`) to a repo-relative path

### Added
- Three new primitive palette families filling the empty hue arcs (22 → 25 families): `lime` (96&deg;/65%, the yellow→green gap), `foxglove` (298&deg;/62%, magenta-orchid in the violet→merlot gap), and `chestnut` (26&deg;/42%, a true muted brown distinct from `stone`'s gray-tan). Each ships the full 50–950 step scale, CSS variables, and ink/canvas/border/fill/stroke utilities
- `zebkit.config.json` JSON Schema with property completion, hover descriptions, enum suggestions, and inline validation; `zebkit init` adds a portable `$schema` pointer, while repository theme configs use the tracked source schema
- Responsive docs "On this page" navigation: a sticky, backdrop-blurred reading lens shares the editorial marginalia rail without displacing notes, falling back to a focus-trapped anchored popover when the rail is too narrow and a bottom sheet only on compact viewports; section jumps scroll smoothly unless reduced motion is active, and the navbar accessibility popover now shares the same keyboard focus containment
- `.gitignore` rules for handoff docs, compiled theme CSS, the generated baseline reference, and local Claude settings

Road to 1.0:

- Rebuild `zbk-heading` to the GRAMMAR.md contract (the last pre-grammar component)
- Component wave Phase 1 (`plans/components/`): link, badge, tag, alert, progress, spinner, breadcrumb, disclosure, accordion, popover, dialog, menu
- Component wave Phase 2: combobox, toast, slider, table, pagination
- Dark-mode mechanism (the `*-inverse` app tokens exist; nothing toggles them yet)
- Per-component CSS/JS exclusion parity (`components` config should also shape the JS bundle)
- Docs: "For agents" prose, Cmd-K palette, accessibility audit, getting-started and config pages
- Prose token gaps: eyebrow, code/pre, link (see NOTES.md); table, list flow, blockquote/hr/figure, and marginalia/aside semantics (stopgapped with raw token references in `doc-site/src/styles/editorial.css`)
- Prose flow-spacing determinism: heading `spacing-before/after` sibling rules fight `.prose > * + p` / `.prose > p + *` at equal specificity, so the winner is a source-order coin flip — the docs re-wire the tokens unlayered in `editorial.css`; the generator needs a deterministic contract (wide tables also still clip on narrow viewports under `.app-main`'s `overflow-x: clip` — needs a scroll wrapper that keeps table semantics)
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
