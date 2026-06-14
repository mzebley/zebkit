# Zebkit Docs — Build Plan

> Companion to [DOCS-DESIGN-BRIEF.md](DOCS-DESIGN-BRIEF.md). This plan is written to be executed **task-by-task by a coding agent** (Haiku-tier is fine). Tasks are small, ordered, and self-contained, with explicit files, a definition of done, and a verify step. Do them in order; do not skip ahead.
>
> The old `ASTRO-TO-SVELTE-MIGRATION-PLAN.md` is **non-binding** and largely superseded. Reuse only what this plan explicitly points to.

---

## Agent execution protocol (read before starting)

1. **One task at a time, in order.** After each task, run its verify step. If it fails, fix it before moving on. If you can't, stop and report — do not invent a workaround.
2. **Token-bound only.** Never write a hard-coded color/size/radius/font value, even in CSS. Use a zebkit utility class, or bind a zebkit CSS variable (`var(--zbk-…)`). If no utility or token exists for what you need, **stop and log it** in a `### Gaps found` section at the bottom of this file — do not hard-code.
3. **Sources of truth:** token values come from `static/zebkit/*.json` (synced from the build); utility info comes from `src/core/styles/utility-classes/*.utilities.manifest.json`. Never hand-transcribe values.
4. **Svelte 5 + runes only** (see cheat-sheet below). Do not mix in Svelte 4 `export let` / `on:click` / stores syntax.
5. **Checkpoints:** each Phase ends with a checkpoint. At a checkpoint, `npm run build` (in `docs/`) and `npm run check` (repo root) must both pass. **A green build does NOT prove your tokens resolve** — an invalid `var(--zbk-…)` with no fallback is silently dropped, not an error. When you reference zebkit tokens in CSS, verify each name actually exists in `docs/static/zebkit/zbk-default.min.css` (`grep -- "--zbk-foo:"`); don't assume.
6. **Don't author "for agents" prose** (Phase 7) — build the structure/wiring only and leave content as clearly-marked TODO.
7. **Stay inside `docs/`.** All your edits live under `docs/` only. If a build failure traces to a file outside `docs/` (e.g. `src/core/**`), **STOP and report it as a blocker** in your summary — do not edit core/library source. That code is mid-refactor and owned by Mark; an out-of-scope "fix" can collide with his work.

### Svelte 5 idiom cheat-sheet
```svelte
<script lang="ts">
  let { title, rows = [] }: { title: string; rows?: Row[] } = $props();  // props
  let open = $state(false);                                              // local state
  let count = $derived(rows.length);                                     // derived
  $effect(() => { /* side effects */ });                                 // effects
</script>
<button onclick={() => (open = !open)}>{title}</button>                  <!-- events: onclick, not on:click -->
```
Shared/global state lives in a `.svelte.ts` module exporting `$state` objects (see Task 1.3).

---

## Phase 0 — Clean slate

The `docs/` dir is half-migrated (Astro + SvelteKit files coexist). Reset to one clean SvelteKit app.

### T0.1 — Remove Astro remnants
- **Delete:** `docs/astro.config.mjs`, `docs/src/content/` (whole tree), `docs/src/components/*.astro`, `docs/src/data/` and `docs/src/utils/` (the `src/lib/` copies are canonical — keep those), and any `@astrojs/*` / `starlight` / `rapide` entries in `docs/package.json`.
- **Done when:** `find docs/src -name '*.astro'` returns nothing; `grep -i astro docs/package.json` returns nothing.
- **Verify:** `find docs/src -name '*.astro' | wc -l` → `0`.

### T0.2 — SvelteKit skeleton boots (Svelte 5)
- **Files:** `docs/svelte.config.js` (mdsvex + `adapter-static` + Svelte 5 preprocess), `docs/vite.config.ts` (aliases: `$components`, `$layouts`, `$lib`, `$data`, `$utils`, and `$definitions` → `../src/definitions`), `docs/src/app.html`, `docs/src/routes/+layout.svelte` (imports `app.css`, renders `{@render children()}`), `docs/src/routes/+page.svelte` ("hello").
- **mdsvex:** extensions `['.svelte','.md']`; map layouts by name (filled in Phase 3).
- **Adapter:** `adapter-static`, `prerender = true` in root `+layout.ts`.
- **Done when:** dev server serves the page and a production build succeeds.
- **Verify:** `cd docs && npm run dev` (loads), then `npm run build` (exits 0).

