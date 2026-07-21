# DTCG Alignment — Implementation Plan

**Companion:** [README.md](README.md) holds the findings, level-of-effort, pros/cons, and the recommendation this plan executes.
**Spec target:** DTCG Design Tokens Format Module **2025.10** (first stable release). The Resolver Module (draft) is out of scope.

## How this plan stays drift-proof

This plan is written to survive the codebase changing underneath it and to make its own execution self-verifying:

- **It anchors to contracts, not code coordinates.** Steps name modules, exported symbols, file *conventions* (`**/tokens/tokens.ts`, `zbk-<module>.tokens.json`), and npm scripts — never line numbers or current implementation details that phases before it will have rewritten.
- **Every phase ends at a gate.** Each phase must leave `npm run check` green **and** the Phase 0 golden CSS baseline byte-identical (until the one phase that is explicitly allowed to change bytes, which re-baselines under its own rules). A phase that can't reach its gate doesn't merge; later phases never inherit debt.
- **The invariants below are testable, and Phase 0/4 turn them into CI checks.** If the plan and the repo disagree, the checks fail loudly instead of the plan silently rotting.
- **Scope exclusions are explicit** so adjacent systems don't get dragged in by association.

### Invariants (must hold at every merge, enforced by gates)

| # | Invariant | Enforced by |
|---|---|---|
| I1 | Emitted CSS custom property **names** (`--zbk-<module>-<entry>`) never change | Golden baseline diff |
| I2 | Emitted CSS custom property **values** — including fluid `clamp()` strings and a11y `calc()` wrappers — never change (byte-identical after minify-off normalization) | Golden baseline diff |
| I3 | The `@layer` structure and layer assignment of every declaration never changes | Golden baseline diff |
| I4 | Every token still carries a non-empty description; every module still fails the build on schema mismatch (no silent partial themes) | Zod/refinement validation + existing build-failure semantics |
| I5 | Aliases resolve only against targets that exist in the token document (no "virtual" targets) — *from Phase 2b onward* | Reference validator (closed-world mode) |
| I6 | Full JSON artifacts validate against the Zebkit DTCG 2025.10 profile; strict artifacts contain only supported spec types and are reference-closed | DTCG validation step in `npm run check` |
| I7 | No behavior may depend on token entry ordering | Order-shuffle test added in Phase 0 |
| I8 | The variant system (`compile-variants`, `variants/*.ts`, variant JSON overlays) is untouched — raw-string overrides are not DTCG documents | Scope exclusion; no variant file appears in any phase's diff |

### Scope exclusions

- **Variants** (I8). Variant overrides are `name → raw string` recipes, not token documents.
- **Utility manifests** (`*.utilities.manifest.json`). They bind to module keys and CSS vars, both unchanged (I1). If a utility generator reads a token *entry object* anywhere, that read site migrates in Phase 1 like any other consumer — but the manifest format itself does not change.
- **The Resolver Module.** Phase 3 keeps base theme and overlays as separate documents (already true) so a future resolver manifest can layer on without refactoring; nothing else.
- **SCSS utility/generator architecture, component code, GRAMMAR.** Only the palette SCSS source-of-truth inverts (Phase 2b), and only that.

---

## Locked decisions

Decisions the phases assume. Changing one of these means updating this table *first* — that is the drift check for the plan itself.

