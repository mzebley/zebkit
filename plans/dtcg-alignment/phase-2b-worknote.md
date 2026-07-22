# Phase 2b work note — color inversion audit (execution notes, not part of the plan)

Ground truth for D7/D8 gathered at 2b kickoff so later sessions start from findings,
not re-discovery. Delete when 2b lands.

## Progress (2026-07-19)

Steps 1 and 2 of the landing order below are DONE in this worktree, each leaving all
gates green (479 unit + 9 integration tests, type-check, lints, golden baseline
byte-identical, docs build; `check:context` red only until the six regenerated
doc-site artifacts are committed — standing handoff pattern):

1. **Done** — `borderColor` collapsed into `color`. Registry-only (zero entries
   existed): type enum, two compat-map rows, converter palette-check condition,
   editor syntax row, `LEGACY_TYPE_MIGRATION` row; `allowed-token-types.json`
   regenerated at 21 types.
2. **Done** — the inversion. `src/tokens/colors/palette/tokens/palette-definition.ts`
   (families/ramp/globals + `paletteHsl`/`paletteStepName` helpers) materializes the
   module (`tokens.ts`, key `color`, 278 string-`hsl()` entries, exact-shape zod
   schema). Emission opt-out: `cssEmission = "external"` export → `externalModules`
   set on `BuildZebkitTokensResult` (JSON mode reads a `_cssEmission` sidecar written
   by `build-defaults`); the main build deletes external modules from the converter
   map while passing the full map as `referenceTokens`; overlays skip them in the
   closure loop; the I7 shuffle check mirrors the same exclusion; override files
   targeting them throw (integration test locks this + single-emission of
   `--zbk-color-red-*`). `generate:palette`/`check:palette` (wired into `generate` +
   `check`) write the mixin, 25 family partials, and `palette/styles.scss` from the
   definition — diffs vs. the hand-written files were exactly generated-headers +
   whitespace, sass output byte-identical. `paletteMap` and its converter fallback
   deleted (every `{color.*}` in the corpus verified to resolve against the module);
   `paletteGlobalColors()` derives from `PALETTE_GLOBALS`. Pull skips external
   modules; editor build skips their override schema (test updated) but feeds
   entries to reference examples (+278 `{color.*}` autocomplete examples per color
   definition) and CSS custom data. Docs `copy-tokens.js` palette codepath reads
   `default-tokens.json` (`zbk-color`) instead of parsing SCSS —
   `primitive-palette.json` output verified byte-identical. Artifact churn as
   predicted in hazard 3: defaults gained `zbk-color.json` (45 modules),
   `token-lookup.json` +278 entries, editor schemas regenerated.

3. **Done** — structured color values + D8. `colorValueSchema`/`serializeColorValue`/
   `isColorValue` in `src/definitions/tokens.ts` (full spec color-space enum;
   serializer rules byte-driven: alpha-0 black → `transparent` keyword, `hex` wins at
   full alpha, `hsl` → legacy comma notation, else `rgb()`/`color()`);
   `tokenObjectSchema`'s `$value` union gained the color shape. The palette module
   materializes structured values (`paletteColorValue`/`globalColorValue` in the
   definition; module build self-checks each global round-trips to the exact SCSS
   literal); docs `copy-tokens.js` parses components instead of `hsl()` strings —
   `primitive-palette.json` still byte-identical. **D8 aliasing executed with the
   scoped re-baseline** (decision 7 resolved: aliased, not deferred): the 7 component
   `"transparent"` literals → `{color.global-transparent}`; audited diff = exactly
   those 7 vars (`transparent` → `var(--zbk-color-global-transparent)`) across the 5
   affected artifacts (docs shows only pagination's 6 — the docs theme overrides
   tooltip's border-color with a raw `"transparent"` string, which stays raw per the
   2a theme policy); baseline re-snapshotted via `--update` with two-build determinism
   verified. Serializer unit tests in `token-converter.test.ts`.

Phase 2b is COMPLETE pending commit. Remaining phase-level follow-ups deferred by
design: theme-document color conformance (Phase 3), primitive-override policy
sentence in VISION (Phase 5), color utilities manifest binding to the palette module
(out of scope, noted in hazards).

## Current palette pipeline (what inverts)

