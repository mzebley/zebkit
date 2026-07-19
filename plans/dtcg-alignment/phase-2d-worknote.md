# Phase 2d work note — transition split (execution notes, not part of the plan)

Ground truth and decisions for the transition split. Delete when the migration lands.

## Status (2026-07-19)

Phase 2d COMPLETE pending commit, all gates green (488 unit + integration tests,
type-check, both lints, `check:palette`, `check:cem`, golden baseline byte-identical
across all 19 artifacts + I7, docs build). `check:context` red until the regenerated
doc-site artifacts are committed — the standing pattern.

## The split (decision D5 → four types)

The conflated `transition` type held durations, easing curves, CSS property lists,
AND easing keywords. It fanned out into:

| was `transition` | now | value shape |
|---|---|---|
| `325ms`, `0` (delay) | `duration` (spec) | `{value, unit: "ms"\|"s"}`; `0` serializes bare (`0`, not `0ms`) |
| `cubic-bezier(...)` | `cubicBezier` (spec) | `[x1,y1,x2,y2]`, serialized at **two decimals** |
| property-name lists | `transitionProperty` (proprietary, existed) | string |
| `ease-out` keyword | `transitionTimingFunction` (proprietary, **NEW** — D4) | string |

## Decisions

1. **`ease-out` keyword → new proprietary `transitionTimingFunction`** (user call,
   modifies D4/D5). DTCG's `cubicBezier` is `[x1,y1,x2,y2]` only — it cannot express
   the CSS `<easing-function>` keyword surface. Explicit curves stay spec `cubicBezier`;
   the keyword surface gets its own proprietary type, mirroring how `cssDimension`
   homes lengths DTCG can't type. Only `ease-out` appears today (button/pagination/tooltip).
2. **cubic-bezier serialization pins two decimals** (`n.toFixed(2)`). The whole corpus
   authors 2-decimal coordinates (`1.00`, `0.90`, `1.06`); a plain `String()` would emit
   `1`/`0.9` and break the byte gate. The module self-checks every curve round-trips.
   Fragile if a future curve needs other precision — the self-check throws loudly then.
3. **duration zero drops the unit** (`{value:0, unit:"ms"}` → `0`). `transition-delay`
   authors bare `0`; mirrors the shadow/cssDimension zero-drop precedent. No `s` values
   in the corpus (handled anyway).
4. **a11y modifier follows the durations.** `a11yMap` rekeyed `transition` → `duration`
   (same var `--zbk-a11y-transition-duration-modifier`). Curves/properties/keywords are
   not modifier-scaled. Component durations keep their per-entry `a11y` opt-in unchanged
   (including the pre-existing double-wrap where a ref-duration with `a11y:true` points at
   an already-wrapped module duration — untouched, byte-identical).
5. **Timing-function compat pairs both ways.** `cubicBezier` ↔ `transitionTimingFunction`
   in `tokenCompatibilityMap` so a keyword slot (base type `transitionTimingFunction`,
   e.g. button) can be overridden by a `{…function…}` curve reference (the docs theme does
   exactly this) and resolve.

## The theme-`$type` gotcha (cost a re-run)

`$type` is base-controlled by the merge and pinned as a const in the editor schema, so a
theme entry must carry its **base** (source) type — NOT the type its own overriding value
classifies to. The docs theme overrides button's `ease-out` slot (base
`transitionTimingFunction`) with a curve *reference* (`{transition.…-function-…}`); the
first codemod pass classified the theme value → `cubicBezier` → editor-schema test failed
on the const mismatch (the golden baseline did NOT catch it — the merge ignores theme
`$type`). Fix: `migrateThemes` reads the base type per entry from the default-theme oracle
(`dist/cli/defaults/zbk-<key>.json`, built first — same pattern as codemod-d5-collapse).

## Blast radius / regeneration

- Hand: `tokens.ts` (enum, duration/cubicBezier schemas + serializers + predicates,
  `$value` union, `tokenValueToString`), `dtcg.ts` (D4 registry + migration rows),
  `token-maps.ts` (compat), `a11y-map.ts` (`transition`→`duration`), `build-editor.ts`
  (syntax hints), transition module (structured, self-checked), doc-site
  `token-docs.ts`/`compiled-tokens.ts` (duration + cubic-bezier serialization — a
  cubic-bezier array would otherwise hit the shadow path and render garbage).
- Codemod: `scripts/codemod-2d-transitions.ts` (9 component modules by value; 19 themes by
  base-type oracle).
- Serializer unit tests in `token-converter.test.ts`.
- Regenerated: `build:defaults`, `build:editor` (schemas rename to
  `durationValue`/`cubicBezierValue`/…), doc-site `sync:tokens`
  (`allowed-token-types.json` drops `transition`), `build:context`.

## Deferred / next

- Theme-document conformance (raw strings → structured) is Phase 3.
- **Next: Phase 2e (numbers & typography leftovers).** Still legacy-typed: `opacity`,
  `zIndex`, `lineHeight` → spec `number`; `fontWeight` → spec `fontWeight` (value
  normalized); `fontFamily` value → string-or-array (loading metadata already under
  `$extensions`); `borderStyle` → spec `strokeStyle`. `lineHeight` is still in `a11yMap` —
  it keeps a modifier after retyping to `number` (unlike duration, `number` is generic, so
  the entry names its modifier or the map keys on `lineHeight` differently — decide in 2e).
  The `tokenAliasMap` virtual targets (`font-weight.*`, `tracking.*`) materialize as real
  tokens, completing I5. Then Phase 3 (spec-valid interchange documents).
