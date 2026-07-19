# Phase 2c work note — shadows (execution notes, not part of the plan)

Ground truth gathered at 2c and the decisions taken, so later sessions start from
findings, not re-discovery. Delete when the migration lands.

## Status (2026-07-19)

Phase 2c is COMPLETE pending commit, all gates green (479 unit + integration
tests, type-check, both lints, `check:palette`, `check:cem`, golden baseline
byte-identical across all 19 artifacts + I7 order-shuffle, docs build). As with
2a/2b, `check:context` stays red until the regenerated doc-site artifacts are
committed — the standing handoff pattern.

## Corpus (what actually had to change)

- **Real shadow strings live in exactly one module**: `src/tokens/elevation/`
  (10 entries — `none` + 9 layered/inset ramps). Every other shadow token is
  either the literal `"none"` (38 component slots) or the single
  `{elevation.sm}` alias (`tooltip.box-shadow`). So there was no arbitrary
  shadow-string parsing to write — the elevation ramp is hand-authored, the rest
  is a mechanical retype.
- **`boxShadow` logic sites**: only 3 (`src/definitions/tokens.ts`,
  `token-maps.ts`, `dtcg.ts`). No a11y modifier, no `build-editor` special-case
  (its schema/syntax derive generically from `$type`).
- **Theme corpus**: 19 `zbk-*.tokens.json` files carry shadow entries; their
  `$value`s stay raw strings (merge substitutes verbatim — Phase 2a/2b policy).
  Retyped `$type` only.

## Decisions (promote to the D-table if they generalize)

1. **`none` = the empty array `[]`** (the sanctioned "empty-array convention"
   from the plan, not a proprietary type). `serializeShadowValue([])` → `"none"`.
   This keeps every shadow token uniformly `$type: "shadow"` (a proprietary-typed
   `none` would have split the type across a single semantic slot). Byte-identical:
   the emitted var stays `none`, so no re-baseline (unlike 2b's D8).
2. **`boxShadow` → `shadow`** (D5). The legacy name leaves `allowedTokenTypes`
   entirely (mirrors the 2a dimension collapse and 2b borderColor); the migration
   table row is now self-referential `shadow → shadow`.
3. **Serializer owns its own dimension + color rendering**, it does *not* reuse
   `serializeDimensionValue`/`serializeColorValue`:
   - offsets/blur/spread drop the unit at zero magnitude (`0`, not `0px`) — the
     authored CSS uses bare `0` for the x-offset and zero spreads.
   - colors render in CSS Color 4 **space** notation (`rgb(0 0 0 / 0.05)`), where
     the general color serializer emits legacy **comma** notation (`rgba(...)`).
     The elevation ramp has always emitted the space form; matching it is what
     holds the byte gate.
   Both live in `src/definitions/tokens.ts` next to `serializeShadowValue`.
4. **Single object *or* array** are both accepted (`shadowValueSchema` and
   `z.array(shadowValueSchema)` in the `$value` union), per the DTCG shadow type.
   Elevation authors arrays uniformly; `isShadowValue` treats an empty array as a
   shadow and a non-empty non-shadow array (e.g. a future `cubicBezier` tuple) as
   not-a-shadow, so 2d's number arrays won't collide.

## Structured-value self-check

`src/tokens/elevation/tokens/tokens.ts` builds via a factory that asserts
`serializeShadowValue(spec.value) === spec.css` for the ten pinned CSS strings
before exporting (mirrors the palette module's global round-trip check). A
structured value and its emitted CSS can never silently diverge.

## Doc-site (decoupled from `src`)

The docs consume generated JSON only — no `src` import. `formatTokenValue`
(`token-docs.ts`) previously handled just `{value, unit}` dimensions; extended it
to serialize colors and shadows (a compact mirror of the shared serializers), and
routed `token-chain.ts`'s x-ray `raw` through it. `compiled-tokens.ts` gained the
`ColorValue`/`ShadowValue` types. In the docs *default* view most shadows show as
the docs theme's raw string overrides, but the structured path is exercised for
any non-overridden shadow and is the correct fallback either way. Drift risk: this
duplicates serialization logic — if the shared serializer changes, update both.

## Blast radius / regeneration

- Hand: `tokens.ts` (enum, `shadowValueSchema`/`isShadowValue`/`serializeShadowValue`,
  `$value` union, `tokenValueToString`), `token-maps.ts` (compat), `dtcg.ts`
  (migration row), `elevation/tokens.ts` (structured), `build-editor.ts` (`shadow`
  syntax hint), three doc-site files.
- Codemod: `scripts/codemod-2c-shadows.ts` (8 source modules + 19 themes).
- Regenerated: `build:defaults` (`dist/cli/defaults/zbk-elevation.json` now
  structured), `build:editor` (schemas rename `boxShadowValue` → `shadowValue`),
  doc-site `sync:tokens` (`default-tokens.json`, `token-lookup.json`,
  `allowed-token-types.json` drops `boxShadow`), `build:context`.

## Deferred (by design)

- Theme-document shadow conformance (raw strings → structured) is Phase 3.
- Next sub-phase is **2d** (transition split → duration / cubicBezier /
  transitionProperty), then 2e (numbers & typography leftovers).
