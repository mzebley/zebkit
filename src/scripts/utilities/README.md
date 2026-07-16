# Utility Manifests

Hand-authored JSON contracts that are the **single source of truth** for zebkit's utility classes. Each manifest declares *families* of classes as a grammar (`base x edges x values`, multiplied by hover/breakpoint modifiers) instead of enumerating every class. From that one contract we generate the SCSS, lint it for drift, and (eventually) feed docs, editor autocomplete, the Claude design skill, and non-CSS style targets.

**The golden rule: never edit a generated `_*.scss` partial. Edit the manifest, regenerate.**

## The pieces

| File | Role |
|---|---|
| `schemas/utility-manifest.schema.json` | JSON Schema for manifests. Referenced via `$schema` for editor autocomplete; enforced by lint rule U1. |
| `src/tokens/**/*utilities.manifest.json` | The hand-authored manifests, co-located with their generated partial (e.g. `src/tokens/styles/utility-classes/overflow.utilities.manifest.json`). |
| `src/scripts/utilities/expand.ts` | Expands a family's grammar into its full class set. Shared by lint and generate. Also owns the fallback `BREAKPOINTS` list (the source of truth is the breakpoint token module; `src/tokens/styles/variables/_breakpoints.scss` mirrors it for SCSS). |
| `src/scripts/utilities/generate.ts` | `npm run generate:utilities` — overwrites each family's `source` partial with literal SCSS rules wrapped in `@layer utilities`. |
| `src/scripts/utilities/lint.ts` | `npm run lint:utilities` — keeps manifests and SCSS honest (runs in `npm run check`). |
| `src/scripts/utilities/token-source.ts` | Loads token modules so the lint can verify pattern values are real token keys. |
| `gen.from-breakpoint()` in `_generators.scss` | Mixin the generated SCSS uses for responsive variants; no-ops when a breakpoint is filtered out by `$active-breakpoints`, so consumer config still works. |

## Lint rules

- **U1** — manifest validates against the schema.
- **U2** — integrity: family names unique across all manifests; `tokens.group` is a real token module key; every `pattern.values` entry is a real token key in that module (and `negativeValues` have `neg-*` tokens); a pattern family that omits `values` can derive them (bound `tokens`, not `edgeInToken`); breakpoints and layers are known; `source` files exist; aliases target real classes.
- **U3** — bidirectional diff: every class the grammar predicts exists in the source SCSS, and every class in the SCSS is claimed by a family. `knownExceptions` absorb documented irregularities.
- **U4** — no class defined in more than one covered file.
- **U5** — every class-emitting token SCSS file is covered by a manifest (or allowlisted in `LEGACY_PARTIALS`). Coverage is **depth-native**: the lint globs `src/tokens/**/*.scss` (excluding `styles/base/` and `styles/variables/`) and flags any file where `extractClasses()` finds literal class selectors that aren't covered. Files that emit classes only via Sass mixins (so `extractClasses` finds nothing) pass naturally without being listed.

**Important limitation:** the lint reads SCSS *source text*. It cannot see classes emitted by Sass `@each` loops or mixins. So the workflow is always **author manifest -> generate -> lint**, never "lint the old mixin-driven file." Pre-manifest partials live in `LEGACY_PARTIALS` (in `lint.ts`) until migrated. Shrink that list and `knownExceptions`; never grow them to make a build pass.

## Anatomy of a manifest

```jsonc
{
  "$schema": "../../../../schemas/utility-manifest.schema.json",
  "name": "Overflow utilities",         // human-readable
  "key": "overflow",                    // unique across manifests; usually the token module key
  "description": "What this group is for (humans + tooling read this).",
  "layer": "utilities",                 // @layer the generated rules wrap in
  "families": [ /* one entry per class family */ ]
}
```

