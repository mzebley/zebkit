# PR #35 DTCG Remediation Round 2 - Luna Handoff

Status: READY

Target: PR [#35](https://github.com/mzebley/zebkit/pull/35), branch `dtcg-standardiztion`, reviewed head `ccca94a21ec787794eeb6f7f44a484f356a9493b`.

## Mission

Remediate the six post-implementation findings below without losing Luna's current uncommitted work. The result must preserve runtime CSS, make the exported DTCG view truthful, and make the validation gate catch every reproduced failure.

Do not commit, push, rebase, reset, or regenerate unrelated artifacts. Report a conflict before changing scope.

## Preserve The Starting State

The worktree already contains the first remediation round. Before editing:

```sh
git status --short --branch
git rev-parse HEAD
git diff --stat
git diff --binary > /tmp/zebkit-luna-round-1.patch
```

Expected branch: `dtcg-standardiztion`. Expected head: `ccca94a21ec787794eeb6f7f44a484f356a9493b` unless Mark explicitly updated it. Do not discard any existing modifications or generated artifacts.

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
12. `src/scripts/tokens/build-type-scale.ts`
13. `src/scripts/tokens/compile-token-helpers.ts`
14. `src/scripts/tokens/dtcg-document.ts`
15. `scripts/check-dtcg-validate.ts`

Use only the versioned [DTCG Format Module 2025.10](https://www.designtokens.org/TR/2025.10/format/) and [Color Module 2025.10](https://www.designtokens.org/TR/2025.10/color/) as normative sources.

## Findings To Fix

### F1. Generated scale provenance freezes runtime overrides

`resolveTypeScale` returns any entry marked `valueSource: "generated"` unchanged. After loading an exported snapshot:

- changing group scale controls retains the old clamp;
- overriding one step with `3rem` retains the generated marker and skips the a11y wrapper;
- installed-CLI behavior differs from a source build.

### F2. Strict filtering can retain a proprietary literal type

Strict collection filtering uses `fromDtcgDocument` in runtime-restoration mode. A full export containing raw `dimension: "50%"` is normalized to `cssDimension`, restored to `dimension` for filtering, kept, and then emitted back as proprietary `cssDimension`. The drop manifest is empty and the current strict gate reports success.

### F3. Unsupported raw shadows silently become `none`

`normalizeExportEntry` uses `parsed ?? []`. A raw shadow such as `var(--brand-shadow)` is therefore exported as an empty shadow array even though the runtime value is not `none`.

### F4. `none` in an sRGB shadow color serializes as `NaN`

`serializeShadowColor` casts all sRGB components to numbers. DTCG permits `none`, so a valid structured shadow can currently emit `rgb(NaN 0 0)`.

### F5. Spec-type schemas remain under-constrained

The registry accepts arbitrary strings and numbers for `fontWeight` and arbitrary strings for `strokeStyle`. It currently accepts `"not-a-weight"`, weight `0`, weight `1001`, and stroke style `"none"`.

### F6. Reference compatibility duplicates and contradicts the shared map

Collection validation hard-codes two compatibility families instead of calling `areTokensTypesCompatible`. It rejects the repository-supported `utility` -> `boolean` relationship and can drift from `src/definitions/token-maps.ts` again.

## Locked Design

Implement two explicit document read modes. Do not add more independent restoration booleans.

```ts
type DtcgReadMode = 'runtime' | 'literal';
```

The modes have these contracts:

| Mode | Raw CSS extension | Generated scale value | Used by |
|---|---|---|---|
| `runtime` | Restore raw `$value` and `originalType` | Remove the materialized `$value`; keep index and authoring metadata | installed/source token builds, overrides, editor consumers that need internal authoring shape |
| `literal` | Keep the serialized `$value` and `$type` exactly | Keep the materialized `$value` and provenance | validation, strict filtering, drop manifests, export inspection |

`fromDtcgDocument` may default to `runtime` for existing build callers, but every validation and strict caller must pass `mode: 'literal'` explicitly. Delete or replace `restoreRawCssValues`; do not leave two APIs that can disagree.

### Generated scale lifecycle

Use this lifecycle exactly:

1. Source authoring has a scale index and no `$value` for generated steps.
2. Export materialization computes one clamp and marks it `valueSource: "generated"`.
3. Literal reads retain that value for conformance and inspection.
4. Runtime reads remove that generated `$value` and transient provenance, returning the indexed authoring shape.
5. `resolveTypeScale` recomputes from the active group controls and applies a11y once.
6. A pinned step retains its authored `$value`; runtime resolution applies a11y once.

Do not compare or hash old controls. Dehydrating generated values at the DTCG-to-runtime boundary is the single source of truth and avoids stale provenance.

`a11yApplied` is unnecessary under this lifecycle. Remove it unless a concrete remaining caller needs it and a test proves that need.

### Strict export lifecycle

Strict conversion must operate only on literal entries:

1. Parse every module with `mode: 'literal'`.
2. Drop every non-DTCG `$type` before reference traversal.
3. Repeatedly drop aliases whose targets are absent or already dropped.
4. Use `areTokensTypesCompatible` for surviving alias checks.
5. Re-emit from the literal kept entries.
6. Validate the final literal collection with `strict: true`.
7. Record every direct and transitive drop with its reason and target.

A strict validation option must explicitly reject any surviving proprietary type. Do not rely on a later `fromDtcgDocument` call with restoration enabled.

## Implementation Order

### 1. Add regression tests first

Add tests that reproduce all six findings before changing implementation. Confirm these new tests fail against Luna's current diff.

#### Scale round-trip tests

In `src/scripts/tokens/dtcg-document.test.ts` or `build-type-scale.test.ts`:

1. Build an indexed/a11y type-scale step.
2. Export it with `toDtcgDocuments` and assert the literal document has `$value` plus `valueSource: "generated"`.
3. Read it in runtime mode and assert the generated `$value` is absent while index and a11y metadata remain.
4. Change `min-base` and `max-base`, resolve again, and assert the clamp changes.
5. Merge a `3rem` override after runtime ingestion, resolve, and assert `calc(3rem * var(--modifier))`.
6. Re-export and literal-read again to prove one materialization and no double a11y application.

#### Strict literal-type tests

Create a full document from this entry:

```ts
{
  percent: {
    $type: 'dimension',
    $value: '50%',
    $description: 'Half.'
  }
}
```

Assert:

- the full export normalizes it to literal `cssDimension`;
- strict conversion drops it as `proprietary-type`;
- the manifest contains `percent`;
- a manually supplied strict collection containing `cssDimension` fails strict validation.

#### Raw shadow failure test

Export a `shadow` entry whose raw value is `var(--brand-shadow)`. Assert export fails with an actionable module/token path. It must not produce `$value: []`.

The CSS-only runtime path may continue accepting the raw string. Only a requested DTCG export must fail when it cannot represent the value truthfully.

#### Shadow `none` component test

Serialize an sRGB shadow containing `components: ['none', 0, 0]`. Assert the CSS contains `none` and contains neither `NaN` nor `undefined`.

#### Exact registry tests

Add table-driven cases:

- valid numeric font weights: `1`, `400`, `1000`;
- valid named weights from DTCG 2025.10;
- invalid weights: `0`, `1001`, `"not-a-weight"`, and wrong-case aliases;
- valid stroke keywords: `solid`, `dashed`, `dotted`, `double`, `groove`, `ridge`, `outset`, `inset`;
- invalid stroke strings including `none`.

Keep whole-value aliases valid for both types and leave target checking to collection validation.

#### Shared compatibility tests

Assert that a `utility` alias targeting a `boolean` token passes collection validation because the shared compatibility map permits it. Keep one negative pair to prove incompatible references still fail.

### 2. Implement runtime and literal read modes

Refactor `fromDtcgDocument` and `flattenInto` around `DtcgReadMode`.

Runtime mode must:

- restore `rawCssValue` and `originalType`;
- remove those transient export fields afterward;
- detect `scale.valueSource === "generated"`;
- remove the generated `$value`, `valueSource`, and `a11yApplied`;
- retain scale index, a11y metadata, description, and effective authoring type.

Literal mode must not mutate serialized values, types, or provenance. Validation and strict conversion must never call the default mode implicitly.

### 3. Remove the stale-provenance shortcut

Delete the unconditional generated-value early return in `resolveTypeScale`. Runtime entries should already be dehydrated; literal documents should never enter the CSS resolver.

Keep pinned-step behavior explicit. A pinned exported entry must runtime-read back to the authored pin, then receive its a11y wrapper during resolution exactly once.

### 4. Fix strict filtering and validation

Make `flattenDocuments` require a read mode instead of choosing one internally. Strict conversion and collection validation use `literal`.

Add one shared strict assertion, for example:

```ts
validateDtcgDocuments(documents, label, { strict: true })
```

In strict mode, every surviving effective literal `$type` must satisfy `isDtcgSpecType`. Update `scripts/check-dtcg-validate.ts` to use this option and inspect entries in literal mode.

Use the direct `targetInfo.key` lookup when checking whether a target remains; no module-array search is needed.

### 5. Fail unsupported raw normalization truthfully

Change normalization helpers to receive a module/token path. For a spec type with a raw CSS string that cannot be converted to its DTCG representation, throw an error naming that path and value.

For shadows, remove `parsed ?? []`. Only literal `none` may become `[]`. Do not add a proprietary shadow type in this remediation.

### 6. Make shadow color serialization `none`-aware

Keep the current byte-exact sRGB shadow form only when all three components are numeric. Otherwise delegate to the canonical `serializeColorValue`, which already preserves `none`.

Do not maintain a second color-space switch inside shadow serialization.

### 7. Tighten exact DTCG schemas

Define named schemas instead of inline broad unions:

```ts
const fontWeightValueSchema = z.union([
  z.number().min(1).max(1000),
  z.enum([...DTCG_2025_10_WEIGHT_ALIASES])
]);

const strokeStyleKeywordSchema = z.enum([
  'solid', 'dashed', 'dotted', 'double',
  'groove', 'ridge', 'outset', 'inset'
]);
```

Support the keyword stroke form used by zebkit. Do not claim support for the structured stroke form until its CSS serializer and sub-value reference handling exist.

Limit the empty color authoring exception to entries explicitly marked `emptyColorPlaceholder: true`; do not allow every color token to use `""`.

### 8. Reuse the compatibility contract

Import `areTokensTypesCompatible` from `src/definitions/token-maps.ts`. Use it in both `validateDtcgDocuments` and `toStrictDtcgDocuments`; delete the duplicated dimension/easing conditions.

The collection validator remains responsible for existence plus compatibility. The single-entry validator remains responsible for literal shape only.

### 9. Regenerate owned artifacts

After focused tests pass, regenerate only artifacts affected by these generators:

```sh
npm run build:defaults
npm run build:tokens -- --config theme/zebkit.docs.config.json
npm run build:hero-themes
npm run build:components
npm --prefix doc-site run sync:generated
npm run build:context
npm run build:editor
```

Inspect `git diff --stat`, `git diff --check`, generated token documents, strict manifests produced by tests/fixtures, and the source map. Do not accept unexplained generated churn.

## Verification

Run focused checks first:

```sh
npm test -- --runInBand src/scripts/tokens/dtcg-document.test.ts
npm test -- --runInBand src/scripts/tokens/token-converter.test.ts
npm test -- --runInBand src/scripts/tokens/build-type-scale.test.ts
npm run type-check
npm run check:dtcg-validate
npm run check:dtcg-baseline
npm run test:integration
```

Also rerun these exact negative probes as tests, not ad hoc commands:

- generated snapshot plus changed scale controls;
- generated snapshot plus a pinned step;
- strict conversion of raw `dimension: "50%"`;
- raw shadow `var(--brand-shadow)`;
- sRGB shadow with a `none` component;
- invalid font weight and stroke style;
- `utility` alias targeting `boolean`.

### Prove the clean-artifact guard without committing this worktree

`npm run check` cannot pass in the working tree while intentional generated files differ from `HEAD`. Verify from a disposable local clone containing an ephemeral verification commit:

```sh
git diff --binary > /tmp/zebkit-luna-round-2.patch
VERIFY_DIR="$(mktemp -d /tmp/zebkit-luna-round-2-verify.XXXXXX)"
git clone --no-hardlinks . "$VERIFY_DIR"
npm --prefix "$VERIFY_DIR" ci
git -C "$VERIFY_DIR" apply /tmp/zebkit-luna-round-2.patch
git -C "$VERIFY_DIR" add -A
git -C "$VERIFY_DIR" commit -m "Temporary DTCG verification snapshot"
npm --prefix "$VERIFY_DIR" run check
git -C "$VERIFY_DIR" status --short
```

The temporary commit stays only in `/tmp`; do not push it. The final status in the disposable clone must be empty after `npm run check`.

## Acceptance Checklist

- [ ] All six new regressions fail before the second-round fix and pass afterward.
- [ ] Runtime ingestion dehydrates generated scale values.
- [ ] Changed group controls produce a changed clamp after snapshot ingestion.
- [ ] A pinned snapshot override receives its a11y modifier exactly once.
- [ ] Literal validation sees normalized serialized types without restoration.
- [ ] Strict export contains no proprietary type, including raw percentage dimensions.
- [ ] Strict drop manifests include direct and transitive removals.
- [ ] Unsupported raw shadows fail export instead of becoming `none`.
- [ ] Valid `none` color components never serialize as `NaN` or `undefined`.
- [ ] Font-weight and stroke-style schemas match DTCG 2025.10.
- [ ] Collection validation uses `areTokensTypesCompatible`.
- [ ] Built-in full and strict documents pass collection validation.
- [ ] Golden CSS remains byte-identical.
- [ ] Generated docs, component/editor artifacts, and source map are current.
- [ ] Focused unit, full unit, integration, type, DTCG, baseline, docs, and full `npm run check` gates pass.
- [ ] Luna's implementation worktree remains uncommitted and is not reset or rebased.

## Completion Report

Return:

1. The runtime/literal read-mode API and every caller assigned to each mode.
2. The generated and pinned scale lifecycle after the fix.
3. Strict-mode proof: surviving type count by type and zero proprietary survivors.
4. Exact focused and full verification commands with outcomes.
5. Disposable-clone `npm run check` result and final clean status.
6. Modified/generated files remaining uncommitted.
7. Any conflict or deliberate behavior change requiring Mark's approval.
