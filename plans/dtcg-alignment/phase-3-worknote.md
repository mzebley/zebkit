# Phase 3 work note — spec-valid interchange documents (execution notes, not part of the plan)

Ground truth and decisions for making exported artifacts + override ingestion real DTCG
documents. Delete when the migration lands.

## Status (2026-07-20)

Phase 3 COMPLETE pending commit. Gates green: 498 unit + 9 integration tests, type-check,
check:utilities, check:palette, both lints, check:cem, golden baseline byte-identical across
all 19 artifacts + I7, doc-site build. `check:context` red only on the two regenerated
`default-tokens.json` files (the standing pattern — Mark commits). **Phase 3 emits NO CSS
change** — it changes artifact *shape*, not bytes; the golden baseline is untouched.

## The shape (user decision: flat-leaf groups)

Exported artifacts became DTCG documents. Asked and answered: **flat-leaf groups**, not
deep-nested subgroups. Each module is one DTCG group; entries stay flat leaves; a `$type`
shared by every entry is hoisted to the group; `_key`/`_layer`/`_cssEmission` snapshot
sidecars became a group-level `$extensions["dev.zebkit"]` block (`layer`, `cssEmission`;
`scale` already lived there). Ingestion still *accepts* arbitrary-depth nesting from
external docs (flattening path segments with `-`, D6) — export just doesn't emit it.

## The boundary (`src/scripts/tokens/dtcg-document.ts`)

Two functions are the single shape boundary; their round-trip is identity, so JSON-mode
builds emit the same declaration set as source builds:

- `toDtcgDocument(entries, meta)` — hoist shared `$type`, fold layer/cssEmission/scale into
  the group `$extensions`. Used by `writeTokensToFile` (combined + per-module exports incl.
  the docs `default-tokens.json`) and `build-defaults` `writeSnapshotDir` (CLI snapshots).
- `fromDtcgDocument(doc)` — expand group `$type` onto entries, flatten nested groups, reject
  `$ref`/`$extends`. Used by the compile-tokens JSON-mode loader, override ingestion
  (`applyTokenOverrideFile`), and `build-editor` snapshot reads.
- `validateDtcgDocument(doc)` — the local Phase 3 gate (Phase 4 wires it into `check`):
  parses, every leaf resolves an allowed `$type`, every `$value` matches the entry schema.

## Ingestion (reads DTCG documents now)

`applyTokenOverrideFile` runs the override through `fromDtcgDocument` (nesting, group `$type`,
`$ref`/`$extends` rejection). `mergeTokens` dropped its string/number/dimension value guard
and now validates the merged entry against the module's bespoke subschema *or* the generic
`tokenObjectSchema` — so **structured override values** (colors, shadows, dimensions,
duration/bezier, shadow arrays) ingest, not just raw strings. Entry-must-exist-in-defaults
stays the closed-world guard; exact-key rejection now only fires for the 3 bespoke ZodObject
schemas.

## Schema consolidation (net deletion, `codemod-3-consolidate-schemas.ts`)

The 46 near-identical `z.object({ <key>: tokenObjectSchema, … })` schema files are gone; a
module's default export validates against the single generic `tokenModuleSchema` (a record of
DTCG entries) — `token-schema.ts` is now optional in compile-tokens. Kept the 3 with real
constraints: breakpoint (viewport ordering), type-scale (generated-scale steps), font-family
(loading metadata). The 36 primitive/prose/semantic modules had `satisfies XTokens` rewritten
to `satisfies TokenInterface`; the 9 component modules already used
`satisfies Record<XTokenKey, TokenObject>`, so only their schema files were deleted; the 4
generative modules (palette, elevation, transition, spacing) needed hand fixes (`as XTokens`
casts / an import merge the codemod's regex missed).

## doc-site (decoupled — can't import src)

The served `static/zebkit/default-tokens.json` is the hoisted DTCG document; `copy-tokens.js`
*expands* it (group `$type` pushed onto entries, group `$`-metadata dropped) into the internal
`src/lib/data/generated/default-tokens.json`, so every Svelte consumer keeps the flat
per-entry-`$type` shape it already read — no consumer changed. `generatePrimitivePalette`
already skipped `$`/`_` members, so it reads the hoisted file fine. (Expansion logic is
duplicated from dtcg-document.ts — the accepted doc-site decoupling drift, like the 2c/2d
serializer mirrors.)

## build-editor + editor-schema.test

`build-editor` reads each snapshot via `fromDtcgDocument` (group `$type` expanded so hoisted
modules still yield per-entry schema properties; `cssEmission` read from `meta`, not the old
`_cssEmission` sidecar). The test's authorable-module filter reads `cssEmission` from the new
`$extensions` location. Editor override schemas (`schemas/tokens/*.json`) are byte-unchanged —
they key on entry names+types, which Phase 3 didn't touch.

## Gotchas

1. **JS integer-key ordering.** For numeric-keyed modules (opacity, z-index) the group
   `$type`/`$extensions` serialize *after* the entries (V8 sorts integer keys first); harmless
   — key order is irrelevant to parsing, and `fromDtcgDocument` reads by key. Same quirk moves
   `z-index: auto` after the numeric steps on round-trip (pre-existing; I7-covered).
2. **`isLeafToken` can't rely on `$value`.** Fluid font-size steps omit `$value` (derived at
   build). A leaf is `$value`-bearing *or* has no non-`$` child members; otherwise a member
   with children is a group. (First cut dropped every fluid step — caught by the editor
   override-file test.)
3. **Round-trip proof.** source-mode vs JSON-mode emit the *identical declaration set*
   (verified: same var names+values, 0 conversion errors); byte order differs only by
   module-load order (I7). The golden baseline (source build) is untouched.

## Deferred / next

- **Phase 4 (locks):** wire `validateDtcgDocument` into `npm run check`; strict-mode export
  (D9) + drop-manifest; provenance-marked `allowed-token-types.json`; delete the codemods (D11).
- **Phase 5 (docs):** `CLAUDE.md` + `src/tokens/README.md` still say each module owns a
  `token-schema.ts` — now stale (only 3 do). The token-entry snippet and workflow docs update
  here.
- **Next: Phase 4.**