### T0.3 — Token sync prebuild (reuse from old setup — solid gold)
- Wire `predev`/`prebuild` scripts in `docs/package.json` to a `sync:tokens` step that builds zebkit tokens with `zebkit.docs.config.json` and copies `zbk-default.min.css`, `zebkit.js`, `default-tokens.json`, `token-lookup.json`, `allowed-token-types.json` into `docs/static/zebkit/`.
- **Done when:** after a fresh `npm run dev`, `docs/static/zebkit/token-lookup.json` exists and is current.
- **Verify:** `ls docs/static/zebkit/` shows the five files.

> **Checkpoint 0:** clean SvelteKit app boots, builds, and has synced tokens.

---

## Phase 1 — The docs theme (aesthetic foundation)

This phase makes the site *look* like the brief. Per §2 of the brief, the look is a **zebkit token set + utilities** — the site is itself a zebkit theme.

### T1.1 — Load the three typefaces
- Add Fraunces, Atkinson Hyperlegible Next, IBM Plex Mono (self-host in `docs/static/fonts/` preferred; Google Fonts acceptable). Wire `@font-face` / link in `app.html` or `app.css`.
- **Done when:** all three render on the hello page.
- **Verify:** visual check; computed `font-family` matches.

### T1.2 — The docs base theme = a real zebkit theme config (supersedes the interim `app.css` overrides) — ✓ DONE (Claude)
> Implemented as a **full theme suite** in `theme/zebkit-docs/`: `font-family` (Newsreader / Instrument Serif / Space Mono), `app` (warm butterfield canvas + dusk ink + hairline dusk borders — fixes the empty-border gap), `accent-primary` → **ember** (warm rust — the single restrained interactive accent; flows to button borders + focus), `accent-secondary` → sea, `brand` → butterfield, `neutral` → stone, `focus` → ember ring, and editorial type scales (`font-size` incl. 5xl=6rem hero display, `line-height`, `text-measure` 3=65ch). `zebkit.docs.config.json` sets `customTokenPath: "./theme/zebkit-docs"` (base stays `default`, filename unchanged). `app.css` stripped to resets; self-hosted fonts removed (Google Fonts via tokens). `editorial.css` measure now token-driven (`text-measure-3`). Status colors / action / button / spacing / a11y intentionally left at zebkit defaults (functional, not part of the neutral-chrome identity). `npm run check` green. See Gaps re: self-hosting.
> The docs site is itself a zebkit theme — built the way a consumer builds, not by hand-overriding vars. **Core/theme-authoring work, not Haiku-scoped** (`theme/` is at the repo root).
- **Author** `theme/zebkit-docs/*.tokens.json` with the docs' real token values: font families (display = Instrument Serif, body = Newsreader, mono = Space Mono), warm-neutral `app`/`canvas`/`ink`, etc. Model on the existing `theme/dynamowaves/` set.
- **Point** `zebkit.docs.config.json` at `theme: "custom"`, `customTokenPath: "./theme/zebkit-docs"`, `customThemeName: "zebkit-docs"`, and emit the compiled CSS into `docs/static/zebkit/`.
- **Delete** the `:root { --zbk-font-family-…: … }` override block from `docs/src/app.css`. Keep only the `@font-face` declarations (those load the font *files*; the token names the family).
- **Done when:** the docs look comes entirely from the compiled theme CSS — no manual var overrides remain — and `/styleguide` still renders correctly.
- **Verify:** `grep -c "font-family-primary" docs/src/app.css` → `0`; computed fonts/colors match on `/styleguide`.

### T1.3 — Theme + a11y runtime store
- **File:** `docs/src/lib/stores/theme.svelte.ts`. Export `$state` for: `reskinTheme` (hero only), `fontScale`, `contrast`, `density`, `reducedMotion`. Export functions that apply the a11y dials to `document.documentElement` by setting the relevant zebkit **a11y tokens** (the ones flagged `a11y` in token modules) via `style.setProperty`.
- **Done when:** calling `setFontScale(1.25)` from the console visibly enlarges reading text site-wide.
- **Verify:** manual; assert the CSS var changes on `:root`.