| # | Decision | Choice |
|---|---|---|
| D1 | Depth of alignment | Full output is the **Zebkit DTCG 2025.10 profile**: DTCG structure plus a documented proprietary `$type` registry. Strict output contains only the DTCG types zebkit fully implements, with closed references and validation. No token surface is dropped to overstate strictness |
| D2 | Authoring format | TS modules (`tokens/tokens.ts` + optional structural schema) remain the source authoring layer. JSON exports, defaults snapshots, overrides, and docs data use the Zebkit profile; strict export is the conformant interoperability surface |
| D3 | `$extensions` vendor key | One namespace for everything zebkit-specific: `"dev.zebkit"` (swap once if the project settles on a different domain — one constant in `src/definitions/`). Sub-keys: `a11y`, `scale` (fluid settings/`index` steps), `font` (`source`/`fallback`/`weights`/`styles`/`faces`/`display`), `layer` (only where it must ride in JSON, e.g. defaults snapshots) |
| D4 | Proprietary `$type` registry | Kept, minimized, and centrally defined next to the DTCG set: `display`, `cursor`, `textTransform`, `textDecoration`, `textAlignment`, `fontStyle`, `transform`, `transitionProperty`, `transitionTimingFunction`, `content`, `flex`, `utility`, `asset`, `boolean`, `cssDimension` (CSS sizing values DTCG's `dimension` can't express: `%`, `ch`, `em`, `calc()`, the sizing keywords `auto`/`none`, and unitless `0` — anything valid where a length is expected but not a px/rem `{value, unit}` pair). `transitionTimingFunction` (added Phase 2d) is the `<easing-function>` keyword surface (`ease-out`, `linear`, …) DTCG's `cubicBezier` type — explicit `[x1,y1,x2,y2]` curves only — cannot express. Everything else moves to a spec type |
| D5 | Spec type mapping | `color`/`borderColor` → `color` · `spacing`/`sizing`/`dimension`/`rootSize`/`borderWidth`/`borderRadius`/`fontSize`/`rootFontSize`/`letterSpacing` → `dimension` (px/rem values) or `cssDimension` (rest) · `boxShadow` → `shadow` · `transition` splits → `duration` / `cubicBezier` / `transitionProperty` / `transitionTimingFunction` (Phase 2d: durations and explicit curves take the two spec types; CSS property-name lists and `<easing-function>` keywords take the two proprietary types) · `lineHeight`/`opacity`/`zIndex` → `number` · `fontWeight` → `fontWeight` · `fontFamily` → `fontFamily` (metadata → `$extensions`) · `borderStyle` → `strokeStyle` · `setting` → not a token: moves to `$extensions` on the group (see Phase 2a) |
| D6 | Aliases | Curly-brace references only, both authoring and ingestion. `$ref` (JSON Pointer) and `$extends` are **rejected with a clear error** naming this limitation. Zebkit authors two-level refs; the resolver accepts arbitrary depth and flattens group paths to CSS var names by joining with `-` |
| D7 | Primitive palette | Materialized as real `color` tokens (source of truth), from which the SCSS ramp variables are generated. `paletteMap` and docs-side SCSS parsing are retired. Base and overlay primitive overrides are supported and emit unlayered after the generated palette so they win the cascade |
| D8 | `transparent` | Materialized as `color.global-transparent` = `{colorSpace:"srgb", components:[0,0,0], alpha:0}`; literal `"transparent"` in token values becomes an alias to it. (`currentColor`, if ever needed, enters the proprietary registry) |
| D9 | Strict-mode export | `tokens.exportStrict` emits only the implemented DTCG spec types, validates references before and after pruning, and records direct/transitive drops in a manifest. It requires `tokens.exportTokens`; default export is the full profile document |
| D10 | `$description` | Required on every token by zebkit's own validation (spec makes it optional; the discipline stays) |
| D11 | Codemod | Checked in under `scripts/` for the migration PRs, deleted at the end of Phase 4. It is a migration tool, not a compat layer |

---

## Phases

Each phase is independently landable on the integration branch. **Gate** = merge condition.

### Phase 0 — Baseline and harness (0.5–1 d)

The phase that makes every other phase verifiable.

1. Build and snapshot golden CSS baselines (minify off) for: the docs config (`theme/zebkit.docs.config.json`), every hero theme, at least one overlay config, and one pruned build. Store hashes + normalized CSS under `plans/dtcg-alignment/baseline/` (or a CI artifact — decide by repo-size tolerance).
2. Add the diff runner as a script (`npm run check:dtcg-baseline` or similar) that rebuilds and byte-compares. Wire into `npm run check` for the duration of the migration.
3. Add the entry-order-shuffle test (I7): build with token entries reordered, assert identical output.
4. Land the central definitions this migration hangs on, in `src/definitions/`: the DTCG type set, the proprietary type registry (D4), the vendor-extension key constant (D3), and the spec-type mapping table (D5) — data first, unused, so later phases import instead of re-deciding.

