# Handoff: manifest everything, consolidate commands, ship agent context

Untracked handoff plan (2026-07-15, written by Fable for Opus). Branch: `components` — the component-manifest system (8 manifests, lint C1–C6, `generate:slots`, base-class slot warnings, `build:context` merge) is already in the working tree and green. This plan builds on it.

**Read VISION.md and GRAMMAR.md first. CLAUDE.md's "Pre-release, no back-compat" rule is binding: rename/migrate cleanly, never alias-and-deprecate.**

## Goal

1. Fix the minor findings from the component-manifest review.
2. Migrate ALL remaining hand/mixin-authored utility CSS — the five `LEGACY_PARTIALS` and every per-module `src/tokens/*/styles.scss` — onto the utility-manifest system, extending the schema where the class-family grammar doesn't fit.
3. Consolidate the npm-script surface around two verbs: `generate` (manifest → source) and `build` (source → artifacts).
4. Ship the generated per-component context markdown in the npm package and deliver it to consumer repos via `zebkit init` / `zebkit pull`, so local LLMs can read it directly.

Work in the phase order below; `npm run check` must be green at the end of every phase. Commit per phase.

## Baseline (do this first)

Capture the compiled class set so migrations can be proven CSS-neutral:

```bash
npm run build:css
node -e "const css=require('fs').readFileSync('docs/static/zebkit/zbk-default.min.css','utf8');console.log([...new Set(css.match(/\.[a-zA-Z][\w\\:-]*/g)||[])].sort().join('\n'))" > /tmp/zbk-classes-baseline.txt
```

Re-run after each migration phase into a new file and diff. The only acceptable diffs are ones you can name (e.g. deliberate dedupe of `.whitespace-nowrap`, declared twice in typography/styles.scss today).

## Phase 0 — minor findings

