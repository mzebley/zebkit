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
5. **Checkpoints:** each Phase ends with a checkpoint. At a checkpoint, `npm run build` (in `docs/`) and `npm run check` (repo root) must both pass.
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

### T1.2 — The docs theme token overrides
- **File:** `docs/src/app.css` (and a `docs/static/zebkit/` theme layer if cleaner). Map zebkit typography tokens to: display/headings → Fraunces, body/UI → Atkinson Hyperlegible Next, mono → IBM Plex Mono. Set the warm-neutral canvas/ink per brief §5 by remapping zebkit `app`/`canvas`/`ink` alias tokens. **Values come from token remaps, not raw hex** where a token exists.
- **Done when:** body reads in Atkinson, headings in Fraunces, code/tokens in mono, canvas is warm off-white, ink is warm near-black — all via tokens.
- **Verify:** a temporary `/styleguide` page shows each.

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
- **File:** `docs/src/lib/components/TopBar.svelte`. Contains: wordmark (mono), Cmd-K trigger (opens an empty palette modal for now — wired in Phase 8), `A11yDials` popover (Task 2.1a), light/dark toggle, and the active **reskin** indicator is NOT here (hero-local).
- **T2.1a `A11yDials.svelte`:** sliders/toggles for fontScale, contrast, density, reducedMotion bound to the Task 1.3 store. Keyboard-operable, labelled.
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

> **Checkpoint 2:** navigable shell; two distinct layouts; working a11y dials.

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

> **Checkpoint 3:** content authored in markdown lands in the right register automatically.

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

> **Checkpoint 4:** tokens, colors, and utilities are all generated from source and cannot drift.

---

## Phase 5 — The Reskin hero (signature)

### T5.1 — Theme preset token sets
- **File:** `docs/src/lib/data/reskin-presets.ts`. Define 4–5 named presets (`Swiss`, `Brutalist`, `Terminal`, `Editorial`, + room for more; `Swiss` is the clean/neutral baseline). Each preset is a **map of zebkit token overrides** (`{ '--zbk-…': value }`) covering color, radius, spacing/density, and type. These are real theme deltas, not ad-hoc styles.
- **Done when:** presets exist as typed data.
- **Verify:** type-check passes.

### T5.2 — `HeroReskin.svelte`
- A scoped root element; applies the active preset's token map via `setProperty` on that scope only (hero-local, per brief). Inside it, a **rich composition built only from zebkit components + utilities**: app nav, 2 cards, a form, a small data table, buttons, badges, a type specimen, a chart placeholder.
- Preset switcher (named chips). A **token-diff panel** listing which token values changed vs. the reference theme. Transition uses zebkit transition tokens; honors `reducedMotion`. **Zero layout shift** between presets (only token values change).
- Make it tall and impressive — do **not** constrain to above-the-fold.
- Caption: "Same HTML. Same classes. Only the tokens changed."
- **Done when:** clicking presets re-skins the hero with no reflow; diff panel updates.
- **Verify:** toggle all presets; confirm no layout jump (compare element box rects) and diff panel matches the preset map.

### T5.3 — Mount on Home
- Home = `EditorialLayout`: manifesto-voice pitch (Fraunces display) + `HeroReskin` as the centerpiece.
- **Verify:** `/` renders pitch + working hero.

> **Checkpoint 5:** the headline demo works and is the hero of the homepage.

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
Phase 0 (clean) → 1 (theme) → 2 (shell) → 3 (content) → 4 (generators) → 5 (hero) → 6 (components) → 7 (agents skeleton) → 8 (search/polish/ship). Each checkpoint must pass `npm run build` (docs) and `npm run check` (root) before proceeding.

---

### Gaps found
_(Agents: append any missing-utility / missing-token findings here instead of hard-coding. Each: what you needed, where, and the closest existing token/utility.)_