Each **family** needs `name` (unique everywhere), `description`, `source` (repo-root-relative SCSS partial the generator writes), `properties` (CSS properties set), and exactly one of `classes`, `pattern`, `rules`, or `statePattern`. Optional: `guidance` (usage rules for humans/AI), `a11y` (how the family responds to a11y dials), `tokens`, `modifiers`, `generator`, `knownExceptions`, `important` (avoid — `@layer` ordering is zebkit's override story).

## The grammar

A `pattern` expands to `<base>[-<edge>][-neg]-<value>`:

```jsonc
"pattern": {
  "base": "margin",
  "edges": ["block", "inline", "block-start", "block-end", "inline-start", "inline-end"],
  "values": ["0", "xs", "sm", "md", "lg"],     // -> .margin-md, .margin-inline-sm, ...
  "negativeValues": ["xs", "sm"],              // -> .margin-neg-xs (uses the neg-xs token)
  "aliases": { "margin-tight": "margin-xs" },  // alias shares the canonical rule
  "edgeRequired": false                        // true = no bare .margin-md form
}
```

`modifiers` multiply everything:

```jsonc
"modifiers": {
  "hover": true,                               // .hover:margin-md:hover variants
  "responsive": ["tablet", "desktop"]          // .tablet:margin-md under min-width queries
}
```

Zebkit prefers **logical edges** (`block`, `inline-start`, ...) over physical (`top`, `left`).

## Token binding

```jsonc
"tokens": { "group": "spacing", "varPrefix": "spacing" }
```

- `group` = the token module's exported `key` (`src/tokens/spacing/tokens/tokens.ts`). The lint checks every pattern value is a key in that module. Modules that share a `key` are merged into one group (`tokens/spacing` + `tokens/semantic/spacing` both export `"spacing"`, so the group is their union).
- **`pattern.values` is optional when `tokens` is bound.** Omit it and the value list is auto-derived from the whole group (filtered to `tokens.types` when set, `neg-*` keys excluded) — so it can never drift when a token is added. Set `values` only when you want a deliberate **subset/limiter** (e.g. `margin` and `gap` stop well short of the full spacing scale); it's then the source of truth, still lint-checked against the group. Required for keyword (no-`tokens`) families and `edgeInToken` families.
- **`pattern.exclude: ["page-padding-block", ...]`** drops specific token values from both axes after resolution. Use it to take the whole group *minus a few* keys instead of enumerating every wanted value. Each entry must be a real token key (the lint flags typos).
- **`pattern.literals: { "auto": "auto" }`** adds non-token values to the positive axis, mapped to verbatim CSS — so one token-driven family can also emit keyword classes (`.margin-auto`, `.margin-inline-auto`, ...) without a second family. They flow through the family's `edges`/`edgeProperties`/modifiers like any value, but skip token resolution and negative mirroring (no `.margin-neg-auto`). Bake in `!important` if needed; a literal may not share a token's name (the lint flags the shadow). This is the clean way to mix hardcoded values into an auto-derived family.
- `varPrefix` = what follows `--zbk-` in the emitted var: value `md` -> `margin-block: var(--zbk-spacing-md)` (written as `var(--#{prefix.$cssVar}-spacing-md)` in SCSS).
- `negativeValues: ["5"]` consumes `--zbk-spacing-neg-5` — zebkit's negative tokens are first-class. **`negativeValues: true`** auto-mirrors: it emits a negative for every resolved positive value that has a matching, type-allowed `neg-<value>` token (values without one — named sizes, `0` — are skipped). So `margin` can enable negatives in one line, while `padding` just omits it. Requires `tokens` bound without `edgeInToken`.
- `edgeInToken: true` when the edge is part of the token name (`varPrefix-edge-value`).
- `types: ["sizing"]` restricts valid values to token keys whose declared `type` is in the list. Use when one group mixes purposes: the spacing group holds both `type: spacing` (margin/padding) and `type: sizing` (width/flex-basis) tokens, so `flex-basis` sets `types: ["sizing"]` to admit `card`/`aside`/`tablet` and have the lint *reject* `section-margin-block`. Values mapped in `valueMap` are literal CSS and exempt from the check.
- Omit `tokens` entirely for keyword families.

## Value resolution (what the generator emits)

For each class, the CSS value is resolved in this order:

1. `generator.valueMap` hit — keyed by full class name, `neg-<value>`, or value suffix. Verbatim; bake `!important` in if needed.
2. `tokens` binding — emits `var(--zbk-<varPrefix>-<value>)`.
3. Fallback — the value suffix itself (so `overflow` + value `auto` emits `overflow: auto` with no config at all).

Property resolution: `family.properties`, unless `generator.edgeProperties` maps edges to different property lists (`""` key = edgeless form):

```jsonc
"generator": {
  "edgeProperties": {
    "": ["margin-block", "margin-inline"],
    "block": ["margin-block"],
    "inline-start": ["margin-inline-start"]
  }
}
```

## Usage tiers (AI/docs guidance)

Tiers are advisory metadata for tooling and the design skill when *choosing* a class — they never change the generated CSS. They encode the "opinionated in guidance, not in deletion" stance from VISION.md: the whole vocabulary ships, but tooling is steered toward the recommended subset.

- `tier` (family-level): `recommended` (the default if omitted) | `situational` (valid, but needs a specific reason) | `discouraged` (avoid unless there's no alternative). `order` is `discouraged` because visual reordering diverges from DOM/focus order.
- `valueTiers` (per-value override): `{ "vertical-text": "discouraged" }` — only list values that differ from the family default. The lint checks every key is a real value/class of the family, so typos can't silently tier nothing.

```jsonc
{
  "name": "cursor",
  "tier": "recommended",
  "valueTiers": { "vertical-text": "discouraged", "cell": "situational" },
  ...
}
```

## Family order is cascade order

Families emit in the order they appear in the manifest's `families` array, and all utilities share one `@layer`, so when two classes set the same property the **later family wins** by source order (specificity is equal). This matters for shorthand/longhand pairs: a `flex` shorthand (`flex-auto` = `1 1 auto`) resets grow, shrink, *and* basis, so for `class="flex-1 flex-basis-card"` to mean "grow/shrink from the shorthand, basis from the token," the longhand families must come **after** the shorthand. Rule of thumb: **declare shorthand families before the longhands they can override** (`flex` before `flex-grow`/`flex-shrink`/`flex-basis`), and note the intent in `guidance` so it's not mistaken for an accident.

## `statePattern` — interaction-state color families

`statePattern` is a fourth family kind for role × axis families that need base classes *plus* hover/focus/active/disabled prefixed forms. It is forbidden on `modifiers` (state coverage is controlled by the `states` field instead).

```jsonc
"statePattern": {
  "roles": {
    "canvas": ["background-color", "background"],  // one or more properties
    "ink": "color",
    "border": "border-color"
  },
  "axes": {
    "family": ["accent-primary", "positive", ...],
    "intensity": [null, "subtle", "muted", "emphasis"],  // null = optional axis
    "variant": [null, "inverse"]
  },
  "class": "{role}-{family}{-intensity}{-variant}",   // {-axis} = omit when null
  "var": "--zbk-{family}-{role}{-variant}{-intensity}", // segment order may differ
  "states": true   // all 5 states; or a subset array ["base", "hover"]
}
```

Template syntax: `{axis}` = required; `{-axis}` = optional (dropped with its leading dash when the axis value is `null`). Class and var templates may use different segment orders — that difference is the whole point.

**Generated selector shapes:**

| State | Selector |
|---|---|
| base | `.ink-positive { color: … }` |
| hover | `@media (hover: hover) and (pointer: fine) { .hover\:ink-positive:hover { … } }` |
| focus | `[class~="focus:ink-positive"]:is(:focus-visible, :focus-within) { … }` |
| active | `[class~="active:ink-positive"]:active { … }` |
| disabled | `[class~="disabled:ink-positive"]:is(:disabled, [aria-disabled="true"]) { … }` |

Emission is one state at a time for the **whole family** in LVFHA order (base → focus → hover → active → disabled), and hover uses exactly **one** `@media` block per manifest family. This is load-bearing for the cascade.

**U2 var integrity**: every instantiated `var` template is checked against `tokenVarNames`. Set `varSource: "scss"` to skip this check when the variables are emitted by a Sass mixin (not a TS token module) — e.g. the primitive palette surface.

## Three family shapes (recipes)

**1. Keyword family, suffix == CSS value** (overflow, cursor): just `pattern` + `properties`, no `tokens`, no `generator`.

```jsonc
{
  "name": "cursor", "description": "...", "properties": ["cursor"],
  "source": "src/tokens/styles/utility-classes/pointer.scss",
  "pattern": { "base": "cursor", "values": ["pointer", "wait", "not-allowed"] }
}
```

**2. Keyword family, arbitrary declarations** (visibility, display): use `classes` + `generator.declarations`.

```jsonc
{
  "name": "visibility", "description": "...", "properties": ["visibility"],
  "source": "src/tokens/styles/utility-classes/visibility.scss",
  "classes": ["visible", "invisible"],
  "generator": {
    "declarations": {
      "visible": { "visibility": "visible" },
      "invisible": { "visibility": "hidden" }
    }
  }
}
```

**3. Token scale family** (margin, gap, radius): `pattern` + `tokens` (+ `edgeProperties` when edges exist).

For anything truly bespoke (compound selectors, `[class*=...]` rules), `generator.rawScss` emits a verbatim block (breakpoint variants get class names auto-prefixed), and `generator.staticScss` emits once, never replicated under breakpoints.

## Workflow: migrating a legacy partial

1. Pick a path from `LEGACY_PARTIALS` in `lint.ts` (repo-relative). Note some classes are emitted from `src/tokens/styles.scss` rather than the partial itself — for those, the manifest `source` points at the partial, and you delete the `@include` lines from `styles.scss` after generating.
2. Snapshot current output: `npx sass --load-path=src src/tokens/styles/mixins/_foo.scss /tmp/before.css`
3. Author `foo.utilities.manifest.json` next to the partial.
4. `npm run generate:utilities && npm run lint:utilities` — the lint names every missing/unclaimed class and bad token key; iterate until green.
5. Compile again to `/tmp/after.css` and compare selectors:
   `grep -o '^\s*\.[^ ,{]*' /tmp/before.css | sort > /tmp/b; grep -o '^\s*\.[^ ,{]*' /tmp/after.css | sort > /tmp/a; diff /tmp/b /tmp/a`
6. Delete the partial's name from `LEGACY_PARTIALS`.
7. `npm run check`.

## Commands

```bash
npm run generate:utilities   # manifests -> SCSS partials
npm run lint:utilities       # validate (also part of npm run check); --all shows every finding
```