- `src/scripts/components/README.md`: the "Lint rules" section lists C1–C5; add the C6 row (generated `slot-contract.ts` must match the manifest; `npm run generate:slots` on drift).
- `src/scripts/utilities/README.md`: stale paths — says manifests live at `src/core/**` ; actual locations are `schemas/utility-manifest.schema.json` consumers at `src/tokens/styles/utility-classes/*.utilities.manifest.json` (co-located with generated partials) and mixins at `src/tokens/styles/mixins/`. Fix every `src/core` reference. Update this README again at the end of Phase 2/3 for the new manifest locations, `rules` kind, and command names.
- `src/tokens/styles.scss` header comment: says generated partials live in `tokens/styles/mixins/`; they live in `tokens/styles/utility-classes/`. Fix (and revisit after Phase 3 renames).
- CLAUDE.md + AGENTS.md: both say the docs dev server is Astro (it's SvelteKit); neither mentions `lint:components` / slot generation. Fix both. AGENTS.md is a near-verbatim copy of CLAUDE.md — make CLAUDE.md canonical and reduce AGENTS.md to a short pointer ("Agent guidance lives in CLAUDE.md; everything there applies") plus anything genuinely Codex-specific. Do not maintain two copies.
- GRAMMAR.md: add one line to §7 (or §10) stating the convention lint C5 depends on: *component sources must reference slot names as string literals at `slotted()`/`hasSlotted()`/icon-helper call sites — never through variables* — so the delivery diff can see them.
- Update CLAUDE.md's Build & Development Commands after Phase 3 so it shows the consolidated verbs.

## Phase 1 — extend the utility-manifest schema with a `rules` kind

The class-family grammar (`classes` / `pattern`) can't express three things the migration needs: CSS-variable-setting classes with nested compound selectors (transition), pseudo-class rules (`.focusable:focus`), and element-selector prose styles in `@layer base`. Add a third mutually-exclusive family kind, `rules`, to `schemas/utility-manifest.schema.json`:

```jsonc
{
  "name": "transition-speed",
  "description": "Compound speed modifiers scoped to any transition-* class.",
  "source": "src/tokens/transition/styles.scss",
  "properties": ["--zbk-transition-duration"],
  "layer": "utilities",                    // prose families will say "base"
  "rules": [
    {
      "selector": "[class^='transition-'], [class*=' transition-']",
      "declarations": {
        "transition-timing-function": "var(--zbk-transition-timing-function)",
        "transition-duration": "var(--zbk-transition-duration)"
      },
      "nested": [
        { "selector": "&.transition-slow", "declarations": { "--zbk-transition-duration": "var(--zbk-transition-duration-slow)" } }
      ]
    }
  ]
}
```

Implementation notes:

- `expand.ts`: a `rules` family's predicted class set = every `.class` token extractable from its selectors (top-level and nested) — reuse/extract the selector-class regex from `lint.ts`'s `extractClasses`. That keeps U3 (bidirectional diff) working unchanged. Element/attribute selectors predict no classes, which is correct for prose.
- `generate.ts`: render rules verbatim (selector, declarations, nested), wrapped in the family's `@layer`. Emit `--zbk-` prefixed vars literally — the generated file is literal SCSS/CSS, same as today's generated partials.
- `lint.ts` U2: validate that every `var(--zbk-...)` referenced in `declarations` resolves to a real token (reuse `token-source.ts`; token CSS-var names are derivable the same way the pattern lint does it). Selectors are free-form.
- Schema: `rules` is mutually exclusive with `classes` and `pattern`; `modifiers.responsive` is not supported on `rules` families (nothing today needs it — fail validation rather than half-supporting it).
- Keep `guidance`, `tier`, `a11y` available on `rules` families — that's the whole point (guidance living in manifests, not comments).

Also in this phase: widen lint U5 coverage so all class-emitting token SCSS is in scope. Replace `UTILITIES_PARTIALS_GLOB` with a glob list: `src/tokens/styles/mixins/_*.scss`, `src/tokens/*/styles.scss`, `src/tokens/prose/**/styles.scss`, `src/tokens/styles/utility-classes/*.scss` (keep `IGNORED_PARTIALS` for `_generators.scss`/`_index.scss`; ignore `styles/variables/`). Every newly-in-scope file that isn't manifest-covered yet goes into `LEGACY_PARTIALS` (now storing repo-relative paths, not basenames) — the ledger grows once here, at the moment the safety net widens, then only shrinks through Phases 2a–2d until it is empty.

## Phase 2 — migrate everything onto manifests

Workflow per file, always: **author manifest → `generate:utilities` → lint → compare class diff → delete legacy source/ledger entry.** The lint cannot read mixin-emitted classes, so never try to lint the old file; generate over it.

Manifest placement: co-locate with the token module (`src/tokens/elevation/elevation.utilities.manifest.json`) — `MANIFEST_GLOB` is already `src/tokens/**/*utilities.manifest.json`, so this works with zero glob changes. Keep each family's `source` pointing at the module's existing `styles.scss` path so the token build's `**/styles.scss` gather glob keeps picking it up; the file simply becomes generated instead of hand-written. Border/color (no owning module directory under a matching name) follow the existing convention: manifest + generated partial in `src/tokens/styles/utility-classes/`.

### 2a — pure pattern families (easy, do first)

- **elevation** → family `shadow`, `pattern.base: "shadow"`, values `none,xs,sm,md,lg,xl,2xl,inner,inner-sm,inner-lg` bound to the elevation token module (prefer omitting `values` to auto-derive from the token group if the group is exactly this set), responsive modifiers (current mixin is `generate-responsive-token-utility`).
- **opacity** → family `opacity`, values 0–100 scale, responsive.
- **z-index** → family `z`, numeric + semantic values, **no** responsive modifier (current mixin is the non-responsive `generate-token-utility`).

### 2b — spacing + position (`src/tokens/spacing/styles.scss` + `_spacing.scss` + `_position.scss`)

- Size families: `height`, `min-height`, `max-height`, `width`, `min-width`, `max-width` over `$size-values`, responsive. Mirror the shipped `margin`/`padding` manifests — they are the reference implementation for edges/negatives/responsive.
- Position-offset families from `_position.scss` (`.top-05`, `.left-5`, …): `top`, `right`, `bottom`, `left` (check the mixin for an `inset` form and negative values before authoring).
- Once generated, `_spacing.scss` and `_position.scss` mixin definitions are dead — delete them and their `@use` references.

### 2c — typography (`src/tokens/typography/styles.scss` + `_font.scss`)

- Keyword `classes` families for the hand-written part: text-align, truncate/overflow, wrap, transform, decoration, word-break, whitespace. **Dedupe `.whitespace-nowrap` (declared twice) and note the intentional aliases** (`.text-nowrap`/`.text-wrap-none`, `.text-no-underline`/`.text-underline-none`) using the pattern `aliases` support or separate class entries — U4 (no class defined twice) will catch duplicates.
- Pattern families for the mixin-driven part, bound to the typography token module: font-family, font-size (responsive), line-height (responsive), font-weight (responsive), tracking, measure (responsive), line-clamp (responsive). Read `_font.scss` first — it is 253 lines and owns the exact class stems.
- There may be overlap with the existing `text.utilities.manifest.json` in `styles/utility-classes/` — check it before authoring; U2/U4 enforce family-name and class uniqueness across all manifests. Decide one home per family (recommend: keep/extend the existing text manifest, and make typography/styles.scss stop emitting what it covers).
- Then delete `_font.scss`.

### 2d — `rules` families (needs Phase 1)

- **transition** → one manifest, mixed kinds: `classes` families for `transition-<property>` (all, opacity, transform, color, background, background-color, height, width, fill) and `transition-<easing>` var-setters (ease, ease-in, ease-out, ease-in-out, linear); `rules` families for the `[class^='transition-']` base rule, the playful/calm motion/fx compound classes with their nested `&.transition-slow/fast` overrides. Also carries the `:root` default-var block — either a `rules` entry with `:root` selector or keep a tiny hand-written companion; prefer the `rules` entry so the whole file is generated.
- **focus** → `rules` family for `.focusable:focus/:focus-within/:focus-visible`.
- **prose** (`src/tokens/prose/{h1..h6,p,list}/styles.scss`) → one manifest per prose module (or a single prose manifest with one `rules` family per file — prefer per-module manifests, matching co-location), `layer: "base"`, selectors verbatim (`.prose > p, p.prose`, sibling-margin rules). These are element styles; predicted class set is just `prose` where it appears. The win is coverage (U5) + token-reference validation (U2) + a `guidance` home.
- **border** (`_border.scss`, 175 lines) and **color** (`_color.scss`, 306 lines) → read them and pick per-family kinds: color utilities (`text-*`, `bg-*`, `border-*` color classes) are almost certainly pattern families bound to color token groups; border width/style/radius likewise. These two are the largest unknowns in this plan — budget real time, and split into multiple families rather than forcing one grammar.

### 2e — close out

- `LEGACY_PARTIALS` is empty — delete the constant's contents (keep the shrink-only comment).
- Delete now-unused mixins from `src/tokens/styles/mixins/` (`generate-responsive-token-utility`, `generate-token-utility`, size/position/font generators) — grep for `@include` references first; `gen.from-breakpoint()` stays (generated SCSS uses it).
- Update `src/tokens/styles/utility-classes/COVERAGE.md` legacy tags.
- Final class-set diff against baseline; every difference named in the commit message.

## Phase 3 — command consolidation

No back-compat: rename, update every reference (`package.json`, both READMEs, CLAUDE.md, error messages in lint/generate scripts that name commands, `.github` workflows if any).

| Command | Runs | Notes |
|---|---|---|
| `generate` | `generate:components` + `generate:utilities` | everything manifest-derived, one verb |
| `generate:components` | slot contracts from component manifests | rename of `generate:slots` (update lint C6 messages) |
| `generate:utilities` | utility + token-module SCSS from utility manifests | unchanged name, now covers all token styles |
| `build` | `generate` → `build:cem` → `build:css` → `build:defaults` → `build:context` → `build:components` | the full ordered chain, currently implicit in `check`/`prepare`; implement as an npm script chain or thin `scripts/build-all.ts` |
| `build:tokens` / `build:css` / `build:cem` / `build:context` / `build:defaults` / `build:components` | unchanged | granular escape hatches stay |
| `lint` | `lint:components` + `lint:utilities` | |
| `check` | rewrite in terms of `lint` + the check variants | keep `check:*` (they're diff-based, not rebuilds) |

`prepare`/`prepublishOnly` should call `build` (or the relevant tail of it) instead of hand-listing steps — verify the CEM/context steps don't break `npm install` in consumer repos (prepare runs on git installs; if that's a concern, keep prepare minimal and let `prepublishOnly` run full `build`).

## Phase 4 — ship agent context to consumers

Today `build:context` writes per-component md + `llms.txt` to `docs/static/zebkit/context/` (tracked, drift-checked by `check:context`) and the package ships only `dist/cli/`, `dist/components/`, `dist/editor/`, `src/**/*.scss`.

1. **Package it**: in `scripts/build-cli.ts` (or a step in `build`), copy `docs/static/zebkit/context/` → `dist/cli/context/`. Already inside the `files` allowlist. Keep docs/static as the canonical tracked output; dist is a copy.
2. **`zebkit init`**: add a prompt (default yes; yes in `--quick`) — "Copy agent context (per-component markdown + llms.txt for local LLMs/agents)?" Writes to `zebkit/context/` in the consumer repo (or alongside wherever init already places zebkit assets — match its existing directory convention) and records the location in `zebkit.config.json` as `context.path` (omit/false = opted out).
3. **`zebkit pull`**: when `context.path` is set, refresh that directory from `dist/cli/context/`, honoring the config's `components` include/exclude block the way pull's token snapshots do (only copy md for components the consumer uses; always copy `llms.txt` — or regenerate a filtered llms.txt if the include-list machinery makes that cheap; a filtered copy is the better product but don't block on it).
4. Follow the existing `pull-command.ts`/`init-command.ts` dependency-injected style (`deps.pathExists`, `deps.ensureDir`, …) and add tests beside `pull.test.ts`/`init.test.ts` like the existing ones.
5. Docs: mention the pulled context dir in the docs site's getting-started/CLI page (docs/src/routes — search for the init/pull docs).

## Verification (every phase, and at the end)

- `npm run check` green (runs tests, type-check, both lints, CEM + context drift, docs build).
- Class-set diff vs baseline (Phase 2 phases): only named, intentional differences.
- Phase 4: `npm pack --dry-run` shows `dist/cli/context/*.md`; in a scratch dir, `npx zebkit init --quick` then `npx zebkit pull` produce and refresh the context files (the repo already has integration-test patterns for CLI commands — extend them rather than testing by hand only).
- `/verify` the end-to-end flow before the final commit.

## Known traps

- **The utilities lint reads SCSS source text.** It cannot see mixin-emitted classes. Never "lint first, migrate second" — author manifest, generate (overwriting the legacy file), then lint.
- **U4 duplicate detection** will fire on the typography dedupe/alias cases and on any overlap between new token-module manifests and the existing `styles/utility-classes` manifests (`text`, `margin`, `padding`). Resolve by choosing one owning family, not by `knownExceptions`.
- **z-index is non-responsive today.** Don't "helpfully" add responsive modifiers — that changes shipped CSS. Same discipline everywhere: this migration is CSS-neutral by definition; grammar improvements are a separate conversation with Mark.
- **jest module mapping**: repo scripts import with `.js` extensions under tsx/tsconfig-paths (see existing `src/scripts/**` imports); follow the existing import style exactly.
- **`check:context` diffs tracked output** — any change to `build:context` inputs requires regenerating and committing `docs/static/zebkit/context/`.
