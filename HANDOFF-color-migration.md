# Handoff: color utilities → manifests (state grammar) + depth-native lint coverage

Untracked handoff plan (2026-07-15, written by Fable). Supersedes `COLOR-MIGRATION-NOTES.md` — its analysis is folded in here. Branch: `components`. The manifests-consolidation handoff is complete except this sprint: `src/tokens/styles/mixins/_color.scss` is the only `LEGACY_PARTIALS` entry left.

**Read VISION.md and GRAMMAR.md first. Pre-release, no back-compat: migrate cleanly, no shims. Mark reviews and commits himself — do NOT run `git commit`.**

## Goal

1. Extend the utility-manifest schema with a state-aware pattern kind (`statePattern`) that expresses the color grammar: role × family × step (× variant × intensity) × interaction state.
2. Migrate every color utility class (~3,065 classes, ~24% of the utility surface, emitted by the 306-line `_color.scss` across 36 consumer files) onto manifests. Delete `_color.scss`. `LEGACY_PARTIALS` ends empty.
3. Make lint U5's coverage net **depth-native**: any class-emitting SCSS under `src/tokens/` is in scope regardless of nesting — no per-directory glob exceptions (today `src/tokens/semantic/**/styles.scss` and `src/tokens/colors/**` sit outside the net).
4. Phase 0 nits from the consolidation review.

This migration is **class-set-neutral by definition** — but color has real cascade-order constraints the class set can't prove, so Phase 4 adds targeted compiled-CSS checks. Grammar improvements (responsive color, new states elsewhere) are out of scope.

## Baseline (do first)

```bash
npm run generate:utilities && npm run build:tokens -- --config zebkit.docs.config.json
node /tmp/extract-classes.mjs docs/static/zebkit/zbk-default.min.css > /tmp/zbk-color-base.txt
```

`/tmp/extract-classes.mjs` (use a script FILE — inline `node -e` shell-mangles the `\\` in the regex and silently drops breakpoint-prefixed classes):

```js
import fs from "node:fs";
const css = fs.readFileSync(process.argv[2], "utf8");
console.log([...new Set(css.match(/\.[a-zA-Z][\w\\:-]*/g) || [])].sort().join("\n"));
```

The previous baseline had 13,005 classes after the intentional `*-2xs` removals. Re-run after each phase; the diff must be empty (or every line named in the phase notes).

## Phase 0 — nits

- `src/components/base/slot-contract.ts:3` header comment says `npm run generate:slots`; the command was renamed to `generate:components` in Phase 3 of the consolidation. Last stale reference in the repo.

## Phase 1 — U5 goes depth-native (content-based)

Replace the glob list in `src/scripts/utilities/lint.ts` with content-based detection over the whole tree:

- Glob: `src/tokens/**/*.scss`, excluding the `src/tokens/styles/base/` and `src/tokens/styles/variables/` trees (element/base styles and var definitions, never utilities). Keep `IGNORED_PARTIALS` (`_generators.scss`, `_index.scss`).
- Flag a file only when it is (a) not manifest-covered, (b) not in `LEGACY_PARTIALS`, **and (c) `extractClasses(file)` is non-empty**. Content detection makes depth irrelevant and lets token-only emitters (e.g. `palette/_*.scss` post-migration, the root `src/tokens/styles.scss` aggregator) pass naturally — no exception lists.
- Delete the now-redundant `src/tokens/prose/**/styles.scss` special-case glob.
- Residual blind spot, accepted: content detection cannot see classes emitted through Sass mixin interpolation — that is exactly what a `LEGACY_PARTIALS` entry asserts. After this sprint zero class-generating mixins remain (only `from-breakpoint`), so the blind spot closes with the ledger.