### T1.4 — Editorial typographic primitives
- **File:** `docs/src/styles/editorial.css` (scoped, imported by `EditorialLayout`). Baseline rhythm, comfortable measure (`max-inline-size`), an asymmetric grid with a **marginalia column** for sidenotes, optional drop-cap. **Every value binds a zebkit token** (spacing/typography); log any that can't.
- **Done when:** a test narrative page shows the magazine grid (wide main column + margin notes), big Fraunces heads, generous leading.
- **Verify:** visual on `/styleguide`.

> **Checkpoint 1:** the site has its identity; a11y dials move real tokens; editorial primitives exist.

---

## Phase 2 — Shell

### T2.1 — TopBar
- **File:** `docs/src/lib/components/TopBar.svelte`. Contains: wordmark (mono), Cmd-K trigger (opens an empty palette modal for now — wired in Phase 8), `A11yDials` popover (Task 2.1a). The active **reskin** indicator is NOT here (hero-local). **Light/dark toggle is deferred** — zebkit has no dark-mode mechanism yet (the `app` `*-inverse` tokens exist but nothing toggles them); leave a placeholder slot if convenient but do not implement dark theming or invent a mechanism. Log it as a gap, like contrast.
- **T2.1a `A11yDials.svelte`:** sliders/toggles for fontScale, density, reducedMotion bound to the Task 1.3 store. Keyboard-operable, labelled. **Contrast is intentionally cut for now** — historically high-contrast is its own theme, not a runtime override; it'll be revisited as a `theme/<name>` config (and likely a scoped-theme application) later. Do not build a contrast control; leave the store's `contrast` field inert.
- **Done when:** dials in the bar reflow the site live.
- **Verify:** drag fontScale → text scales; tab-navigation reaches every control.

### T2.2 — LeftNav
- **File:** `docs/src/lib/components/LeftNav.svelte`, data from `docs/src/lib/data/navigation.ts` (restructure to brief §7 IA: Home, Foundations, Tokens, Components, Utilities, Theming, For Agents). Collapsible sections, active-route highlighting.
- **Done when:** all sections render, active item is marked, collapse works.
- **Verify:** click through; active state correct on each route.

### T2.3 — Layout variants
- **Files:** `docs/src/lib/layouts/EditorialLayout.svelte` (uses `editorial.css`, marginalia, display heads) and `docs/src/lib/layouts/ReferenceLayout.svelte` (dense, with a right **inspector rail** slot). Both compose `TopBar` + `LeftNav` from the root layout.
- **Done when:** an editorial route and a reference route render visibly different page furniture.
- **Verify:** visual side-by-side.

> **Checkpoint 2:** navigable shell; two distinct layouts; working a11y dials. — ✓ DONE (Claude, 2026-06-13). Note: font-scale dial rewired to per-tier non-linear modifiers (single fallback modifier was a dead token); a11y popover made operable (Esc/click-outside/focus return); contrast dial deferred. Shell ownership corrected in Phase 3.

---

## Phase 3 — Content engine

### T3.1 — mdsvex + frontmatter
- Configure mdsvex to resolve layouts by a frontmatter `layout` field (`editorial` | `reference`, default `editorial`). Define a TS type for frontmatter: `{ title, description, layout, section, status }`.
- **Done when:** a `.md` file with `layout: reference` renders inside `ReferenceLayout`.
- **Verify:** create `docs/src/routes/_sample-reference/+page.md` and confirm.

### T3.2 — Sample pages prove both registers
- Author one narrative `.md` (editorial) and one reference `.md`, exercising headings, marginalia, code/token spans, and a table.
- **Done when:** both render with correct type hierarchy and layout.
- **Verify:** visual; `npm run build` still passes.

> **Checkpoint 3:** content authored in markdown lands in the right register automatically. — ✓ DONE (Claude, 2026-06-13). mdsvex resolves `layout` frontmatter (default editorial); `Frontmatter` type at `docs/src/lib/types/frontmatter.ts`. Shell (TopBar+LeftNav) moved into root `+layout.svelte`; Editorial/Reference are now content-only registers (Phase 2 had bundled the shell, which would double it per-page). Samples: `_sample-editorial`, `_sample-reference`.

