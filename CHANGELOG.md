# Changelog

All notable changes to zebkit are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Pre-1.0: minor versions are feature waves, patches are additive follow-ups; no back-compat guarantees until 1.0.0.

> Versions below 0.8.0 are retroactive — reconstructed from git history on 2026-07-16 to give the road to 1.0 a baseline. The only number that ever appeared in `package.json` before this file existed was a jump from 0.0.1 to 0.7.0 on 2026-06-20, which anchors the numbering. Nothing has been published to npm yet.

## [Unreleased]

Primitive palette redesign plus repository housekeeping (the palette change affects the published CSS surface; the rest is internal structure/tooling):

### Added
- DTCG alignment Phase 0 (plans/dtcg-alignment/plan.md): golden CSS baseline harness. `npm run check:dtcg-baseline` rebuilds every representative artifact minify-off (docs base + six hero overlays, dynamowaves/mark-down/nudge-deck custom themes, one pruned build over a fixed fixture) and byte-compares against the checked-in snapshot in `plans/dtcg-alignment/baseline/`; `-- --update` re-baselines only after proving two consecutive builds are byte-identical. The runner also enforces the entry-order-shuffle invariant (reversing token module/entry order must derive an identical declaration set) and is wired into `npm run check` for the duration of the migration. Central DTCG definitions landed in `src/definitions/dtcg.ts`: the spec 2025.10 `$type` set, zebkit's proprietary type registry, the `dev.zebkit` `$extensions` vendor key, and the legacy-type migration table (locked decisions D3–D5) — data first, consumed by later phases
- `<zbk-pagination>` — page navigation for a partitioned collection (promoted from `plans/components/24-zbk-pagination.md`): a light-DOM `<nav aria-label="Pagination">` of page items with previous/next controls, `aria-current="page"` on the current page, and a windowed page display with non-interactive ellipses. Window is tunable via `siblings`/`boundaries` (default 1 each) and keeps a constant width of `boundaries*2 + siblings*2 + 3` items; an ellipsis never hides a single page. Dual navigation modes with one spelling per intent: `href-template="?page={page}"` renders real links (browser navigates, no event); without it items are buttons surfacing the library's first custom event, the cancelable `zbk-page-change` (uncanceled, the element adopts the page and announces "Page X of Y" via the shared live region). `compact` renders previous/next around a "Page X of Y" readout. Disabled prev/next stay focusable via `aria-disabled` in button mode and drop their `href` in link mode; drawn chevron glyphs are replaceable through the shared `icon` slot (`data-position="start|end"`). Ships the full grammar kit: 36-token surface with the `-selected` semantic state bound to `aria-current`, `sm`/`lg` size variants, manifest + generated slot contract + agent context, docs page, and the hide-until-upgraded listing
- Docs home page narrative build-out around the reskin centerpiece: six numbered, anchor-linkable sections — premise, mechanism, proof, dials, grammar, field guide. New `TokenChain` demo walks the shipped primitive→alias→component→paint chain (`--zbk-color-ember-600` → `--zbk-action-ink` → `--zbk-button-ink` → a live `<zbk-button>`) and lets visitors swap the brand primitive by token reference only (`--zbk-color-ember-hue/saturation` re-pointed at other palette families). The dials section embeds the live `A11yDials` on the page itself (same controls as the TopBar — no demo frame); the grammar section renders a conjugation table of real shipped spellings across button/input/select with links to all eight component pages and an agents callout surfacing `/llms.txt`; the field guide indexes every major docs destination (foundations, reference, tooling)

