# Phase 2e work note — numbers & typography leftovers (execution notes, not part of the plan)

Ground truth and decisions for the last Phase 2 family migration. Delete when the migration lands.

## Status (2026-07-19)

Phase 2e COMPLETE pending commit. Gates: 488 unit tests, type-check, check:utilities,
check:palette, both lints, check:cem, golden baseline byte-identical across all 19
artifacts + I7 (re-baselined — see below), doc-site build. `check:context` red only
until the regenerated doc-site artifacts are committed — the standing pattern.

**This phase deliberately changed emitted bytes** (a scoped re-baseline, like 2b/2d),
on the user's call. Two changes touch the golden CSS; everything else is byte-identical.

## The migration (decision D5 → final legacy families retired)

| was | now | value shape |
|---|---|---|
| `opacity` | `number` (spec) | unitless number (unchanged values) |
| `zIndex` | `number` (spec) | unitless number; the lone `z-index: auto` keyword → `cssDimension` (D4) |
| `lineHeight` | `number` (spec) | **re-authored unitless**: `150%` → `1.5` (was a `%` string) |
| `fontWeight` | `fontWeight` (spec) | value normalized string → number (`"400"` → `400`) |
| `fontFamily` | `fontFamily` (spec) | unchanged strings; schema widened to string-or-array for interchange |
| `borderStyle` | `strokeStyle` (spec) | keyword string (`solid`) unchanged |

After 2e the legacy names `opacity`/`zIndex`/`lineHeight`/`borderStyle` are gone from
`AllowedTokenTypes`; `number` and `strokeStyle` are the new members.

## Decisions (both re-baseline calls were the user's)

1. **line-height → unitless `number`, not `cssDimension`.** Values were authored as
   percentages (`100%`–`200%`), which DTCG's `number` (unitless) can't hold. Rather
   than home them in proprietary `cssDimension` (byte-identical but off-spec), we
   re-authored them unitless (`1`/`1.25`/`1.5`/`1.8`/`2`) — a real spec type and the
   CSS best practice (factor inheritance avoids compounding). Scoped re-baseline of the
   5 line-height vars + their a11y calc wrappers. General theme rule: `%` value → `/100`.
2. **`tracking.*` virtual alias retired by repointing (completing I5).** Components
   referenced `{tracking.normal}` → `var(--zbk-tracking-normal)`, a variable **never
   defined anywhere** (dangling; browsers fell back to `normal`). The real emitted
   module is `letter-spacing`. Repointed the 8 components (+ theme copies) to
   `{letter-spacing.normal}` → `var(--zbk-letter-spacing-normal)` (a real var). This
   fixed a latent bug: the apple hero theme uniquely overrides `letter-spacing.normal`
   (`0em` vs default `0rem`), and its components had been silently ignoring that
   override — apple's overlay now correctly emits 7 component letter-spacing vars.
3. **`z-index: auto` → `cssDimension`** (D4 already homes the `auto` keyword). It is the
   one non-numeric value in the number families; nothing references it, so `number`
   compat stays tight (`["number"]`).
4. **line-height names its a11y modifier explicitly.** Retyping to the generic `number`
   breaks the old `a11yMap[$type]` lookup (there is no `number` modifier). Each entry now
   carries `a11y: "--zbk-a11y-line-height-modifier"` (the letter-spacing precedent);
   `lineHeight` dropped from `a11yMap`. The modifier var is unchanged, so only the numeric
   literal changed in the calc wrapper (`calc(150% * var(…))` → `calc(1.5 * var(…))`).
5. **`tokenAliasMap` fully retired.** Its other two parents (`font-weight`,
   `letter-spacing`) shadowed real modules (resolved first by the converter), so they
   were dead; `tracking` was repointed. The map and the converter's fallback branch are
   deleted — references are now strictly closed-world (I5 complete).
6. **fontWeight `a11y: true` flags are inert and left as-authored.** No font-weight
   modifier is defined and the type is absent from `a11yMap`, so they emit bare weights
   (confirmed against the baseline). Not touched — orthogonal cleanup.

## Blast radius / regeneration

- Hand: `tokens.ts` (enum: −opacity/zIndex/lineHeight/borderStyle, +number/strokeStyle;
  fontFamily `$value` widened to string-or-array), `dtcg.ts` (LEGACY_TYPE_MIGRATION keys),
  `token-maps.ts` (tokenAliasMap deleted; compat keys), `a11y-map.ts` (−lineHeight),
  `token-converter.ts` (tokenAliasMap branch + import removed), `build-editor.ts`
  (syntax-hint map), the opacity/z-index/line-height/font-weight/semantic-border modules,
  the 9 prose modules (line-height retype).
- Codemod: `scripts/codemod-2e-numbers-typography.ts` (9 component modules by regex;
  79 theme documents parsed — retype by `$type`, `%`→unitless line-height, `"400"`→400
  fontWeight, `{tracking.*}`→`{letter-spacing.*}`; z-index `auto`→`cssDimension`). Parse+
  re-emit is byte-lossless across all 198 theme files (verified), so diffs are minimal.
- Regenerated: `build:defaults`, `build:editor` (schemas add `numberValue`/`strokeStyle`,
  drop the four legacy value schemas), doc-site `sync:tokens` (`allowed-token-types.json`
  drops opacity/zIndex/lineHeight/borderStyle, adds number/strokeStyle), `build:context`.
- Re-baseline: `check:dtcg-baseline -- --update`. Diff = ONLY line-height values (`%`→
  unitless, all configs) + tracking→letter-spacing repoint (components) + the apple 7-line
  addition. No new serializer needed — `number` and keyword `strokeStyle` stringify.

## Deferred / next

- Theme-document conformance (raw override strings → structured, e.g. theme line-height
  already-number values) is Phase 3.
- doc-site serializer mirrors (`token-docs.ts`/`compiled-tokens.ts`) needed NO change:
  numbers and keyword strokeStyles fall through the existing `String()` path.
- **Next: Phase 3 (spec-valid interchange documents).** All of Phase 2 is done — every
  family is on a spec (or documented-proprietary) `$type` with structured values, and
  I5 (closed-world aliases) holds. Phase 3 turns exported artifacts + theme override
  ingestion into real DTCG documents (nested groups, group `$type`, bare-`$value`,
  `$ref`/`$extends` rejection).