**Gate:** baseline runner green against unmodified `main`; new definitions type-check; `npm run check` green.

### Phase 1 — The `$` shape (2–4 d)

Mechanical conversion of the entry shape everywhere. No value or type semantics change.

1. Codemod (D11) rewrites, across all `**/tokens/tokens.ts`, all `token-schema.ts`, all 204 `theme/**/zbk-*.tokens.json`, and test fixtures:
   - `value` → `$value`, `type` → `$type`, `description` → `$description`
   - `a11y` → `$extensions["dev.zebkit"].a11y`; font metadata fields → `$extensions["dev.zebkit"].font`; `additional` → fold into `$extensions` or delete where unused
2. Update every shape consumer (the ~51 files importing `TokenObject`/`TokenInterface` or reading `.value`/`.type`): `compile-tokens`, `compile-token-helpers` (override merge — including the bare-`value` shorthand path, which becomes bare-`$value`), `token-converter`, `build-type-scale`, `build-space-scale`, `build-helpers`, prune graph/engine, utilities generator, `build-defaults`, `build-editor`, `build-agent-context`, docs-site data utilities (`token-docs`, `token-chain`, `token-lookup`, components reading `default-tokens.json`).
3. Regenerate all generated artifacts (editor schemas, CSS custom data, docs data) via the existing build scripts — they must pick the new shape up from the pipeline, not from hand edits.

**Gate:** golden baseline byte-identical; `npm run check` green; grep for `\.value\b` / `"value":` in token-shape contexts returns only intentional survivors (documented in the PR).

### Phase 2 — Spec types and structured values, one family at a time

Each sub-phase: retype per D5, restructure values, extend the **serializer** (the structure→CSS layer in `token-converter`) — landing with the golden diff still byte-identical. Order chosen so the riskiest lands earliest with the most review room.

**2a. Dimensions (2–3 d).** All px/rem length tokens become `{value, unit}` objects; `%`/`ch`/`em`/`calc()` lengths become `cssDimension` (string value, proprietary). The fluid-scale resolvers (`resolveTypeScale`, `resolveSpaceScale`) read structured floors and must reproduce today's `clamp()` strings exactly — this is the sub-phase the byte-identity gate exists for. `setting` tokens (`max-scale`, viewport anchors) stop being pseudo-tokens: they move to `$extensions["dev.zebkit"].scale` on the module/group level, and the resolvers read them from there. The `rootFontSize` step shape (`index`, optional pinned value) moves under the same extension.

**2b. Color (3–5 d).** The inversion (D7):
   - Author the palette as color tokens (hue/sat per family + shared lightness ramp can stay *generative* — a small build step may compute the ramp into the token map, but the ramp definition now lives in token space, not SCSS).
   - Generate the SCSS palette variables from those tokens; retire `paletteMap` and the docs site's SCSS parsing (`copy-tokens.js` palette codepath reads tokens instead).
   - Literal color strings and `transparent` (D8) become structured values or aliases; alias validation flips to closed-world (I5).
   - Serializer emits the same CSS color notation the SCSS emits today (hsl) so the baseline holds.

**2c. Shadows (0.5–1 d).** Parse elevation + component `boxShadow` strings into shadow-object arrays (one-time, by codemod with human review); serializer reproduces the exact current strings. `none` becomes… a proprietary-typed token or an empty-array convention — pick in-PR, record in D-table if it generalizes.

**2d. Transition split (1–2 d).** `transition`-typed tokens split into `duration` (`{value, unit}`), `cubicBezier` (`[x1,y1,x2,y2]`), and `transitionProperty` (proprietary). Update `tokenCompatibilityMap` (rekeyed across all of Phase 2 as types migrate) and any utility manifest bindings that referenced the old single type.

