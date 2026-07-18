# Phase 2a work note — dimension family audit (execution notes, not part of the plan)

Written at the end of the session that landed Phases 0 and 1. This is the ground truth
gathered for 2a so the next session starts from findings, not re-discovery. Delete when 2a lands.

## Progress (2026-07-18)

Steps 1–3 of the landing order below are DONE in this worktree, each leaving `npm run check`
green (minus the check:context commit-pending state) and the golden baseline byte-identical:

1. **Done** — `cssDimension` live; 28 non-px/rem literals retyped (source + the 15 theme files
   that carried explicit legacy `$type` on those entries); compat row added; D4 widened to
   cover keywords/unitless 0.
2. **Done** — 61 source px/rem literals structured `{value, unit}`; `serializeDimensionValue`
   (leading-zero-stripping, see audit result below) feeds converter/resolvers/breakpoints/
   variants/context/docs; merge + editor schemas + pull accept structured values.
3. **Done** — `setting` type deleted; controls live in group `$extensions["dev.zebkit"].scale`
   (module `extensions` export / snapshot `$extensions` member / override-document top-level
   `$extensions` with touched-control recording for overlays); step `index` moved under entry
   `$extensions["dev.zebkit"].scale.index`; pull round-trips the block; docs-theme control
   files migrated.
4. **NOT started** — the D5 type collapse (hazards 1–3 below). Land it on a clean base after
   steps 1–3 are committed.

## Where things stand

- Phase 0 landed: `npm run check:dtcg-baseline` (19 golden artifacts + I7 order-shuffle) wired into `npm run check`; central definitions in `src/definitions/dtcg.ts`.
- Phase 1 landed: `$value`/`$type`/`$description` + `$extensions["dev.zebkit"]` everywhere; baseline byte-identical; all gates green (only `check:context` waits on committing the two regenerated `default-tokens.json` copies).
- Codemod (`scripts/codemod-dtcg-shape.ts`) accepts explicit file args — reuse it as the chassis for the 2a value transform.

## Default-theme value inventory (from `dist/cli/defaults`)

- **191 alias references** across dimension-family types — stay curly-brace strings.
- **53 px/rem literals** whose canonical serialization (`${parseFloat(v)}${unit}`) is byte-identical — safe to structure as `{value, unit}`.
- **8 leading-dot literals** (`-.05rem` etc.): 4 in `zbk-letter-spacing` (tighter/tight/wide/wider), 4 in `zbk-spacing` (neg-05/neg-025/025/05).
  - The spacing four re-derive through `parseFloat` + rounding in `resolveSpaceScale` — canonicalization cannot change output bytes.
  - The letter-spacing four flow **verbatim** into CSS (inside the `calc(... * var(--zbk-a11y-letter-spacing-modifier))` wrap). A `{value:-0.05, unit:"rem"}` → `-0.05rem` serializer changes bytes. Either the serializer emits magnitudes < 1 without the leading zero (verify no `0.x`-formatted px/rem literal exists anywhere, **including all 198 theme files**, before adopting that rule), or these four entries get canonicalized in a deliberate byte-change… which I1–I3 forbid. Recommend the leading-zero-stripping serializer rule after a full-corpus audit.
- **sizing** is a mixed bag: 5 px/rem; keywords `auto`×5, `none`×2 (not lengths — D4's `cssDimension` is defined as *lengths*; either widen its definition in the D-table or give keywords another home); `1em`×3, `0.75em`, `0.5em`, `100%`×3, `32|45|60|72|85ch`, 3 unitless (identify them). All non-px/rem → `cssDimension` candidates.
- **borderRadius**: `50%` ×3 → `cssDimension`.
- **rootFontSize**: 11 steps, all index-only (no `$value`), each with a per-step custom a11y modifier string. Steps without `$value` are not valid DTCG tokens — fine until Phase 3, where the export likely materializes the computed static floor as `$value`.
- Theme overrides also carry dimension literals (hero radii etc.) — the 2a codemod must sweep `theme/**` with the same rules; the golden baseline covers all of those files via the docs/hero/dynamowaves/mark-down/nudge-deck builds.

## Hazards discovered (the real 2a design work)

1. **`a11yMap` is keyed by legacy `$type`** (`spacing`, `lineHeight`, `letterSpacing`, `fontSize`, `transition`). The D5 collapse (spacing/sizing/… → `dimension`) destroys that keying. Safest: at retype time, materialize `a11y: true` into the explicit modifier var string per legacy type (byte-preserving, and `a11y: "<var>"` is already a supported form). Alternatively re-key the map, but "the token's type" no longer identifies the right modifier post-collapse.
2. **Utility manifests bind legacy type names** — e.g. margin/padding bind `"types": ["spacing", "rootSize"]`, layout binds `["spacing", "rootSize"]`, flex binds a list too. Today the `rootSize` vs `spacing` split distinguishes primitives from semantic aliases in the same group. A flat retype to `dimension` makes the filter match *everything* in the group → new utility classes appear → baseline breaks. Manifest `types` values must be updated in lockstep, and the primitive/alias discriminator needs a new basis (candidate: filter on "entry has a structured `$value`" vs "entry is a reference" — matches the actual intent and survives the collapse; needs a deliberate decision).
3. **`tokenCompatibilityMap` rekey** — add `dimension`/`cssDimension` rows so all 191 references stay valid; the docs `token-types.ts` filter list and editor-schema `getTokenTypeSyntax` map also enumerate legacy type names.
4. **Settings → group `$extensions["dev.zebkit"].scale`** touches: `readControls` in both resolvers; `computeEmissionClosure`'s consumed-controls re-emission logic (overlays overriding a control); `applyTokenOverrideFile`/`mergeOverrideObject` (must merge a group-level `$extensions` member from override documents — new code path); the editor schema generator (override schemas need a group-level `$extensions` property); CLI pull's "authorable" filter (settings entries currently pass the `$value` filter and are written into consumer token files). Theme files that override settings today: `theme/zebkit-docs/zbk-font-size.tokens.json` (viewport/base/ratio controls) and `theme/zebkit-docs/zbk-spacing.tokens.json` (`max-scale`) — plus the pull-state snapshot under `theme/.zebkit/`. No theme overrides step `index`.

## Step-2 corpus audit result (2026-07-18)

The full-corpus audit for fractional px/rem formatting ran with step 1:

- **Source modules are consistent**: all 8 fractional literals are leading-dot (`.5rem`, `-.025rem`, ...); every other px/rem literal is integer-valued. The leading-zero-stripping serializer is byte-safe for the authoring layer.
- **Theme files are mixed**: 31 leading-zero literals (`0.75rem`, `0.8125rem`, ...) vs 37 leading-dot (`.75rem`, `.82rem`, ...). No single canonical serializer reproduces both, so the theme sweep to structured values **cannot** be byte-identical and is dropped from 2a. Theme override `$value`s stay raw strings — the merge path substitutes them verbatim and the serializer never touches them. Their document-level conformance is Phase 3's problem (normalize formatting there, deliberately, if structured values are ever wanted in override documents).

## Suggested landing order inside 2a (each step baseline-green)

1. Introduce `cssDimension` into `allowedTokenTypes` + compat map; retype the ~20 non-px/rem literals (keywords decision recorded in the D-table first).
2. Structured `{value, unit}` for px/rem literals + the dimension serializer (leading-zero rule) + resolvers reading structured floors. This is the byte-identity crux.
3. Settings + step `index` → group-level `$extensions` (the plumbing in hazard 4).
4. The D5 type collapse last, in lockstep with manifest `types` values, compat-map rekey, a11y materialization (hazards 1–3). Riskiest step; isolate it.