Run the lint after this phase: it must stay green with `_color.scss` still on the ledger (the color consumer files call mixins, so they contain no literal class selectors and won't be flagged).

## Phase 2 — `statePattern` schema kind

**Read `_color.scss` end-to-end before freezing anything.** The emission contract below encodes the selector shapes; per-surface state coverage (e.g. whether `fill` or the semantic families emit all five states) must be confirmed from the source — do not trust arithmetic, trust the mixins plus the baseline diff.

### Why `pattern` can't do it

The state axis produces three different selector shapes per class:

| State | Selector shape (example) |
|---|---|
| base | `.ink-stone-800 { color: … }` |
| hover | `@media (hover: hover) and (pointer: fine) { .hover\:ink-stone-800:hover { … } }` |
| focus | `[class~="focus:ink-stone-800"]:is(:focus-visible, :focus-within) { … }` |
| active | `[class~="active:ink-stone-800"]:active { … }` |
| disabled | `[class~="disabled:ink-stone-800"]:is(:disabled, [aria-disabled="true"]) { … }` |

### Manifest shape

Fourth mutually-exclusive family kind in `schemas/utility-manifest.schema.json` (alongside `classes`/`pattern`/`rules`):

```jsonc
{
  "name": "color-semantic",
  "description": "Semantic color utilities with interaction-state prefixed forms.",
  "source": "src/tokens/styles/utility-classes/color-semantic.scss",
  "properties": ["background-color", "background", "color", "border-color"],
  "statePattern": {
    "roles": {
      "canvas": ["background-color", "background"],   // canvas sets TWO properties
      "ink": "color",
      "border": "border-color"
    },
    "axes": {
      "family": ["accent-primary", "accent-secondary", "action", "app", "brand", "caution", "critical", "disabled", "info", "positive"],
      "intensity": [null, "subtle", "muted", "emphasis"],
      "variant": [null, "inverse"]
    },
    "class": "{role}-{family}{-intensity}{-variant}",
    "var": "--zbk-{family}-{role}{-variant}{-intensity}",
    "states": true
  }
}
```

Template semantics: `{axis}` = required segment; `{-axis}` = optional, drops when the axis value is `null`. Class and var segment ORDER may differ — that is the point (compare the `semantic-color-class` vs `semantic-color-var` helpers in `_color.scss` before deleting it). `roles` maps role name → property or property array. `states: true` = the canonical five; a subset array is allowed. `modifiers` is forbidden on `statePattern` (fail validation — color is not responsive today, and adding it would change shipped CSS).

### Emission contract (`generate.ts`) — must match `_color.scss` byte-semantics

1. **State order is load-bearing (LVFHA).** Emit one state at a time for the whole family: base → focus → hover → active → disabled — regardless of manifest order. Source order is what lets an `active:` rule beat a `hover:` rule of equal specificity.
2. **One hover media block per family.** All hover rules share a single `@media (hover: hover) and (pointer: fine)` block — not one per class.
3. Selector shapes exactly as the table above: hover is an escaped-colon class + `:hover`; focus/active/disabled are `[class~="state:name"]` attribute selectors + pseudo (the state prefix is authored without a `\:` escape).
4. Rewrite the `--zbk-` prefix via the existing `rewritePrefix()` (→ `--#{prefix.$cssVar}-`), same as `rules` families.

### `expand.ts`

Predicted class set = every axis combination instantiated through the `class` template, plus each non-base state as `<state>:<class>` (unescaped colon). This keeps U3's bidirectional diff honest.

### `lint.ts`

- **U2 var integrity**: instantiate the `var` template for every axis combination; each result must resolve in `tokenVarNames`. This is the phantom-token guard (the same bug class as the removed `*-2xs` utilities).
- **`extractClasses` cannot currently read `[class~="focus:ink-x"]`** — it only matches `.class` tokens. (COLOR-MIGRATION-NOTES claimed otherwise; verified false 2026-07-15.) Extend `classesInSelector`/`extractClasses` to also capture `[class~="<name>"]` string literals, or U3 fails on every focus/active/disabled class. The hover `.hover\:x` escaped-colon form already works.

## Phase 3 — migrate the three surfaces

The three mixins in `_color.scss` (roles/steps/states come from its module-level defaults):

1. `generate-color-utilities($families)` — primitive palette. `.{role}-{family}-{step}` → `var(--zbk-color-{family}-{step})`. Consumers: `src/tokens/colors/palette/_*.scss` (22 families: blue…yellow).
2. `generate-semi-semantic-color-classes($name)` — `.{role}-{name}-{step}` → `var(--zbk-{name}-{step})` (no `color-` segment). Consumers: `src/tokens/colors/{brand,neutral,accent-primary,accent-secondary}/styles.scss`.
3. `generate-semantic-color-utilities($families)` — the semantic families above (`src/tokens/semantic/color/*/styles.scss`), with the variant/intensity axes and two-property canvas.

Steps:

- One manifest, `src/tokens/styles/utility-classes/color.utilities.manifest.json` (color has no owning module directory — same convention as border), with three `statePattern` families generating `color-palette.scss`, `color-semi-semantic.scss`, `color-semantic.scss` in that directory, wired like the existing generated partials.
- **Preserve the relative order palette → semi-semantic → semantic** in the compiled sheet; equal-specificity overlaps between the surfaces resolve by source order today.
- Strip the `@include generate-*` calls from the 36 consumer files. **KEEP every `@include primitiveColor(...)` call** — it emits `--zbk-color-*` token vars, not classes; token emission stays hand-written and out of utility-lint scope.
- Delete `_color.scss` and its `@use` references. `LEGACY_PARTIALS` → empty (keep the shrink-only comment). Update `COVERAGE.md` legacy tags and `src/scripts/utilities/README.md` (document `statePattern`).

## Phase 4 — verification

- Class-set diff vs baseline: **empty**.
- Cascade spot-checks in the compiled CSS (the class set can't prove these):
  - per family, states appear in source order base → focus → hover → active → disabled;
  - exactly one `(hover: hover) and (pointer: fine)` block per family;
  - non-hover states use `[class~="state:…"]`, hover uses `.hover\:…:hover`;
  - a probe element with both `hover:ink-x` and `active:ink-y` shows y while active.
- `npm run check` green (check:cem/check:context diff against the index — regenerate; only already-tracked churn until Mark commits).
- `/verify` end-to-end before handing back.

## Design decisions (defaults chosen — veto before Phase 2 starts)

- **Axes/roles live in the manifest**, not shared config: explicit and lintable; the duplication across three families is small. `step` may auto-derive from the token group when the group is exactly the step set (mirror `pattern.values` auto-derive).
- **Kind is named `statePattern`** — the mechanism (state-prefixed utility forms) is generic; color is just its first consumer. Do NOT add states to any other family this sprint.
- Canonical state order is enforced by the generator, never by manifest order.

## Known traps

- Baseline extraction via the script file, never inline `node -e`.
- LVFHA emission order and the single shared hover media block are both invisible to the class-set diff — Phase 4 spot-checks are mandatory, not optional.
- `extractClasses`'s `[class~=]` gap (Phase 2) — hit this before authoring manifests or every lint run fails noisily.
- `check:context` diffs tracked output; regenerate alongside any input change.
- Some tracked pre-built CSS blobs (`theme/dynamowaves/`, `theme/zebkit-baseline/`, `zbk-nudge-deck.min.css`) are stale compiled outputs and refresh when those themes rebuild — do not chase diffs there.

## Parked (not this sprint)

- Prose list styling is unimplemented: `src/tokens/prose/list/styles.scss` was a copy-paste of h6 and was dropped in the prose migration; the `list` prose token module has no styles.