- **SCSS is the source of truth.** 25 hand-written `src/tokens/colors/palette/_<family>.scss`
  files each call `primitiveColor("<name>", <hue>, <sat>%)`. The mixin
  (`src/tokens/styles/mixins/_primitive-color.scss`) emits, per family:
  `--zbk-color-<f>-hue`, `--zbk-color-<f>-saturation`, and 11 **var-composed** steps —
  `--zbk-color-<f>-500: hsl(var(--zbk-color-<f>-hue), var(--zbk-color-<f>-saturation), 58%)`.
  Ramp lightness: 50→98, 100→93, 200→87, 300→78, 400→69, 500→58, 600→48, 700→36,
  800→26, 900→18, 950→10.
- **Placement**: palette `:root` blocks are **top-level, unlayered** (unlayered beats
  layered — the deterministic-override story). They compile among the utility-ordered
  sheets (`utilityStylesheetPatterns` matches `tokens/colors/`), i.e. inside
  `sassResult.css`, *before* the converter's `@layer` var blocks. Reproducing this
  placement outside sass is fragile — **SCSS stays the emission vehicle**.
- **Globals** in `palette/styles.scss`: `global-black #131313`, `global-white #fefefe`,
  `global-transparent transparent`. Duplicated as a hardcoded string in
  `build-tokens.ts` `paletteGlobalColors()` for smart mode.
- **Smart mode** (`extendedTokens.colors === "smart"`): drops `palette/styles.scss`,
  appends per-family `@use 'tokens/colors/palette/<family>'` for families found by
  `extractReferencedColorFamilies` (regex `{color.<family>-<step>}` over `$value`s),
  plus `paletteGlobalColors()` inline. **Per-family SCSS files must survive** for this
  mechanism to keep working unchanged.
- **`paletteMap`** (`src/definitions/palette-map.ts`): static 25 families × 11 steps
  + 3 globals list. Sole consumer: `validateCssReferencesExist` in `token-converter.ts`
  (the virtual-target fallback for `{color.*}` refs — what I5 kills). `hue`/`saturation`
  are **not** in the map: `{color.red-hue}` is invalid today and stays invalid.
- **Docs**: `doc-site/scripts/copy-tokens.js` regex-parses the mixin (step→lightness)
  and each `_<family>.scss` (hue/sat) → `primitive-palette.json`
  `{steps, families[{name,hue,saturation,swatches[{step,lightness,cssVar,hsl}]}], globals}`.
  Consumers (`primitive-palette.ts`, `PrimitivePalette.svelte`, `HeroReskin.svelte`)
  only see the JSON — keep its shape identical and no Svelte work is needed.
  `token-chain.ts` derives palette terminal nodes without a lookup (comment: palette
  "lives only as runtime CSS vars") — after inversion the lookup will contain real
  entries; derived-node logic keeps working, regeneration only.

## Corpus

- 454 color-typed source entries; effectively all `{ref}` values. Literals: **7×
  `"transparent"`** (pagination ×6, tooltip ×1). Semantic `app` border slots have
  `$value: ""` (themed-only) — any structured-value schema must keep allowing `""`.