---

## Phase 4 — Generators (reuse existing logic — solid gold)

All catalog pages are **generated from sources of truth**, never hand-written.

### T4.1 — Token catalog
- **Reuse:** existing `docs/src/lib/utils/token-docs.ts`, `token-lookup.ts`, `docs/src/lib/data/token-rows.ts`, `compiled-tokens.ts`. Build a load function that reads `static/zebkit/default-tokens.json` + `token-lookup.json`.
- **Components:** `TokenTable.svelte` (restyle the old one to the brief — mono values, hairline rows, swatch for color types) and `TokenCatalog.svelte` (browsable/filterable, instrument register).
- **Routes:** `/foundations/tokens` (narrative intro, editorial) + `/tokens` (catalog, reference).
- **Done when:** the catalog lists real tokens with values + swatches, filterable.
- **Verify:** spot-check 3 tokens against `default-tokens.json`.

### T4.2 — Color family pages (reuse dynamic-route idea)
- **Reuse:** `palette-map.ts`, `foundation-colors.ts`. Dynamic route `docs/src/routes/foundations/color/[family]/+page.ts` with `entries()` enumerating families; `ColorFamily.svelte` renders the ramp with contrast info.
- **Done when:** all family pages prerender and show swatches + token names.
- **Verify:** `npm run build` lists each family route; visit two.

### T4.3 — Utility catalog from manifests
- **Source:** `src/core/styles/utility-classes/*.utilities.manifest.json` (read at build time via a load function). Each manifest family has `name`, `description`, `properties`, optional `guidance`, `a11y`, and a `pattern`/`classes` grammar.
- **Component:** `UtilityTable.svelte` — render the family's full **vocabulary** (expand `pattern` to class names; you may import the expander at `src/scripts/utilities/expand.ts`) and render `guidance` as ranked annotations. (Per VISION: vocabulary = `values`, rhetoric = `guidance`. If/when guidance gains recommended/situational/discouraged tiers, render them as such; for now render guidance text plainly.)
- **Routes:** `/utilities` overview + a page per manifest family.
- **Banner:** show "Generated from the linted manifest — verified on every build" (lean into the no-drift guarantee).
- **Done when:** a utility page (e.g. margin) renders its real class set + guidance straight from the manifest.
- **Verify:** class list matches `npm run generate:utilities -- --check` output for that family.

> **Checkpoint 4:** tokens, colors, and utilities are all generated from source and cannot drift. — ✓ DONE (Claude, 2026-06-13). `$core` alias added → `../src/core`. T4.1 `TokenTable` (runes/brief), `TokenCatalog` (filterable) at `/tokens` + `/foundations/tokens`. T4.2 `ColorFamily` + dynamic `/foundations/color/[family]` (4 ramps; status groups excluded as non-ramps). T4.3 `UtilityTable` + `/utilities` + `/utilities/[family]` (10 families) from manifests via `$core`; expansion derives token values + literals + neg mirror + edges + hover. **Parity verified byte-exact: margin = 385 base classes, 0 diff vs generated CSS** (core deriver NOT imported — docs isolation kept). `navigation.ts` regenerated from source. Build green; not re-run full root `npm run check` (jest/utilities lint unaffected by docs-only changes).

---

## Phase C — Core prerequisite: scoped-theme support (zebkit, NOT docs — owned by Mark/Claude)
> Required before the hero themes (Phase 5). This is a `src/core`/`src/scripts` change in Mark's refactor zone — **do not assign to Haiku.** It also makes "theme a subtree" a real zebkit capability the docs then document.