**2e. Numbers & typography leftovers (1–2 d).** `opacity`/`zIndex`/`lineHeight` → `number`; `fontWeight` → spec `fontWeight`; `fontFamily` value normalizes to string-or-array with loading metadata already under `$extensions` (from Phase 1); `borderStyle` → `strokeStyle`. `tokenAliasMap` virtual targets (`font-weight.bold`, `tracking.*`) get materialized as real tokens and the map is retired (completing I5).

**Gate (each sub-phase):** golden baseline byte-identical; `npm run check` green; the migrated family's entries validate against the spec-type value shapes.

### Phase 3 — Spec-valid documents (2–3 d)

The interchange layer becomes real DTCG.

1. Exported artifacts (`writeTokensToFile` outputs, `build:defaults` snapshots, docs `default-tokens.json`) become DTCG documents: nested groups (module → group), group-level `$type` where a module is homogeneous, `_key`/`_layer` sidecar fields replaced by `$extensions["dev.zebkit"]` metadata. Combined and per-module modes both stay; per-module files use the `zbk-<module>.tokens.json` naming (already spec-extension-compatible).
2. Theme override ingestion (`applyCustomOverrides` path) reads DTCG documents: group nesting, group `$type` inheritance, bare-`$value` shorthand; rejects `$ref`/`$extends` per D6 with actionable errors. The 204 theme files were already migrated in Phases 1–2; this step is about accepting *external* documents too.
3. Zod strategy consolidation: one generic DTCG-document schema + per-module refinements replaces the 55 near-identical `token-schema.ts` files where possible (net deletion; modules keep a schema file only if they have module-specific constraints).
4. Docs static serving emits `application/design-tokens+json` where the host allows.

**Gate:** every full artifact passes Zebkit-profile validation; every strict artifact passes supported-type and reference-closure validation; export → re-ingest produces an identical build; the golden baseline remains byte-identical.

### Phase 4 — Locks (2–3 d)

Turn alignment from "true today" into "can't silently become false."

1. Add DTCG document validation of exported artifacts to `npm run check` (spec JSON Schema or a maintained validator; pin its version).
2. Strict-mode export (D9) + drop-manifest, with a test asserting the strict document contains only spec types.
3. Proprietary-type registry exported in `allowed-token-types.json` with spec/proprietary provenance marked.
4. Regenerate + drift-check editor schemas, CSS custom data, agent context. Delete the codemod (D11). Retire the golden-baseline runner from `npm run check` **only if** the team prefers; recommendation: keep it — it is cheap and is the ultimate output-stability lint.

**Gate:** `npm run check` green including the new validation; deleting any `$`-field from a random token fails the build with a useful message.

### Phase 5 — Docs & doctrine (0.5–1 d)

1. Update `src/tokens/README.md`, `src/definitions` docs, CLAUDE.md's token-entry snippet, and the token-module workflow docs to the DTCG shape.
2. VISION.md: one addendum sentence in "For AI agents and tooling" (the interchange format is DTCG 2025.10; extensions under `dev.zebkit`), plus the D7 primitive-override policy sentence.
3. CHANGELOG `[Unreleased]` → `### Changed`: the format alignment, palette inversion, and export changes, as user-visible facts.

**Gate:** `npm run docs:build` green; no doc references the old `{value, type, description}` shape except historical notes.

---

## Sequencing & effort recap

Phases 0 → 1 are strictly ordered. 2a–2e are independent after 1 (parallelizable across branches if desired; 2b is the long pole and should start first). 3 requires all of 2; 4 requires 3; 5 rides last.

Total: **~14–23 focused days.** See README.md for the effort table, risk notes, and everything this plan deliberately does not do.

## Rollback posture

Until Phase 3 merges, every phase is output-invariant (I1–I3), so rollback is `git revert` with zero consumer impact. Phase 3+ changes artifact shapes; since the project is pre-release with no published npm artifacts, rollback remains a revert — there is no external migration to unwind. The golden baseline directory is the fixed point: any phase, at any moment, can prove it hasn't changed what ships.