- Theme corpus: 1438 color-typed entries; a few dozen hex/`hsl()`/`rgb()` literals
  (hero themes). Per the 2a precedent, **theme `$value`s stay raw strings** (merge
  substitutes verbatim; document conformance is Phase 3's problem).
- **`borderColor` has zero token entries anywhere** (source, themes, manifests).
  Registry-only: `allowedTokenTypes`, two `tokenCompatibilityMap` rows, one converter
  condition (`type === "color" || type === "borderColor"`), `scripts/build-editor.ts`
  syntax row, `LEGACY_TYPE_MIGRATION` row, generated `allowed-token-types.json`.
- Module-key note: `colors/{brand,neutral,accent-*}` (numeric ramps) and
  `semantic/color/*` (roles) merge by shared `key` at compile. The new palette module
  key `color` collides with nothing.

## Design decisions (recorded here, promoted to the D-table if they generalize)

1. **Palette module**: `src/tokens/colors/palette/tokens/tokens.ts`, `key = "color"`,
  auto-gathered. Authoring stays generative TS data — families `{hue, saturation}`,
  shared ramp `{step: lightness}`, globals — with a loop materializing the 275 step
  entries + 3 globals (exact `paletteMap` key set). Ramp/family definitions export for
  the SCSS generator and the defaults snapshot (group
  `$extensions["dev.zebkit"].palette`), so the docs read them from token space.
2. **Emission opt-out**: the module exports a marker (e.g. `cssEmission = "external"`),
  honored by the compile pipeline in both dev and installed-CLI mode (snapshot carries
  it via module-level `$extensions`), by the editor schema generator (no override
  schema), and by CLI pull (not authorable). If the opt-out fails, the golden diff
  catches the duplicate emission — that is the test.
3. **SCSS generation**: `generate`-family script writes the 25 `_<family>.scss`, the
  mixin (ramp lightness values now come from token space), and `palette/styles.scss`
  (globals + `@use` list), byte-identical to today's hand-written files, with
  generated-file headers + drift lint like the utility manifests. Also derive
  `paletteGlobalColors()` from the same data (or lint it against the module) so the
  smart-mode duplicate can't drift.
4. **Closed-world flip (I5, palette half)**: delete the `paletteMap` fallback in
  `validateCssReferencesExist` — `{color.*}` refs resolve through the normal
  module path since `zbk-color` now exists in `availableTokens` (dev and CLI-defaults
  mode both). `tokenAliasMap` virtual targets survive until 2e, as planned.
5. **Overrides of palette entries**: not supported in 2b. Emission-external means an
  override merge has nowhere to land; runtime theming stays `--zbk-color-<f>-hue/-saturation`.
  Reject entry-level palette overrides with a clear error. Whether primitives become
  override-able is the Phase 5 VISION sentence (D7's parenthetical).
6. **Materialized values land in two passes**: step 2 materializes `$value` as plain
  `hsl(H, S%, L%)` strings (schema-safe today, zero serializer risk); step 3
  restructures to DTCG color objects `{colorSpace, components, alpha, hex?}` and adds
  the serializer (hsl components → today's `hsl()` notation; `hex` passthrough for the
  globals). Mirrors 2a's "introduce surface first, restructure second".
7. **D8 transparent**: `global-transparent` materializes as
  `{colorSpace: "srgb", components: [0,0,0], alpha: 0}` with a serializer/generator
  special case emitting the keyword `transparent` (an `hsla(...)` form would change
  bytes). The 7 component `"transparent"` literals become `{color.global-transparent}`
  aliases — emitted bytes change from `transparent` to
  `var(--zbk-color-global-transparent)` (computed-value identical). That is a
  **deliberate, scoped re-baseline** in step 3 (precedent: 372dd44): audit the diff to
  exactly those 7 vars before re-snapshotting. If review prefers zero byte churn, the
  fallback is to keep the literals and move the aliasing to Phase 3 — record whichever
  way it goes.

## Hazards

1. **Duplicate emission** — module key `color` emits `--zbk-color-*`, exactly the
  palette namespace. Any hole in the opt-out (dev compile, CLI-defaults compile,
  overlay closure, variant compile) shows up as doubled vars in a `@layer` block; the
  golden diff is the tripwire, run it per sub-step.
2. **Overlay emission closure** — palette entries must never enter
  `computeEmissionClosure` output. Today `{color.*}` targets simply don't exist in the
  map, so dependents never chain through them; after 2b the targets exist. Palette
  entries are never seeds (no overrides), so nothing should change — add a test.
3. **Artifact churn** — defaults gain `zbk-color.json` (+snapshot `$extensions`),
  `token-lookup.json` gains palette vars (docs x-ray autocomplete grows — fine),
  `allowed-token-types.json` loses `borderColor`, editor schemas must *not* gain a
  palette override schema. All drift-checked; regenerate and eyeball each.
4. **Installed-CLI gather** loads every JSON in the defaults dir as an emittable
  module (`gather-files.ts` ignore-list pattern). `zbk-color.json` must ride the
  opt-out inside the file, not a filename convention, or CLI builds double-emit.
5. **`extractReferencedColorFamilies`** regex only matches `{color.<family>-<step>}`
  with `[a-z]+` family — safe against the module's own entries, but smart-mode builds
  must still find per-family SCSS files at their current paths post-generation.

## Landing order inside 2b (each step baseline-green)

1. **borderColor → color collapse.** Registry-only deletion (zero entries exist);
  regenerate `allowed-token-types.json`. Trivial, shrinks the surface first.
2. **The inversion.** Palette token module (string `hsl()` values) + emission opt-out
  + generated SCSS (byte-identical) + drift lint + paletteMap retirement + closed-world
  refs + docs palette from the defaults snapshot + editor/defaults/lookup regeneration.
3. **Structured color values.** DTCG color objects + serializer + D8 transparent
  aliasing with its scoped re-baseline (decision 7 above).