### Changed
- DTCG alignment Phase 2a step 3 (plans/dtcg-alignment/plan.md): build-time settings stopped being pseudo-tokens. The `setting` token type is gone; fluid-scale controls (font-size viewport anchors/bases/ratios, spacing `max-scale`) are group-level `$extensions["dev.zebkit"].scale` metadata — authored via a named `extensions` export on the token module, carried as a `$extensions` member in JSON snapshots/exports, and overridden via a top-level `$extensions` member in theme override documents (a new merge path that records overridden control names for overlay re-emission). Generated font-size steps moved their `index` under the entry's `$extensions["dev.zebkit"].scale`. Both resolvers read controls from the group metadata; `zebkit pull` round-trips the `$extensions` block into consumer files; editor override schemas gained the group-level `$extensions` property; the two docs-theme control files migrated to the new form. Also swept all 15 theme files that carried stale legacy `$type` names on entries retyped to `cssDimension` in step 1 (the merge always kept `$type` base-controlled, so emitted CSS never saw them — but the editor schemas validate the documents). Emitted CSS is byte-identical to the golden baseline
- DTCG alignment Phase 2a step 2 (plans/dtcg-alignment/plan.md): px/rem length literals are now structured DTCG dimension values — all 61 source-module literals (`spacing` floors, breakpoints, letter-spacing, a11y minimum size, component field sizing) author `{value, unit}` objects instead of strings. A canonical serializer (`serializeDimensionValue` — magnitudes below 1 drop the leading zero, matching the corpus-audited authored form) feeds every emission path: the CSS converter, both fluid-scale resolvers (structured floors reproduce today's `clamp()` strings exactly), the SCSS breakpoint map, variant closure re-emission, agent-context tables, and the docs token tables. Override merge, editor override schemas, and `zebkit pull` accept both string and structured values; theme override files deliberately keep raw strings (the corpus audit found mixed `0.75rem`/`.75rem` formatting that no single canonical form can reproduce — recorded in the phase-2a worknote, deferred to Phase 3). Emitted CSS is byte-identical to the golden baseline
- DTCG alignment Phase 2a step 1 (plans/dtcg-alignment/plan.md): the proprietary `cssDimension` token type is live — CSS sizing values DTCG's `dimension` can't express (`%`, `ch`, `em`, `calc()`, the keywords `auto`/`none`, unitless `0`). The 28 non-px/rem length literals moved onto it (text-measure `ch` scale, component `auto`/`none`/`0`/`100%` sizing entries, `1em`/`0.75em`/`0.5em` indicator sizes, the three `50%` radii); px/rem literals keep their legacy types until the D5 collapse. Registered in the type enum, the compatibility map (length-family types can reference `cssDimension` targets and vice versa), and the D5 migration table; emitted CSS is byte-identical to the golden baseline
- DTCG alignment Phase 1 (plans/dtcg-alignment/plan.md): every token entry now uses the DTCG field shape — `value`/`type`/`description` became `$value`/`$type`/`$description`, and zebkit-specific metadata moved under `$extensions["dev.zebkit"]` (`a11y` modifier opt-in; font-loading metadata `source`/`fallback`/`weights`/`styles`/`faces`/`display` under a `font` sub-key). Applied by a checked-in codemod (`scripts/codemod-dtcg-shape.ts`, deleted at the end of the migration) across all 48 token modules, 198 theme override files, and test fixtures; every shape consumer migrated (token converter, fluid scale resolvers, override merge — including the bare-`$value` shorthand — variant CSS emission, prune seeding, editor schema generator, agent context, CLI pull, docs data layer). Emitted CSS is byte-identical to the pre-migration golden baseline; generated editor schemas and exported token JSON artifacts carry the new shape
- Doc-site token tables (`TokenTable.svelte` — every component page plus the token catalog) now paginate through a live `<zbk-pagination variant="sm">` at a default page size of 10, with a "X–Y of Z tokens" readout; the pager only renders when rows exceed one page and clamps when the catalog's search/type filters shrink the row set mid-page
- The doc-site now registers zebkit custom elements once from the root layout (`ZebkitLoader` moved out of `ComponentLayout`/`TokenChain`/`HeroReskin`) — previously pages outside those surfaces, like the token catalog, never upgraded zebkit elements
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
- `zebkit pull` now materializes the included shipped component variants as editable `zbk-<component>.variants.json` files in `tokens.tokenPath`, respects component/variant allowlists and base-preset patches, and safely reconciles untouched variant defaults without overwriting custom values
- Docs home now yields at compact widths instead of preserving an oversized flex
  min-content column: the shell uses the generated `min-width-0` utility, the
  hero type steps through responsive type utilities, and the runtime/field-guide
  grids progress explicitly from one to two to three shrinkable tracks.
- Token editor schemas now enforce one user-editable format: unwrapped `zbk-*.tokens.json` files created by `zebkit init`, maintained by `zebkit pull`, and used by repository themes; valid font metadata and type-scale entries no longer produce false diagnostics
- Config files now fail fast on unknown keys with the full dotted path, valid keys, and a specific move or typo suggestion when one can be inferred, instead of silently ignoring the item and falling back to defaults
- Dead CSS variable references across the doc site that silently fell back to inherited values: `--zbk-app-ink-soft`/`--zbk-disabled-ink-soft` → `-subtle` (a dozen components incl. TopBar, LeftNav, Inspector, TokenTable), `--zbk-line-height-relaxed` → numbered scale, `--zbk-font-family-mono` → `-code`, `--zbk-radius-sm` → `--zbk-border-radius-sm`, `--zbk-action` → `--zbk-action-ink`, `--zbk-app-canvas-soft` → `-subtle` (including two stragglers in `HeroReskin`'s section cards and diff strip), `--zbk-font-size-base` → `-md`; follow-up sweep caught the rest of the old `soft`/`strong` intensity vocabulary: `*-canvas-soft`/`*-ink-inverse-soft` → `-subtle` and `*-canvas-strong`/`*-border-strong` → `-emphasis` vars (TopBar, Inspector, HeroReskin, PrimitivePalette, SemanticColorFamily, color index page), dead `canvas-app-soft`/`ink-app-strong`/`canvas-*-strong` utility classes → `-subtle`/`-emphasis`, and a `--zbk-spacing-075` fallback chain in `HeroReskin` simplified to the real `--zbk-spacing-05`. Also repaired `color-families.ts`'s semantic-slot regex and `ColorIntensity` type (`soft|muted|strong` → `subtle|muted|emphasis`), which had silently emptied `semanticColorFamilies` — the color page's "Semantic families" section and its per-family routes render again. Follow-up: extended the `DefaultLayout` dead-class treatment to the remaining demo surfaces — Tailwind-style classes zebkit never generates (`flex`, `flex-col`, `items-center`, `justify-between`, `grid`, `block`, `p-4`, `px-4 py-2`, `mb-1`, `h-10`, `w-full`, `rounded`/`rounded-lg`, `border`/`border-2`, `font-semibold`/`font-medium`, `text-base`, `uppercase`, `break-all`, `select-none`) swapped for the real generated utilities at Tailwind-intent sizes (`display-flex`, `flex-direction-column`, `align-items-center`, `justify-content-between`, `display-grid`, `display-block`, `padding-1`, `padding-inline-1 padding-block-05`, `margin-block-end-025`, `height-205`, `width-full`, `radius-sm`/`radius-md`, `border-solid border-width-xs`/`border-width-sm`, `text-semibold`/`text-medium`, `text-md`, `text-uppercase`, `word-break-all`, `user-select-none`) across `AgentContext`, `ButtonShowcase`, `TokenLookupDemo`, `TokenPlayground`, `Sidebar`, and the seven component demo pages (which also still carried `canvas-app-soft`/`ink-app-strong` stragglers → `-subtle`/`-emphasis`); hover transitions and per-side borders, which have no utility spelling, became scoped token-bound rules — restoring Sidebar's never-painted right border and active-link rail (its `border-width-*` classes had no border-style, and `border-width-right-2xs` isn't a real size). Also corrected the scaling guide's utility example (`p-2` → `padding-2`)
- Removed `EditorialLayout`'s grid rail + `marginalia` snippet: mdsvex pages can't fill Svelte snippets, so the rail sat permanently empty while every inline aside stacked at 24ch inside the reading column (with a stray rail `padding-top` inflating the gaps around it)
- CI installed docs dependencies from a nested lockfile that no longer exists; the root `npm ci` covers the workspace, so that redundant step is removed
- Normalized a root-absolute manifesto link (`/foundations/VISION.md`) to a repo-relative path

### Added
- DTCG alignment proposal under `plans/dtcg-alignment/`: findings/review (gap analysis against the stable 2025.10 Design Tokens Format Module, level of effort, pros/cons, considerations) and a drift-proof phased implementation plan with output-invariance gates. Assessment only — no token format changes yet
- Rotating homepage eyebrow that starts from a random manifesto line, types through an easily editable collection, and becomes static when reduced motion is enabled
- Homepage morph track: a slow, asynchronous, token-colored procession of minimalist geometric primitives and recognizable UI forms that flexes between the hero headline and viewport-bottom call to action, with a composed reduced-motion state
- Three new primitive palette families filling the empty hue arcs (22 → 25 families): `lime` (96&deg;/65%, the yellow→green gap), `foxglove` (298&deg;/62%, magenta-orchid in the violet→merlot gap), and `chestnut` (26&deg;/42%, a true muted brown distinct from `stone`'s gray-tan). Each ships the full 50–950 step scale, CSS variables, and ink/canvas/border/fill/stroke utilities
- `zebkit.config.json` JSON Schema with property completion, hover descriptions, enum suggestions, and inline validation; `zebkit init` adds a portable `$schema` pointer, while repository theme configs use the tracked source schema
- Hardened `zebkit pull`: config validation, committed default-hash baselines, safe untouched-default updates and retirements, refreshed editor schemas/context, and compiled-CLI integration coverage
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
