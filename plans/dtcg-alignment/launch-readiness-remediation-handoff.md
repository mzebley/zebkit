# PR #35 DTCG Launch-Readiness Remediation - Luna Handoff

Status: READY

Target: PR [#35](https://github.com/mzebley/zebkit/pull/35), branch `dtcg-standardiztion`, reviewed remote head `ccca94a21ec787794eeb6f7f44a484f356a9493b`.

This plan supersedes `review-remediation-round-2-handoff.md`. It is the complete remaining launch-readiness scope from the full PR audit, including Luna's current uncommitted remediation. Do not treat it as another additive review round.

## Mission

Finish the DTCG 2025.10 feature so the source build, exported documents, built-in theme presets, installed CLI, strict export, editor schemas, docs data, and generated artifacts all implement the same contract. The final result must fail malformed input with an actionable path, preserve intentional runtime CSS, support the primitive override policy promised by VISION, and be verifiable from a clean packed install.

Do not commit, push, rebase, reset, or discard existing work. Do not edit the golden baseline merely to hide unexplained output changes. Report a conflict before broadening beyond this plan.

This is the definitive remediation scope for launch. Subsequent review is acceptance verification against these findings and gates, not another discovery round. If implementation exposes a new symptom of the same contract defect, place its regression under the closest finding; do not add unrelated cleanup or a new product feature.

## Audit Boundary And Evidence

This handoff is based on a full feature audit, not only a review of the most recent remediation diff. The audit covered the remote PR and Luna's uncommitted work across token definitions, parsing and serialization, reference resolution, scale materialization, override merging, palette generation, CLI `init`/`pull`/`build`, configuration, full and strict exports, default/preset packaging, editor schemas, docs projections, agent context, generated artifacts, baseline enforcement, and GitHub CI.

Current evidence before this plan:

- 40 suites and 566 tests pass, including Luna's added regressions;
- type-check, three integration suites/nine tests, 495 DTCG documents across 11 themes, and 19 byte-identical baseline artifacts pass locally;
- the checked-in theme corpus contains 198 token files with no explicit base-type mismatches, unknown entries, or malformed entry objects;
- the 11 currently generated default/preset collections contain no reference cycles;
- a direct pull-state probe exposes 279 palette entries because it reads obsolete `_cssEmission` metadata, while the next build rejects that generated override file;
- a direct scale probe emits `clamp(1rem, (NaNrem + NaNvw), 1.2rem)` for invalid group controls;
- installed `zebkit-docs` preset ingestion erases eight real app-border aliases because stale empty-placeholder metadata survives the merge;
- remote `verify` fails at reviewed head because `doc-site/static/zebkit/zebkit.js.map` is stale.

Those passing checks establish useful compatibility evidence, but they are not merge clearance because they do not exercise the malformed parser cases, pull round trip, editor negative cases, installed preset parity, packed consumer, or clean generated-artifact guard required below.

## Preserve The Starting State

The worktree contains Luna's uncommitted first and second remediation work plus generated artifacts. Before editing:

```sh
git status --short --branch
git rev-parse HEAD
git diff --stat
git diff --binary HEAD > /tmp/zebkit-dtcg-pre-launch-remediation.patch
git ls-files --others --exclude-standard -z | tar --null -T - -cf /tmp/zebkit-dtcg-pre-launch-untracked.tar
```

Expected branch: `dtcg-standardiztion`. Expected head: `ccca94a21ec787794eeb6f7f44a484f356a9493b` unless Mark explicitly updates it.

## Read First

Read these in order:

1. `CLAUDE.md`
2. `foundations/VISION.md`
3. `foundations/GRAMMAR.md`
4. `plans/dtcg-alignment/plan.md`
5. `plans/dtcg-alignment/phase-2a-worknote.md`
6. `plans/dtcg-alignment/phase-2b-worknote.md`
7. `plans/dtcg-alignment/phase-3-worknote.md`
8. `plans/dtcg-alignment/phase-4-worknote.md`
9. `src/definitions/dtcg.ts`
10. `src/definitions/tokens.ts`
11. `src/definitions/token-maps.ts`
12. `src/scripts/tokens/build-helpers.ts`
13. `src/scripts/tokens/token-converter.ts`
14. `src/scripts/tokens/compile-token-helpers.ts`
15. `src/scripts/tokens/compile-tokens.ts`
16. `src/scripts/tokens/dtcg-document.ts`
17. `src/scripts/tokens/build-tokens.ts`
18. `scripts/build-defaults.ts`
19. `scripts/build-editor.ts`
20. `scripts/check-dtcg-validate.ts`
21. `doc-site/scripts/copy-tokens.js`
22. `doc-site/src/lib/data/compiled-tokens.ts`
23. `doc-site/src/lib/data/color-families.ts`
24. `src/cli/pull-state.ts`
25. `src/scripts/config.ts`
26. `src/scripts/config-schema.ts`
27. `src/scripts/tokens/build-hero-themes.ts`
28. `scripts/build-agent-context.ts`
29. `scripts/build-defaults.ts`
30. `scripts/check-dtcg-baseline.ts`
31. `package.json`

Use only the versioned [DTCG Format Module 2025.10](https://www.designtokens.org/TR/2025.10/format/) and [Color Module 2025.10](https://www.designtokens.org/TR/2025.10/color/) as normative sources. Keep decision D6's deliberate rejection of `$ref` and `$extends`; do not silently claim those forms are supported.

## Locked Decisions

These choices close the ambiguities found during review. Do not re-decide them during implementation.

1. **One structural parser.** Validation, runtime ingestion, strict filtering, editor/default consumers, reference lookup, and flattening use one DTCG traversal contract. Docs may consume a generated flat projection, but may not implement a divergent parser.
2. **One reference model.** A shared helper parses `{module.group.token}`, identifies the module, flattens remaining path segments with `-`, returns the canonical token id and CSS variable, and enumerates whole-value plus composite references. No caller may split on exactly one dot.
3. **Arbitrary-depth curly aliases.** This is required by decision D6. `$root` is supported as the DTCG reserved token name. Map its flattened segment deterministically to `root` and reject a collision with an ordinary flattened `root` path.
4. **Runtime versus literal reads.** `runtime` restores raw CSS and dehydrates generated scale values. `literal` preserves serialized values, types, and provenance. Validation, strict filtering, manifests, and export inspection always use `literal`.
5. **Empty color placeholders remain a runtime-only compatibility surface.** A marked empty color exports as structured transparent and runtime-reads as `""`; literal reads never restore `""`. Any non-empty override clears `emptyColorPlaceholder`, including aliases and raw colors.
6. **Invalid configured overrides are fatal.** A supplied override path is a build instruction, not a suggestion. Invalid structure, type, value, reference, filename, metadata, unknown entry, or unknown module fails with file plus token path. The excluded-component warning may remain non-fatal because exclusion is an explicit config choice.
7. **Raw CSS is type-specific.** Preserve the existing theme corpus, but remove the blanket "any failed string is accepted" escape hatch. A raw value is accepted only when its token type has a defined CSS runtime representation and a truthful export normalization or is a documented proprietary string type.
8. **Primitive overrides are supported.** VISION and decision D7 are binding. Base and overlay overrides to `zbk-color.tokens.json` must compile, export, validate, appear in editor schemas, and affect dependent aliases. Do not change VISION to preserve the current rejection.
9. **Supported types are one registry.** Distinguish the complete DTCG vocabulary from the subset Zebkit can emit/ingest. Strict export keeps only supported spec types that have a value schema and serializer. The allowed-types artifact, validator, TypeScript types, editor generator, and strict filter derive from the same data.
10. **Metadata is not disposable.** Preserve `$description`, `$deprecated`, and unknown vendor `$extensions` when processing and re-emitting a token. Merge `dev.zebkit` fields deliberately and remove transient markers when their triggering condition no longer applies.
11. **No generated-artifact exception.** The remote PR currently fails `verify` because `doc-site/static/zebkit/zebkit.js.map` is stale at the pushed head. All generated artifacts must be current in the final pushed commit, and CI must be green on that exact SHA.
12. **Name the interoperability profile truthfully.** Zebkit's full export is a "Zebkit DTCG 2025.10 profile" because it contains proprietary `$type` values and deliberately rejects `$ref`/`$extends`. Reserve "DTCG 2025.10 conformant" for strict artifacts that use only the supported standard type subset and satisfy the normative structural, value, metadata, and reference rules.

## Confirmed Findings

### P0 - Merge blockers

1. **Reference handling is neither D6-complete nor safe.** `token-converter.ts` and `build-helpers.ts` require exactly two path segments; `dtcg-document.ts` flattens nested groups but does not canonicalize nested targets. Composite shadow references serialize without the `--zbk-` prefix and bypass existence/type checks. Reference cycles are never detected. `validateDtcgDocuments` can throw before returning diagnostics when parsing fails.
2. **The parser silently accepts invalid documents.** `flattenInto` skips primitive members, arrays, unknown `$` properties, and invalid names. A token object can contain `$value` plus children without an error. `$root` is dropped. Token/group names beginning with `$` or containing `.`, `{`, or `}` are not validated. An invalid document can therefore validate as an empty collection.
3. **Literal validation mutates data and accepts a missing value.** `fromDtcgDocument(..., { mode: 'literal' })` currently restores marked empty colors to `""`, and `validateDtcgDocument` special-cases that invalid literal as valid. A marker can also manufacture `""` when `$value` was absent. Literal mode must never restore runtime placeholders.
4. **Bundled presets are already corrupted.** `mergeTokens` retains `emptyColorPlaceholder` after a real preset value replaces the empty default. The generated `dist/cli/presets/zebkit-docs/zbk-app.json` contains eight real `{brand.border...}` aliases with the stale marker; runtime ingestion turns all eight back into `""`. Existing installed-CLI smoke tests do not compare those tokens or CSS with the source build.
5. **The primitive override promise is explicitly rejected and the pull path contradicts itself.** `compile-tokens.ts` throws for `zbk-color.tokens.json`, `build-editor.ts` omits its schema, and the integration test asserts rejection. Meanwhile `pull-state.ts` still checks the removed `_cssEmission` sidecar rather than `$extensions["dev.zebkit"].cssEmission`, so `init`/`pull` can write the palette override file that the next build rejects. This contradicts `foundations/VISION.md` and locked decision D7. Layered converter output cannot simply override the current unlayered palette SCSS, so base and scoped overlay emission require deliberate unlayered override output.
6. **Override failures can silently ship defaults or invalid CSS.** Invalid group extensions warn and disappear; invalid entries, unknown entries, and broad merge failures warn and retain defaults. The live DTCG gate then validates the fallback build instead of the authored theme. An arbitrary non-alias string is accepted after any Zod failure, including invalid `number`, `boolean`, `fontWeight`, and `strokeStyle` values. Group `scale` metadata is an unconstrained string/number record, so misspelled controls and nonnumeric viewport/base/ratio values can survive parsing and reach scale math as `NaN`.
7. **Editor schemas advertise invalid inputs, reject supported structure, and omit a supported module.** `build-editor.ts` emits `string | number` for nearly every type, so schemas accept numeric colors, numeric shadows, arbitrary font weights, and other invalid values while omitting structured DTCG values. Its flat-only shape also rejects nested groups and `$root` even though the runtime DTCG boundary accepts them. There are no negative schema tests. The primitive palette schema and association are skipped despite the launch contract supporting primitive overrides.

### P1 - Contract and interoperability defects

8. **Raw CSS-to-DTCG reference parsing is ambiguous.** `var(--zbk-accent-primary-canvas)` becomes `{accent.primary-canvas}` because the regex assumes a one-segment module. Resolve CSS custom properties against an exact generated lookup, not a first-hyphen split.
9. **Raw shadow normalization accepts too little CSS and validates too late.** It requires color last and three or four dimensions, although valid box shadows may have two dimensions and place color first. It also needs shared composite reference validation. Either use a proven value parser already available to the project or define and test the exact supported grammar; unsupported values must fail only when a DTCG export is requested, with the full path.
10. **The value registry is internally inconsistent.** Shadow arrays reject references despite DTCG 9.6; the bespoke font-family schema accepts numbers; generic public `TokenObject` inference loses value safety through `z.any()`; numeric schemas do not consistently guarantee finite JSON numbers. The full DTCG list includes `border`, `transition`, `gradient`, and `typography`, but the validator cannot validate them; the proprietary list includes `cursor` and `transform`, but the allowed registry cannot author them.
11. **Strict export and normal validation can disagree.** `isDtcgSpecType` recognizes spec types without corresponding Zebkit validators, so strict filtering can retain a type that validation then rejects. Strict reference pruning needs the same canonical reference graph and cycle detection as normal validation. Keep/drop order and manifest output must be deterministic.
12. **Theme metadata is discarded or left stale.** Override `$description` values are ignored, unknown vendor extensions cannot survive the group boundary, `$deprecated` is unsupported, and only font metadata is selectively merged. The pull projection preserves only root `$extensions`, not the complete group metadata contract. This contradicts the format requirement to preserve extension data a processor does not understand and makes pulled and exported preset documents less truthful than their source theme files.
13. **Docs data has a second, weaker DTCG implementation.** `copy-tokens.js` expands only one level and silently drops metadata. `compiled-tokens.ts` omits `none` color components, boolean/font-family array values, shadow references, and transient metadata. `color-families.ts` stringifies structured values as `[object Object]` and uses marker-blind filled-state logic. `build-hero-themes.ts` silently omits non-string structured overrides. Generated agent context shares the composite reference serialization defect.
14. **The installed/exported path is under-tested.** A unit test called "every exported default snapshot" validates only `doc-site/static/zebkit/default-tokens.json`, while the package ships `dist/cli/defaults/*.json` plus all preset directories. The existing bundled CLI test checks two unrelated declarations and misses the preset corruption. There is no packed-install parity test for full export, strict export, overlays, primitive overrides, schema availability, pulled-token rebuilds, or unmanifested stale files.

### P2 - Launch polish and drift

15. **`exportStrict` can silently do nothing.** The schema says it requires `exportTokens`, but no conditional validation enforces that relationship and the feature lacks user-facing configuration documentation and examples. The baseline helper also forces `exportTokens: false` without clearing `exportStrict`, which will become an invalid internal config once the relationship is enforced.
16. **Central-definition drift is checked in.** `ZEBKIT_EXTENSION_SUBKEYS` omits new fields and `LEGACY_TYPE_MIGRATION` is dead post-migration data with stale comments. Remove migration-only exports that have no callers or make the live registry derive from them; do not keep two truths.
17. **Generated/CI state is not mergeable yet.** Luna's local remediation is uncommitted, the remote head still has the stale source map, and remote `verify` is failing. Snapshot and palette generators also do not consistently remove retired output files/directories, so a successful regeneration can leave unmanifested package debris. Local unit/type/DTCG/baseline results are useful but do not prove a clean generated-artifact guard or the packed consumer path.
18. **The public conformance claim is stronger than the implementation contract.** VISION, the alignment plan/README, token docs, validation output, and the Unreleased changelog describe full exported artifacts, theme overrides, and docs data as DTCG 2025.10 conformant, while full artifacts contain proprietary `$type` values and decision D6 rejects standard `$ref`/`$extends` forms. The Unreleased changelog also preserves obsolete claims that palette pull/override is rejected, `_cssEmission` is still a snapshot sidecar, and the strict API is singular. `plans/components/00-conventions.md` still requires every component's removed `token-schema.ts` in its Definition of Done. Keep the locked product decisions, but distinguish the interoperable Zebkit profile from the strictly conformant export and reconcile all current documentation with final behavior.

No separate security blocker was found. The primary security-adjacent risk is CSS/input injection through the intentionally raw theme surface; the type-specific validation work below must keep that surface explicit instead of broadening it accidentally. No material performance regression was found; keep graph operations linear in tokens plus references and avoid rebuilding token lookups inside per-entry loops.

## Implementation Plan

### 1. Add failing regressions before refactoring

Add focused tests that reproduce every P0/P1 item. Confirm each new test fails against the current worktree before implementation.

Required fixtures and assertions:

- nested `{module.group.token}` reference resolves to the flattened internal entry and `--zbk-module-group-token`;
- malformed nested reference returns an error rather than throwing;
- two-node and three-node cycles report every token plus the cycle chain;
- cycles reached through a shadow sub-value and shadow-array reference fail;
- a shadow sub-value serializes `var(--zbk-spacing-025)`, never `var(--spacing-025)`;
- missing/wrong-type shadow sub-value references fail conversion and collection validation;
- invalid names, primitive group members, arrays, unknown reserved properties, and `$value` plus children fail with paths;
- `$root` parses, resolves, flattens deterministically, and collision detection fails clearly;
- literal empty placeholders remain structured transparent; runtime mode alone restores `""`;
- a missing `$value` remains missing and fails even when the marker is present;
- a non-empty override clears the marker for structured values, aliases, and supported raw CSS;
- the eight `zebkit-docs` app-border aliases survive `build:defaults` runtime ingestion;
- invalid override value/type/group metadata/unknown entry makes the build reject, not warn-and-fallback;
- unknown or nonnumeric type/space scale controls fail before scale resolution; generated CSS contains no `NaN` or non-finite number;
- a valid raw corpus fixture remains accepted; invalid string values for numeric/boolean/font-weight/stroke-style tokens fail;
- `var(--zbk-accent-primary-canvas)` normalizes to `{accent-primary.canvas}` via exact lookup;
- shadow arrays accept explicit objects, references, and mixed entries;
- the bespoke font-family schema rejects numbers and accepts string arrays;
- NaN and infinities are rejected before JSON serialization;
- unknown entry and group extensions plus `$deprecated` survive a read/write round trip;
- strict filtering cannot keep a type unsupported by Zebkit's value registry;
- editor schemas accept representative structured values/aliases and reject representative wrong types;
- editor schemas accept nested groups, `$root`, standard group metadata, and unknown vendor extension namespaces without accepting unknown reserved `$` properties;
- docs flattening handles a nested fixture and structured colors without `[object Object]`;
- a structured hero-theme override appears in the generated hero diff instead of disappearing;
- `init`/`pull` output, including `zbk-color.tokens.json`, rebuilds successfully without manual deletion;
- regenerated defaults/presets/palette outputs contain no retired files or unmanifested theme directories;
- `exportStrict: true` with `exportTokens: false` fails configuration validation with the fix.

### 2. Build the single type and value registry

Refactor `src/definitions/dtcg.ts` and `src/definitions/tokens.ts` first.

1. Keep `DTCG_TYPES` as the complete normative vocabulary.
2. Add an explicit `ZEBKIT_SUPPORTED_SPEC_TYPES` for types with an implemented value schema and CSS/export behavior.
3. Define `ALLOWED_TOKEN_TYPES` from supported spec plus proprietary types; make Zod enum, TypeScript union, strict filter, allowed-types artifact, and editor generator derive from it.
4. Resolve `cursor` and `transform` drift: include them with string schemas as decision D4 requires, or update the locked decision table and registry together if there is a documented reason to remove them. Do not leave them half-supported.
5. Define a typed value-schema registry and a public `TokenValue` union. Do not expose `$value: any` through `TokenObject`.
6. Reuse the same `fontFamilyValueSchema` in generic and bespoke schemas.
7. Add shadow-array references and exact composite sub-value schemas.
8. Add finite-number checks throughout colors, dimensions, durations, cubic Beziers, font weights, and numbers.
9. Add `$deprecated` and extension-preserving types. `$extensions` accepts unknown vendor keys; validate known `dev.zebkit` fields without stripping other data.
10. Replace the open-ended group `scale` record with module-specific control contracts. Reject unknown controls, non-finite/non-numeric inputs, invalid units, non-positive ratios/scales, and invalid viewport ranges before either resolver runs.
11. Remove dead migration tables after confirming no runtime/generator caller, or make them the actual source of the live artifact. Update extension-subkey documentation to match reality.

Gate: registry unit tests, TypeScript type tests where practical, `npm run type-check`, and generated allowed-types data all agree.

### 3. Replace flattening with a validating DTCG traversal

Refactor `src/scripts/tokens/dtcg-document.ts` around one traversal result containing entries, metadata, original paths, and reference edges.

The traversal must:

- distinguish token, group, and `$root` structurally;
- reject token/group name violations and flattened-name collisions;
- reject a token that also has child tokens/groups;
- reject non-object children and arrays where a group/token is required;
- recognize only 2025.10 token/group properties plus the deliberate D6 rejection keys;
- inherit the nearest group `$type` and infer a missing alias type from its resolved target when no group type exists;
- preserve token/group `$description`, `$deprecated`, and all extension vendor data;
- return diagnostics with the original document path;
- keep runtime and literal transformations as an explicit post-parse projection, never as structural parsing side effects.

`validateDtcgDocument` and `validateDtcgDocuments` must never throw for bad user documents. Collection validation should skip reference checks only for entries that could not be structurally parsed, while returning all usable diagnostics in stable order.

Gate: the malformed-structure table, nested groups, `$root`, alias type inference, extension preservation, and literal/runtime tests pass.

### 4. Centralize references and graph validation

Create a focused helper module such as `src/scripts/tokens/token-references.ts`. It owns:

- parsing and canonicalizing arbitrary-depth curly references;
- exact token-id to CSS-variable conversion;
- exact CSS-variable to token-id lookup using the built token collection;
- enumeration of whole-value and supported composite sub-value references;
- reference existence and type compatibility through `areTokensTypesCompatible`;
- deterministic cycle detection with an actionable chain;
- reverse dependencies for overlay emission closure and strict pruning.

Replace the independent implementations in:

- `token-converter.ts`;
- `build-helpers.ts` (`computeEmissionClosure`);
- `dtcg-document.ts` validation and strict pruning;
- raw CSS normalization;
- any agent-context or docs serializer that renders aliases.

Serialize composites through a resolver-aware function. Do not let `serializeShadowReference` manufacture a CSS variable without collection context.

Gate: nested, hyphenated-module, composite, missing-target, incompatible-target, cycle, reverse-closure, and CSS-prefix regressions all pass.

### 5. Make override ingestion strict and metadata-aware

Refactor `compile-token-helpers.ts` and `compile-tokens.ts`.

1. Parse an override through the structural DTCG traversal before merging.
2. Validate each override against the base entry's effective type. An explicit incompatible `$type` is an error; omission may inherit the base contract.
3. Make unknown entries/modules and malformed known extensions fatal with filename and token path. Preserve the excluded-component warning exception.
4. Replace catch-all warnings with thrown aggregate diagnostics. Do not validate a fallback build after discarding input.
5. Replace the broad failed-string escape hatch with a type-aware raw policy.
6. Merge supported metadata: override `$description` and `$deprecated` when supplied, preserve unknown vendor extensions, field-merge known `dev.zebkit` data, and clear `emptyColorPlaceholder`, `rawCssValue`, `originalType`, or scale provenance when the new value makes it stale.
7. Keep shorthand values supported, but run them through the base entry's schema and raw policy.

Gate: all checked-in themes still compile; intentionally malformed copies fail; built-in theme descriptions and extensions survive export; the installed preset marker regression is fixed.

### 6. Harden raw CSS normalization

Keep raw runtime CSS byte-compatible for the checked-in corpus. Move export normalization behind one type-aware API shared with override validation.

- Color: preserve the current supported corpus and exact CSS-variable lookup. Add tests for every accepted form and explicit failures for unsupported forms.
- Dimension/duration/cubicBezier: validate the normalized structure through the canonical registry after parsing.
- Shadow: support two-to-four dimension box-shadow forms with a required supported color, color-first or color-last, multiple layers, `inset`, and exact variable references. Prefer an existing proven CSS value parser if available; otherwise document the accepted grammar in code and cover it exhaustively.
- Empty color: only a marked runtime placeholder can normalize to transparent; literal validation sees the transparent value.
- Other spec types: no raw string bypass unless the registry explicitly defines one.
- Proprietary string types: accept strings through their declared schema, not an exception catch.

Every export failure names file/module/token and the unsupported raw value. CSS-only builds may preserve a supported runtime string, but a requested DTCG export must fail rather than fabricate a value.

Gate: current theme CSS remains byte-identical except for changes explicitly approved elsewhere in this plan; all full/strict exports validate.

### 7. Implement primitive palette overrides end to end

Remove the rejection in `compile-tokens.ts` and replace its test with success cases.

Required behavior:

1. `zbk-color.tokens.json` accepts structured DTCG colors, aliases of compatible color type, and supported raw CSS colors.
2. Base overrides emit after the generated primitive palette in an **unlayered** `:root` block so they actually win against the unlayered generated SCSS.
3. Overlay overrides emit an unlayered scoped selector block. Do not place them only inside `@layer theme`, which loses to unlayered root declarations.
4. Overlay reverse closure re-emits dependent aliases/components as needed using the shared graph.
5. `extendedTokens.colors: "smart"` retains every family required by references and explicit primitive overrides.
6. Full and strict exports contain the overridden primitive values and remain reference-closed.
7. `build-editor.ts`, repository `.vscode` associations, installed editor schemas, `init`, and `pull` expose the palette override schema. Read emission metadata from the DTCG group extension rather than removed `_cssEmission` sidecars; a fresh full pull must be immediately buildable.
8. Pruning never removes a primitive override that a retained alias or overlay needs.

Add base, overlay, smart-color, strict-export, prune, source-build, and bundled-CLI integration tests. Assert computed declaration order/layering in CSS text, not only that a variable name appears.

Gate: VISION's primitive override example works through source CLI and packed installed CLI with identical CSS.

### 8. Align strict export, editor schemas, docs, and context

1. Strict conversion operates on literal parsed entries and keeps only `ZEBKIT_SUPPORTED_SPEC_TYPES`.
2. Run cycle/existence/type validation before and after pruning. Drop manifests use stable module/entry order and record direct plus transitive reasons.
3. Decide and test empty strict modules consistently; recommendation: omit empty module documents while retaining all drops in the manifest.
4. Generate editor value definitions from the canonical value-schema registry or a deliberate JSON-schema mapping beside it. Do not parse TypeScript source with a regex to discover allowed types.
5. Parse snapshots for schema generation in literal mode so runtime placeholder restoration or scale dehydration cannot alter the authoring contract. Add AJV positive and negative tests for every supported spec type, every proprietary type, aliases, group extensions, `$deprecated`, and primitive files.
6. Include nested-group and `$root` authoring forms in the editor contract. Preserve unknown vendor extension namespaces while rejecting unknown reserved `$` properties.
7. Replace `copy-tokens.js`'s one-level expansion with a generated flat projection produced by the shared source-side DTCG boundary, or generate the exact flat docs data during `build:defaults`. The decoupled docs build should consume data, not reinterpret DTCG.
8. Correct `compiled-tokens.ts` to model all shipped values and extensions. Use canonical serialization for displayed values; never `String(structuredValue)`.
9. Make `build-hero-themes.ts` serialize supported structured override values rather than filtering them out because they are not strings.
10. Ensure semantic empty markers render as intentionally unfilled in docs while real structured colors render correctly.
11. Rebuild agent context after the reference serializer fix and assert no generated context contains `var(--spacing-...)`, `var(--app-...)`, `[object Object]`, `NaN`, or `undefined`.

Gate: editor negative tests, docs build, context drift check, and generated-data sentinel scan pass.

### 9. Enforce configuration and document the launch surface

1. Reject `tokens.exportStrict: true` unless `tokens.exportTokens: true`, in runtime validation and generated JSON schema.
2. When an internal helper deliberately disables token export, including `toBaselineTokensConfig`, it must also force `exportStrict: false`. Add a baseline-config regression so internal derived config remains valid.
3. Add concise config examples for combined and per-module full/strict exports, output filenames, and drop manifests.
4. Document supported nested curly aliases, deliberate `$ref`/`$extends` rejection, empty runtime placeholders, raw CSS export limits, primitive overrides, strict supported-type subset, and failure behavior.
5. Replace unqualified conformance claims with two explicit contracts: full output is the "Zebkit DTCG 2025.10 profile" and strict output is "DTCG 2025.10 conformant" after validation. Apply the same terminology to VISION, the alignment plan/README, token docs, configuration docs/schema, CLI help, validator output, generated context, and tests.
6. Update the VISION DTCG link to the versioned 2025.10 report. Preserve the product policies themselves, including D6 and D7; change only claims that incorrectly imply full interoperability.
7. Reconcile the existing Unreleased `CHANGELOG.md` entries instead of appending a contradictory summary: remove claims about `_cssEmission` sidecars, rejected palette overrides/pull omission, per-document-only validation, the singular strict API, and unqualified conformance; record the final primitive and strict-export behavior plus any approved CSS change.
8. Correct `plans/components/00-conventions.md` and stale source comments that still require one `token-schema.ts` per component. Remove stale text claiming palette overrides are rejected, parser depth is two segments, invalid overrides are ignored, every DTCG spec type is supported, or current JSON snapshots still use legacy sidecars.

Gate: config schema tests, docs build, stale-text search, and examples exercised by integration tests.

### 10. Restore artifact and release integrity

Before regeneration, make each owned generator reconcile its output set: clear only its dedicated generated directory or explicitly delete files/directories absent from the new manifest. `build:defaults` must remove retired module snapshots and retired preset directories; `generate:palette` must reject or remove retired family partials. Never clear a mixed user output directory.

Regenerate from the final source in dependency order:

```sh
npm run generate
npm run build:tokens -- --config theme/zebkit.docs.config.json
npm run build:hero-themes
npm run build:defaults
npm run build:components
npm --prefix doc-site run sync:generated
npm run build:context
npm run build:editor
npm run build:cli
```

Inspect `git diff --stat`, `git diff --check`, every generated token snapshot, editor schema, allowed-types artifact, context file, component bundle/source map, and baseline diff. Generated churn must have a named source change.

If the intentional primitive-override implementation changes no existing configured theme, the golden CSS baseline remains byte-identical. If strict validation forces a real correction to existing output, stop and report the exact declaration-level diff before using `--update`; after approval, update the baseline with its built-in two-build determinism check.

## Verification Matrix

Run focused checks while implementing:

```sh
npm test -- --runInBand src/scripts/tokens/dtcg-document.test.ts
npm test -- --runInBand src/scripts/tokens/token-converter.test.ts
npm test -- --runInBand src/scripts/tokens/compile-tokens.test.ts
npm test -- --runInBand src/scripts/tokens/build-tokens.test.ts
npm test -- --runInBand src/scripts/tokens/build-type-scale.test.ts
npm test -- --runInBand src/scripts/editor-schema.test.ts
npm run type-check
npm run check:palette
npm run check:dtcg-validate
npm run check:dtcg-baseline
npm run check:context
npm run test:integration
npm run check:docs
```

Add an installed-artifact parity suite that performs all of these against freshly generated `dist/cli/defaults` and every `dist/cli/presets/<theme>` directory:

- validate each per-module snapshot and the collection;
- runtime-ingest and build CSS;
- compare source-path and bundled-snapshot declarations for each built-in theme;
- assert the eight `zebkit-docs` app-border aliases survive;
- build a primitive base override and a primitive overlay;
- export combined and per-module full plus strict artifacts;
- verify strict documents contain only supported spec types and have closed references;
- compile every shipped editor schema and validate positive/negative fixtures;
- run `zebkit pull` and rebuild from the pulled token files;
- assert every file below defaults/presets is named by a current manifest or explicitly belongs to the fixed package contract.

### Packed consumer smoke test

After the disposable-clone check below passes, create the tarball from that clean verification clone and install it into a fresh fixture. Do not run `npm pack` in Luna's working tree, and do not rely on repository `node_modules` or source TS imports:

```sh
cd "$VERIFY_DIR"
PACK_DIR="$(mktemp -d /tmp/zebkit-dtcg-pack.XXXXXX)"
npm pack --pack-destination "$PACK_DIR"
git status --short
FIXTURE_DIR="$(mktemp -d /tmp/zebkit-dtcg-consumer.XXXXXX)"
cd "$FIXTURE_DIR"
npm init -y
npm install "$PACK_DIR"/*.tgz
./node_modules/.bin/zebkit init
./node_modules/.bin/zebkit build
./node_modules/.bin/zebkit pull
./node_modules/.bin/zebkit build
```

Use non-interactive fixture config/dependency injection where required. Assert the installed package contains defaults, all presets, context, palette schema, config schema, CSS custom data, CLI bundle, component bundle, and source map.

### Clean generated-artifact proof

The current working tree cannot prove `npm run check` while intentional generated changes remain uncommitted. Verify with an ephemeral commit in a disposable local clone:

```sh
git diff --binary HEAD > /tmp/zebkit-dtcg-launch.patch
git ls-files --others --exclude-standard -z | tar --null -T - -cf /tmp/zebkit-dtcg-launch-untracked.tar
VERIFY_DIR="$(mktemp -d /tmp/zebkit-dtcg-launch-verify.XXXXXX)"
git clone --no-hardlinks . "$VERIFY_DIR"
git -C "$VERIFY_DIR" apply /tmp/zebkit-dtcg-launch.patch
tar -xf /tmp/zebkit-dtcg-launch-untracked.tar -C "$VERIFY_DIR"
npm --prefix "$VERIFY_DIR" ci --ignore-scripts
git -C "$VERIFY_DIR" add -A
git -C "$VERIFY_DIR" commit -m "Temporary DTCG launch verification"
npm --prefix "$VERIFY_DIR" run check
git -C "$VERIFY_DIR" status --short
```

The final disposable status must be empty. After Mark approves and the real changes are committed/pushed, wait for GitHub CI on that exact SHA and require every check, including `verify`, to pass.

## Acceptance Checklist

- [ ] Every confirmed finding has a regression test and implementation fix.
- [ ] All new regression tests were observed failing before their fixes.
- [ ] Arbitrary-depth curly references resolve consistently in validation, CSS, overlays, strict export, docs, and context.
- [ ] Whole and composite reference cycles fail with a complete chain.
- [ ] Malformed documents return actionable diagnostics and never validate as empty by accident.
- [ ] Literal reads never restore runtime placeholders or raw authoring values.
- [ ] Runtime reads preserve the intended CSS and dehydrate generated scale values.
- [ ] No stale `emptyColorPlaceholder` marker survives a non-empty override.
- [ ] Source and bundled builds for every built-in preset have identical token values and CSS declarations.
- [ ] Invalid configured overrides are fatal; no warning-and-default fallback remains for malformed input.
- [ ] Invalid or unknown scale controls fail before CSS generation; no output contains `NaN` or a non-finite number.
- [ ] Primitive base and overlay overrides work through source and packed CLI paths.
- [ ] A fresh `init`/`pull` token set rebuilds unchanged, including the primitive palette file.
- [ ] Smart color selection and pruning retain required primitive overrides.
- [ ] TypeScript, runtime Zod, DTCG validation, strict filtering, allowed-types JSON, and editor schemas share one registry.
- [ ] Shadow arrays/references, font-family arrays, finite numbers, exact weights, and exact stroke keywords validate correctly.
- [ ] Unknown vendor extensions and `$deprecated` survive processing/re-export.
- [ ] Strict outputs contain only supported spec types and are reference-closed and cycle-free.
- [ ] Editor schemas reject invalid representative values and include `zbk-color`.
- [ ] Editor schemas accept supported nested groups, `$root`, group metadata, and unknown vendor extension namespaces.
- [ ] Structured hero-theme values survive docs diff generation.
- [ ] Docs and agent context contain no broken variable prefixes, `[object Object]`, `NaN`, or `undefined`.
- [ ] `exportStrict` configuration cannot silently no-op.
- [ ] Full-profile and strict-conformance terminology is consistent across VISION, docs, schemas, CLI output, generated context, and tests.
- [ ] Full unit, integration, type, DTCG, baseline, docs, and `npm run check` gates pass.
- [ ] Packed consumer smoke test passes without source imports.
- [ ] Generated artifacts and source map are committed from the final source state.
- [ ] Generated defaults, presets, palette partials, and package contents contain no retired or unmanifested artifacts.
- [ ] GitHub CI is green on the exact pushed head intended for merge.
- [ ] Luna's implementation worktree was not reset, rebased, or committed without Mark's approval.

## Completion Report

Return one report containing:

1. A finding-by-finding table mapping all 18 findings to code and regression tests.
2. The final type registry and the supported spec/proprietary sets.
3. The structural parser and reference helper APIs plus every caller migrated to them.
4. Runtime/literal read behavior and the generated/pinned/empty/raw lifecycle.
5. Primitive base/overlay emission details, including why the cascade wins.
6. Source-versus-bundled parity results for every built-in theme.
7. Strict export counts by surviving type and drop reason, with zero unsupported survivors.
8. Exact verification commands and outcomes, including packed install and disposable-clone `npm run check`.
9. Generated artifacts changed and the source change responsible for each category.
10. Final `git status --short`, with all implementation changes left uncommitted unless Mark explicitly authorizes otherwise.
11. Any remaining blocker. Do not report the work complete with a skipped required gate.
12. Every user-facing location changed from an unqualified DTCG conformance claim to the full-profile/strict-conformance terminology.