### TC.1 — `rootSelector` option on the token compiler — ✓ DONE (Claude)
> Implemented: `rootSelector?: string` on `TokensConfig` (`src/scripts/config.ts`), threaded into `convertTokensToCssVars` and the palette-globals block in `build-tokens.ts`. Defaults to `:root` (backward-compatible); primitive color ramps stay global, token layer scopes. Unit test in `src/scripts/tokens/token-converter.test.ts` (+ a `chalk` jest mock so token modules are testable). Smoke-tested end-to-end. `npm run check` green.
- Add an optional `rootSelector` to `TokensConfig` (`src/scripts/config.ts`). When set, the token compiler emits CSS variables (and the palette-globals block, currently `:root {` in `build-tokens.ts`) under that selector instead of `:root` — e.g. `[data-zbk-theme="brutalist"] { --zbk-…: … }`.
- Default (unset) = current `:root` behavior; fully backward-compatible.
- **Done when:** a config with `rootSelector: '[data-zbk-theme="x"]'` produces theme CSS scoped to that selector; existing default builds are byte-unchanged.
- **Verify:** add a unit test in `src/scripts/tokens/`; run `npm run check`.

---

## Phase 5 — The Reskin hero (signature)

### T5.1 — Hero theme configs (real compiled zebkit themes) — *core/theme-authoring, not Haiku-scoped*
- Author one theme per preset under `theme/zebkit-hero-<name>/*.tokens.json` (`Swiss`, `Brutalist`, `Terminal`, `Editorial`; `Swiss` = clean baseline). Each is a real token-value set covering color, radius, spacing/density, and type.
- A config per theme (or one orchestrated build) sets `theme: custom`, `customTokenPath`, and **`rootSelector: '[data-zbk-theme="<name>"]'`** (from TC.1), emitting scoped CSS into `docs/static/zebkit/themes/<name>.css`. The docs token-sync step compiles all of them.
- **Done when:** each theme's compiled CSS defines its `--zbk-*` vars under its `[data-zbk-theme]` selector only.
- **Verify:** `grep ':root' docs/static/zebkit/themes/brutalist.css` → none; the scoped selector is present.

### T5.2 — `HeroReskin.svelte` (toggles a theme, no JS var-setting)
- A hero root element with `data-zbk-theme={active}`; the scoped theme CSS files are loaded once, and switching the attribute swaps the whole theme **via pure CSS inheritance** — no `setProperty`. Inside it, a **rich composition built only from zebkit components + utilities**: app nav, 2 cards, a form, a small data table, buttons, badges, a type specimen, a chart placeholder.
- Preset switcher (named chips). A **token-diff panel** listing which token values changed vs. the base theme (read from the theme token sets). Transitions use zebkit transition tokens; honor `reducedMotion`. **Zero layout shift** between presets.
- Make it tall and impressive — do **not** constrain to above-the-fold.
- Caption: "Same HTML. Same classes. Only the tokens changed."
- **Done when:** clicking presets re-skins the hero with no reflow; diff panel updates.
- **Verify:** toggle all presets; confirm no layout jump (compare element box rects) and that only `data-zbk-theme` changed in the DOM.

### T5.3 — Mount on Home
- Home = `EditorialLayout`: manifesto-voice pitch (Fraunces display) + `HeroReskin` as the centerpiece.
- **Verify:** `/` renders pitch + working hero.

> **Checkpoint 5:** the headline demo works and is the hero of the homepage. — ✓ DONE (Claude, 2026-06-13). **T5.1:** four real scoped themes — `theme/zebkit-hero-{swiss,brutalist,terminal,editorial}/` (Swiss = clean baseline). Each overrides app surface, accent-primary/secondary ramps, font-family, and border radius (value-only merge, on the `default` base — independent of the docs chrome theme). Compiled by a NEW orchestrator `src/scripts/tokens/build-hero-themes.ts` (`npm run build:hero-themes`, wired into docs `sync:tokens`) that emits **only the scoped token layer** via `convertTokensToCssVars(tokens, { selector: '[data-zbk-theme="<name>"]' })` → `docs/static/zebkit/themes/<name>.css`. No `:root`, no palette ramps, no utilities duplicated — token refs resolve to `var(--zbk-color-*)` which already exist globally in `zbk-default.min.css`, so re-skin is pure inheritance. **Verified:** `grep ':root' themes/*.css` → 0; scoped selector present; ~38KB/file. **T5.2:** `HeroReskin.svelte` — loads the 4 theme CSS once via `<svelte:head>`, themed subtree toggles `data-zbk-theme` (no JS `setProperty`), rich composition (app nav, type specimen, 2 cards, form, data table, chart bars, badges, `zbk-button`s) built only from zebkit utilities + token-bound scoped CSS. Keyboard-operable preset chips (`aria-pressed`); token-diff panel reads the generated `hero-themes.json` (same source files the CSS was built from — can't drift); transitions bind `--zbk-transition-duration-*` (auto-honors reduced-motion via the a11y modifier) + a `prefers-reduced-motion` guard. **T5.3:** Home (`/`) = manifesto pitch in `EditorialLayout` ("Change everything. Rewrite nothing.") + `HeroReskin` as the full-width centerpiece (hero sits outside the editorial reading-measure so it isn't cramped). `npm run build` (docs) + `npm run type-check` green; hero + 4 theme links + diff panel + caption confirmed in prerendered `build/index.html`.

