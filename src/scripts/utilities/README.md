# Utility Manifests

Hand-authored JSON contracts that are the **single source of truth** for zebkit's utility classes. Each manifest declares *families* of classes as a grammar (`base x edges x values`, multiplied by hover/breakpoint modifiers) instead of enumerating every class. From that one contract we generate the SCSS, lint it for drift, and (eventually) feed docs, editor autocomplete, the Claude design skill, and non-CSS style targets.

**The golden rule: never edit a generated `_*.scss` partial. Edit the manifest, regenerate.**

## The pieces

| File | Role |
|---|---|
| `schemas/utility-manifest.schema.json` | JSON Schema for manifests. Referenced via `$schema` for editor autocomplete; enforced by lint rule U1. |
| `src/core/**/*utilities.manifest.json` | The hand-authored manifests (e.g. `src/core/styles/utilities/overflow.utilities.manifest.json`). |
| `src/scripts/utilities/expand.ts` | Expands a family's grammar into its full class set. Shared by lint and generate. Also owns the `BREAKPOINTS` list (must match `core/styles/variables/_breakpoints.scss`). |
| `src/scripts/utilities/generate.ts` | `npm run generate:utilities` — overwrites each family's `source` partial with literal SCSS rules wrapped in `@layer utilities`. |
| `src/scripts/utilities/lint.ts` | `npm run lint:utilities` — keeps manifests and SCSS honest (runs in `npm run check`). |
| `src/scripts/utilities/token-source.ts` | Loads token modules so the lint can verify pattern values are real token keys. |
| `gen.from-breakpoint()` in `_generators.scss` | Mixin the generated SCSS uses for responsive variants; no-ops when a breakpoint is filtered out by `$active-breakpoints`, so consumer config still works. |

## Lint rules

- **U1** — manifest validates against the schema.
- **U2** — integrity: family names unique across all manifests; `tokens.group` is a real token module key; every `pattern.values` entry is a real token key in that module (and `negativeValues` have `neg-*` tokens); breakpoints and layers are known; `source` files exist; aliases target real classes.
- **U3** — bidirectional diff: every class the grammar predicts exists in the source SCSS, and every class in the SCSS is claimed by a family. `knownExceptions` absorb documented irregularities.
- **U4** — no class defined in more than one covered file.
- **U5** — every `src/core/styles/utilities/_*.scss` partial is covered by a manifest (or allowlisted in `LEGACY_PARTIALS`).

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

Each **family** needs `name` (unique everywhere), `description`, `source` (repo-root-relative SCSS partial the generator writes), `properties` (CSS properties set), and exactly one of `classes` or `pattern`. Optional: `guidance` (usage rules for humans/AI), `a11y` (how the family responds to a11y dials), `tokens`, `modifiers`, `generator`, `knownExceptions`, `important` (avoid — `@layer` ordering is zebkit's override story).

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

- `group` = the token module's exported `key` (`src/core/spacing/tokens/tokens.ts`). The lint checks every pattern value is a key in that module. Modules that share a `key` are merged into one group (core/spacing + semantic/spacing both export `"spacing"`, so the group is their union).
- `varPrefix` = what follows `--zbk-` in the emitted var: value `md` -> `margin-block: var(--zbk-spacing-md)` (written as `var(--#{prefix.$cssVar}-spacing-md)` in SCSS).
- `negativeValues: ["5"]` consumes `--zbk-spacing-neg-5` — zebkit's negative tokens are first-class.
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

## Three family shapes (recipes)

**1. Keyword family, suffix == CSS value** (overflow, cursor): just `pattern` + `properties`, no `tokens`, no `generator`.

```jsonc
{
  "name": "cursor", "description": "...", "properties": ["cursor"],
  "source": "src/core/styles/utilities/_pointer.scss",
  "pattern": { "base": "cursor", "values": ["pointer", "wait", "not-allowed"] }
}
```

**2. Keyword family, arbitrary declarations** (visibility, display): use `classes` + `generator.declarations`.

```jsonc
{
  "name": "visibility", "description": "...", "properties": ["visibility"],
  "source": "src/core/styles/utilities/_visibility.scss",
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

1. Pick a name from `LEGACY_PARTIALS` in `lint.ts`. (Easy: `_pointer.scss`, `_visibility.scss`. Note some classes are emitted from `src/core/styles.scss` rather than the partial itself — for those, the manifest `source` points at the partial, and you delete the `@include` lines from `styles.scss` after generating.)
2. Snapshot current output: `npx sass --load-path=src src/core/styles/utilities/_foo.scss /tmp/before.css`
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
