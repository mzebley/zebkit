# Phase 4 — Locks (worknote)

Turns DTCG alignment from "true today" into "can't silently become false." No CSS
bytes change; the golden baseline stays byte-identical.

## What shipped

### 1. `validateDtcgDocument` wired into `npm run check`

New script `scripts/check-dtcg-validate.ts` → `npm run check:dtcg-validate`, added to
the `check` chain right after `check:dtcg-baseline`.

- Rebuilds every exported token document **fresh from source** in-memory — the default
  theme plus every built-in preset, via the same `gatherZebkitFiles` +
  `buildZebkitTokens` + `toDtcgDocuments` pipeline `build:defaults` uses — and runs
  `validateDtcgDocument` on each module (495 module docs across 11 themes today).
- It validates the **live pipeline**, not the checked-in `dist/cli/defaults` snapshots,
  so a source edit that would produce an invalid export fails before anything is
  regenerated or committed. Deleting a `$`-field / mistyping a `$type` fails with a
  message naming `theme/module.token`. (A source-authoring `$description` deletion is
  actually caught even earlier, at module load — `tokenModuleSchema` — with
  "Invalid token structure in file: …". The export gate is defense-in-depth at the
  serialization boundary.)
- The gate also runs the strict pass over the fresh corpus: asserts the strict form of
  every module is spec-only and that strict export sheds >0 proprietary tokens
  (guards against the D9 filter regressing to a no-op — sheds ~1848 today).

### 2. Strict-mode export (D9) + drop-manifest

`src/scripts/tokens/dtcg-document.ts`:
- `toStrictDtcgDocument(doc)` → `{ document, dropped }`: keeps only DTCG **spec**-typed
  entries (`isDtcgSpecType`), drops the proprietary D4 registry types
  (`cssDimension`, `display`, `transitionProperty`, `boolean`, …), re-serializes the
  survivors through the normal boundary (so the strict doc is itself valid DTCG, group
  `$type` recomputed), and returns the `DroppedToken[]` manifest.
- `toDtcgDocuments(build)` — new shared batch boundary (module map → per-module DTCG
  documents). `writeTokensToFile`, `build-defaults` `writeSnapshotDir`, and
  `check:dtcg-validate` all go through it, so exported ≡ validated shape.
- Exporter wiring: `writeTokensToFile` gained a `strict` param; when set it also writes
  `<theme>-tokens.strict.<fmt>` (or `<key>.strict.tokens.<fmt>` per-module) plus
  `<theme>.drop-manifest.json`. Reached via new **config-only** `tokens.exportStrict`
  (default false, no prompt) → `BuildZebkitTokensOptions.exportStrict` → the exporter.
  Smoke-tested: combined default export drops 168 tokens across 22 modules.

### 3. Codemods deleted (D11)

Removed all six migration codemods (`codemod-dtcg-shape`, `codemod-d5-collapse`,
`codemod-2c-shadows`, `codemod-2d-transitions`, `codemod-2e-numbers-typography`,
`codemod-3-consolidate-schemas`). They are self-contained (no cross-imports, nothing in
`package.json`/`src` referenced them); CHANGELOG history keeps the record.

### Editor-schema regen (item 4)

`npm run build:editor` regenerated `schemas/zebkit.config.schema.json` — the **only**
tracked drift was the new `exportStrict` property (token schemas / css-data unchanged,
confirming no type drift). `src/scripts/config.ts` + `config-schema.ts` carry the option;
`config.test.ts` (schema-in-sync) passes.

## Verification

- `npm run type-check` ✓ · `npm run test:unit` (501) ✓ · `npm run test:integration` (9) ✓
- `npm run check:dtcg-baseline` ✓ (19 artifacts byte-identical, I7 order-invariance OK)
- `npm run check:dtcg-validate` ✓ · `npm run lint` ✓
- Not re-run here (heavy, unaffected by token content): `check:utilities`, `check:palette`,
  `check:cem`, `check:context`, `check:docs`. `check:context` follows the standing pattern
  (green unless doc-site generated artifacts drift; token content is unchanged this phase).

## Deferred / not done

- **Item 3 — provenance-marked `allowed-token-types.json`**: still a flat array of
  `allowedTokenTypes.options`. Not in this phase's ask. The data to split it already
  exists (`DTCG_TYPES` / `ZEBKIT_PROPRIETARY_TYPES` / `isDtcgSpecType` in
  `src/definitions/dtcg.ts`) — a follow-up would emit `{ spec: [...], proprietary: [...] }`
  from `writeAllowedTokenTypes` and update the doc-site copy + its consumer.
- **Phase 5 (docs & doctrine)**: CLAUDE.md + `src/tokens/README.md` still say each module
  owns a `token-schema.ts` (stale since Phase 3 — only breakpoint/type-scale/font-family
  do); VISION addendum (DTCG 2025.10 interchange; D7 primitive-override policy); CHANGELOG
  already carries the format facts.