---

## Phase 6 — Component docs pattern

### T6.1 — `ComponentLayout.svelte`
- Sections, in order: **live themeable instance** → **HTML contract block** (the unchanging skeleton, presented as the stable thing) → **token-surface table** (the component's `--zbk-<component>-*` tokens) → **guidance** → **`CopyForAgent`** (Phase 7 stub) → **`UnstyledToggle`** (raw ↔ themed).
- **Done when:** the layout renders all sections from props/slots.

### T6.2 — Button exemplar
- **Reuse:** `button-docs.ts`, `ButtonShowcase.svelte` (restyle to brief). Route `/components/button`.
- **Done when:** button page shows contract + token surface + live instance + unstyled toggle.
- **Verify:** toggle unstyled → button renders as "an unanswered question"; themed → restored.

> **Checkpoint 6:** the component documentation pattern is proven on Button.

---

## Phase 7 — "For Agents" skeleton (structure only — no final prose)

> Build the wiring and leave content as `TODO`. There will be a dedicated push to write the artifacts before public launch — do not spend effort on phrasing now.

### T7.1 — `buildAgentBundle()` util
- **File:** `docs/src/lib/utils/agent-bundle.ts`. Given a page's metadata, return a structured object: `{ contract, tokenSurface, guidance, usage }`. Populate from the same sources the page uses (manifests/token data). **Shape is the deliverable; content can be rough/TODO.**
- **Component:** `CopyForAgent.svelte` — button that serializes the bundle to the clipboard.
- **Done when:** clicking copies a structured payload for the current page.
- **Verify:** paste shows the object with the four keys populated (even if values are placeholders).

### T7.2 — `/agents` route + `llms.txt` build step
- Add a `/agents` route (skeleton: explains the machine-readable surface — `TODO` content).
- Add a build step that emits `static/llms.txt` (or `build/llms.txt`) enumerating routes/sections. Content can be a generated index for now; **final copy is later.**
- **Done when:** route exists; build emits the file.
- **Verify:** `ls build/llms.txt` after build; `/agents` renders.

> **Checkpoint 7:** the agentic-delivery skeleton is in place and clearly marked TODO.

---

## Phase 8 — Search, polish, ship

### T8.1 — Cmd-K palette
- Build a build-time search index (pages from frontmatter + token names + utility class names) → client-side filter in the palette opened by the TopBar Cmd-K trigger. Promote `TokenLookup` into the palette. (Fallback if blocked: Pagefind over the built site.)
- **Verify:** Cmd-K opens; typing a token name jumps to it.

### T8.2 — Polish & a11y audit
- Prerender all routes (`adapter-static`), add 404 + meta/OG. Run an accessibility pass: full keyboard nav, focus visibility, contrast, and confirm `reducedMotion` actually suppresses motion (dogfoods the transition tokens).
- **Verify:** keyboard-only walkthrough; reduced-motion on → reskin/hover transitions degrade gracefully.

### T8.3 — Deploy config (Vercel)
- Fully prerendered static output via `adapter-static` (output `build/`). Deploy on **Vercel**: set the project root to `docs/`, build command `npm run build`, output dir `build/`. Token sync runs in `prebuild`, so Vercel's build picks it up automatically.
- Stage on the default **`zebkit.vercel.app`** preview/production URL first; the custom domain **`zebkit.markzebley.com`** gets wired afterward (add it in Vercel project settings → Domains; no code change needed).
- **Verify:** `npm run build && npm run preview` serves the full site locally; the Vercel deployment serves at `zebkit.vercel.app`.

> **Checkpoint 8:** shippable static site.

---

## Build order summary
Phase 0 (clean) → 1 (theme) → 2 (shell) → 3 (content) → 4 (generators) → **C (core: rootSelector — Mark/Claude, before hero)** → 5 (hero) → 6 (components) → 7 (agents skeleton) → 8 (search/polish/ship). Each checkpoint must pass `npm run build` (docs) and `npm run check` (root) before proceeding.

**Labor split:** Haiku handles `docs/`-only tasks (shell, content, generators, component UI, HeroReskin component, search). Tasks marked *core/theme-authoring* (T1.2 theme config, Phase C, T5.1 hero themes) live outside `docs/` and are owned by Mark/Claude.

---

### Gaps found
_(Agents: append any missing-utility / missing-token findings here instead of hard-coding. Each: what you needed, where, and the closest existing token/utility.)_

- ~~**[Phase 1] Type scale has no display-large step.**~~ RESOLVED: Mark added `4xl`/`5xl` to the core type-scale module; the docs theme now sets them (`5xl` = 6rem hero display). Page h1 stays `3xl`; hero uses the larger steps.
- **[Phase 1] `--zbk-app-border` and `--zbk-app-border-muted` are both empty** in the default theme (no value). Any border bound to them renders colorless. Editorial/instrument surfaces will need a real app-border token value.
- **[Phase 1] Contrast deferred (not a gap to fix).** The theme store carries an inert `contrast` field; the contrast dial is intentionally cut (see T2.1a). High-contrast will be designed later as its own `theme/<name>` config rather than a runtime modifier — no contrast token is needed for now.

_Note: three broken token references in `editorial.css` (`--zbk-font-size-base`→`-md`, `--zbk-font-size-4xl`→`-3xl`, `--zbk-radius-sm`→`--zbk-border-radius-sm`) were naming bugs (correct tokens existed), fixed during Phase 1 review — not zebkit gaps._

- **[Theme override mechanism] `mergeTokens` is value-only.** The `customTokenPath` override layer only replaces an existing token's `value` — it **ignores new keys** ("Extra key … Ignoring") and **cannot change a token's `type`**. Consequences: (a) extending the type scale (the `4xl`/`5xl` gap above) requires editing the core font-size token module, not a theme override; (b) a theme cannot switch a font token from Google-hosted to self-hosted, because that's a `type` change (`googleFont` → `fontFamily`).
- **[Phase 5] No border-radius / sizing utility classes generated.** `grep '\.rounded\|\.border-radius\|\.inline-size' zbk-default.min.css` → none; `font-size-*` and `text-align-*` utilities are also absent (only `text-<size>` and `text-<weight>` exist). Also `.border` (the plain width+style+color shorthand) isn't generated — a border needs `border-width-sm border-solid border-app` together. The hero works around radius/borders by binding tokens in scoped CSS (`border-radius: var(--zbk-border-radius-md)`), which is allowed and re-themes correctly, but consuming apps would expect `rounded-*` / `border` utilities. Candidate manifest additions (relates to the utility-coverage backlog).
- **[Phase 5] Theme override layer is value-only → can't vary border *width* per hero theme.** Brutalist "heavy frame" comes from a near-black border color, not a thicker width, because `mergeTokens` can't add/retune the `border-width-*` scale through a theme override (same value-only limit noted above). Acceptable for the demo; a real per-theme density/weight axis would need core-level support. Also: hero `font-family` overrides inherit the base module's `weights` (`primary`=`200,800`, `alt`/`mono`=`""`), so display headings load only the 400 cut and rely on synthetic bold — consistent with the docs base theme, but a `weights` override path would let presets load proper display weights.
- **[Fonts] No self-hosted-font path via theming → docs use Google Fonts.** Because of the `type`-change limitation above, the docs base theme keeps the default `googleFont` font tokens and just overrides their values, so zebkit emits Google Fonts `@import`s (Newsreader / Instrument Serif / Space Mono). This replaced Haiku's Phase 1 self-hosted `@font-face` setup (now removed). Mark *preferred* self-hosting — restoring it cleanly would need a small core enhancement (e.g. let a font token declare `selfHosted`/`@font-face` source, or allow `type` overrides in the theme layer). Flagged for a decision; not blocking.
