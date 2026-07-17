# DTCG Alignment — Findings & Review

**Status:** Proposal / assessment. Companion implementation plan: [plan.md](plan.md).
**Spec target:** [DTCG Design Tokens Format Module **2025.10**](https://www.designtokens.org/tr/drafts/format/) — the first *stable* release of the spec (announced 2025-10-28). The [Resolver Module](https://www.designtokens.org/tr/drafts/resolver/) (themes/modes) is still a draft and is explicitly **not** a target here.

This document is the review: what zebkit's token system looks like against the spec, what alignment costs, what it buys, and what it risks. The plan document holds the phased execution detail.

---

## TL;DR recommendation

Do it, and do it now — but at the **"conformant document, documented escape hatch"** depth, not "100% of tokens strictly spec-typed."

- The timing is uniquely good: the spec just went stable, zebkit is pre-release with an explicit no-back-compat policy, and roughly a third of the work is a scriptable rename.
- Zebkit already matches the spec in the places that are hardest to retrofit later: the alias syntax is already DTCG's `{group.token}` curly-brace form, override files already use the spec's recommended `.tokens.json` extension, token names already satisfy the spec's naming rules, and the three-strata reference discipline maps cleanly onto DTCG groups and aliases.
- Full strict typing of *every* token is **not achievable and should not be attempted**: zebkit's token surface deliberately covers the whole CSS value space (`display: contents`, `cursor: not-allowed`, `transform: translateY(0)`, transition property lists, `%`/`ch` lengths), while DTCG's type vocabulary covers a narrower "design decision" space. The right shape is: DTCG types everywhere one exists, a small documented set of zebkit-proprietary `$type` values for the remainder, and zebkit-specific metadata under a single `$extensions` vendor key.

Estimated effort: **~14–23 focused engineering days** (see [Level of effort](#level-of-effort)), highly compressible because most of it is codemod + regenerate + golden-diff work rather than design work.

---

## Current state (inventory)

What actually exists today, verified against the source:

| Surface | Count / shape |
|---|---|
| Token modules (`**/tokens/tokens.ts`) | 47 under `src/tokens/` + 8 component modules under `src/components/` |
| Token entries | ~1,000+ `{ value, type, description, a11y?, additional? }` objects |
| Token types (`allowedTokenTypes`) | 28 custom types (`color`, `spacing`, `rootSize`, `boxShadow`, `transition`, `utility`, `display`, `flex`, `setting`, …) |
| Alias syntax | `{module.entry}` — exactly two segments, validated + type-compat-checked in `token-converter.ts` |
| Theme override files | 204 × `zbk-<module>.tokens.json` under `theme/` (hero themes, docs theme) — flat maps of the same `{value, type, description}` objects |
| Zod schemas | One `token-schema.ts` per module (55+), plus `tokenObjectSchema` / `fontFamilyTokenObjectSchema` in `src/definitions/tokens.ts` |
| Pipeline consumers of the shape | 51 non-test TS files; core: `compile-tokens`, `token-converter`, `build-type-scale`, `build-space-scale`, `compile-variants`, `build-helpers`, prune engine/graph |
| Downstream consumers | Docs site (`TokenCatalog`, `token-chain`, `default-tokens.json`…), editor JSON Schemas (`schemas/tokens/*.schema.json`, generated), CLI defaults snapshots (`build:defaults`), CSS custom-data autocomplete |
| Color primitives | **Not tokens at all** — hsl ramps generated in SCSS (`src/tokens/colors/palette/_*.scss` + `_primitive-color.scss` mixin); `{color.blue-500}` references resolve against a `paletteMap` allowlist, not against token entries |
| Other "virtual" alias targets | `tokenAliasMap` (`font-weight.bold`, `tracking.tight`, …) — primitives hardcoded in CSS, referenceable as if they were tokens |
| Fluid scales | `font-size` and `spacing` author a min-viewport floor; `resolveTypeScale`/`resolveSpaceScale` bake `clamp()` + a11y-modifier `calc()` at build time; controlled by `type: "setting"` tokens that are consumed and never emitted |
| a11y runtime dials | `a11y: true \| "<custom>"` per token → `calc(<value> * var(--zbk-a11y-*-modifier))` wrapping at conversion |
| Font loading | `fontFamily` tokens carry `source`/`fallback`/`weights`/`styles`/`faces`/`display` driving Google/`@font-face`/head-snippet emission |

### Where zebkit already agrees with the spec

These are genuine head starts, not coincidences to hand-wave:

1. **Alias syntax is byte-identical.** `"{color.blue-500}"`, `"{action.canvas}"` — this *is* DTCG's curly-brace reference form. No authored value changes for aliases.
2. **File extension already matches.** The spec recommends `.tokens` / `.tokens.json`; all 204 override files already use `.tokens.json`. (Flip side: today those files are *not* valid DTCG, so a DTCG-aware tool that picks them up by extension will choke. Alignment fixes a latent lie.)
3. **Names are already legal.** DTCG forbids names containing `.`, `{`, `}` or leading `$`. Zebkit entry names (`canvas-inverse-emphasis`, `neg-105`, `2xl`) all pass.
4. **The metadata discipline maps 1:1.** `value → $value`, `type → $type`, `description → $description` are mechanical renames. `a11y`, `layer`, font-loading fields, fluid-scale settings map onto `$extensions`.
5. **Two-level `module.entry` structure is a valid (shallow) DTCG group tree**, and the spec's group-level `$type` inheritance would actually *remove* boilerplate (e.g. every semantic color module repeats `type: "color"` 24 times today).

### Where the spec and zebkit genuinely diverge

This is the real work, in descending order of depth:

1. **Value shapes.** DTCG values are structured JSON, not CSS strings:
   - `color`: `{ colorSpace, components[], alpha?, hex? }` — zebkit colors are aliases (fine) or CSS strings/keywords.
   - `dimension`: `{ value: number, unit: "px" | "rem" }` — zebkit's rem/px strings (`"-1.5rem"`, `"2px"`) convert cleanly; **`%`, `ch`, `em`, `calc()` are not representable** (see divergence 3).
   - `shadow`: array of `{ color, offsetX, offsetY, blur, spread }` objects — elevation's `"0 1px 3px 0 rgb(0 0 0 / 0.1), …"` strings must be parsed once into structure, and a serializer must turn structure back into CSS at build time.
   - `duration` `{ value, unit }`, `cubicBezier` `[x1,y1,x2,y2]` — zebkit's single `transition` type conflates durations, easings, *and* transition property lists; it must split into `duration` + `cubicBezier` + a proprietary type for property lists.
   - `fontWeight`, `number` (line-height, opacity, z-index) — near-free; values are already numbers or numeric strings.
2. **Aliases must resolve in-document.** DTCG references must point at tokens that exist in the document. Zebkit's `{color.blue-500}` and `{font-weight.bold}` point at *SCSS-generated CSS variables* that exist nowhere in token space. Alignment forces materializing the primitive palette (and the `tokenAliasMap` primitives) as real tokens. This is the single most architecturally interesting consequence — and independently valuable (see Pros).
3. **DTCG's type vocabulary is narrower than zebkit's token surface.** No DTCG type exists for: `display`, cursor values, `text-transform`/`text-decoration`/`text-align`, `transform`, transition property lists, `content`, `flex`, `utility` (unitless multipliers used as dials), or lengths in `%`/`ch`/`em` (measure tokens like `72ch`, `50%` radii, `1em` icon sizing). ~150–200 entries land here. They keep proprietary `$type` values under a documented registry; a strict-mode export can filter or annotate them for tools that only accept spec types.
4. **No DTCG concept of:** fluid scales (`clamp()` generation), runtime a11y multipliers, font loading (`@font-face`/Google), CSS `@layer` assignment, state suffixes (`-hover`), or CSS-variable emission. All of this is zebkit's value-add and lives in `$extensions` + build config. Consequence: a design tool importing zebkit's DTCG file sees the *static floor* values — correct but partial fidelity. That is acceptable and should be documented, not fought.

---

## Level of effort

Assumes the depth recommended above; breakdown mirrors the plan's phases.

| Work | Estimate | Character |
|---|---|---|
| Golden baseline + decision lock-in (Phase 0) | 0.5–1 d | Mechanical; do first, everything hangs off it |
| `$`-prefix rename + `$extensions` migration, all modules/schemas/theme JSON/pipeline/tests (Phase 1) | 2–4 d | ~90% codemod; broad but shallow. Biggest single diff of the project |
| Dimension family restructuring (spacing, sizing, rootSize, borderWidth/Radius, fontSize, letterSpacing) (Phase 2a) | 2–3 d | Touches fluid-scale resolvers — the most delicate pipeline code |
| Color family + palette materialization + docs palette rewiring (Phase 2b) | 3–5 d | The deep one; inverts palette source of truth from SCSS to tokens |
| Shadow (elevation + component box-shadows) (Phase 2c) | 0.5–1 d | Small, well-bounded |
| Transition split (duration / cubicBezier / property lists) (Phase 2d) | 1–2 d | Type split + utility manifest touch-points |
| Typography leftovers, number types (opacity, z-index, line-height, fontWeight) (Phase 2e) | 1–2 d | Mostly free |
| Spec-valid document emission: nested groups, group `$type`, combined + per-module artifacts, override ingestion (Phase 3) | 2–3 d | Reshapes exports and `compile-token-helpers` merge |
| Validation gates, strict-mode export, docs-site + editor regeneration (Phase 4) | 2–3 d | Locks the alignment in so it can't drift |
| Docs/CHANGELOG/VISION addendum (Phase 5) | 0.5–1 d | Writing |
| **Total** | **~14–23 focused days** | Wall-clock compressible; phases 2a–2e parallelize |

Confidence: the top end covers the two known risk pockets — the fluid-scale resolvers (byte-identical `clamp()` output required) and the palette inversion (docs site currently *parses SCSS* to build its palette page).

---

## Pros

1. **Interoperability, which is the whole point of the project's dream.** VISION.md's "design handoff with zero translation loss" currently stops at zebkit's own border. DTCG is the interchange format for Figma Variables import/export, Tokens Studio, Style Dictionary v4+, Terrazzo, and Penpot. Post-alignment: a consumer can export variables from Figma and drop them in as a zebkit theme, and zebkit hero themes can be pushed *into* design tools. "Style it to look like basically anything" gains an on-ramp from every major design tool.
2. **Perfect timing.** Stable spec (2025.10) + pre-release library + explicit no-shim policy = the one moment this is a clean refactor rather than a migration program. Post-1.0 this same change would require the back-compat machinery the project forbids.
3. **Self-contained token artifacts.** Materializing the palette as tokens (forced by the alias-resolution rule) means the exported token document finally contains everything it references. Today's exports are un-interpretable without the SCSS. The docs site can stop regex-parsing `_primitive-color.scss`; validation can become closed-world; the prune graph gets a complete picture.
4. **Structured values unlock tooling.** Color components + alpha as data (not strings) enable programmatic contrast checking against the `a11y` flags; shadow objects enable editor UIs; `dimension` objects kill a whole class of string-parsing in the scale resolvers.
5. **Less boilerplate, not more.** Group-level `$type` removes the per-entry `type:` repetition in every homogeneous module (most of them). `$deprecated` replaces ad-hoc conventions as the system grows toward 1.0.
6. **Free ecosystem tooling.** Validators, diff/linters, and documentation generators that speak DTCG work out of the box, and the generated editor JSON Schemas get simpler because the document shape is standard.
7. **Credibility.** For an accessibility-first, agent-first system that markets deterministic overrides, "our interchange format is the W3C community group standard" is a real adoption argument.

## Cons

1. **DTCG covers less than zebkit needs.** The ~150–200 CSS-keyword/percentage/ch tokens stay proprietary forever (or until the spec grows). "Aligned with DTCG" will always mean "conformant document with a documented extension registry," not "every token strictly spec-typed." Anyone auditing with a strict validator needs the strict-mode export, not the full document.
2. **Authoring verbosity for structured values.** `{ value: 4, unit: "px" }` and five-member shadow objects are heavier to write than `"4px"` and a CSS string. Mitigated by group `$type`, TS helper constructors, and the fact that most authored values are aliases anyway — but real.
3. **New serialization layer = new bug surface.** Structure → CSS string conversion (colors, shadows, dimensions, beziers) is new code in the hottest path of the build. The golden-baseline diff (plan Phase 0) exists precisely to catch this, but it's the largest genuine risk.
4. **Breadth of churn.** 55 modules, 204 theme files, 51 pipeline files, every schema, the tests, the docs data layer, the editor schemas, the CLI snapshots. All shallow, but a long tail of touch-points — the kind of refactor where the last 10% (a forgotten hero-theme file, a docs component reading `.value`) produces annoying drift. Hence the plan's per-phase gates.
5. **Partial fidelity on import into design tools.** Fluid scales, a11y dials, and font loading live in `$extensions`; external tools will see static floors and ignore the rest. Not a regression (today they see nothing), but expectations need documenting.
6. **Opportunity cost.** ~3–5 weeks not spent on components/docs pre-1.0. The counterweight is Pro #2: this is the cheapest this will ever be.

## Rejected alternative: DTCG at the edges only

Keep the internal `{value, type}` shape and write import/export converters (`dtcg-export` / `dtcg-import`). ~3–5 days, delivers most tool interop.

Rejected because it institutionalizes **two formats and a mapping layer forever** — precisely the "back-compat shim" pattern CLAUDE.md forbids pre-release — and the mapping layer becomes the drift point (every new token type/feature must be added twice). The user constraint for this effort ("no mapping or back compat, just refactoring") also rules it out. Mentioned only so the option is on record as considered.

---

## Things you may not be thinking of

1. **The Resolver Module is coming, and overlays are already shaped for it.** DTCG's draft resolver spec expresses "contexts" (light/dark, brand A/B) over token sets — which is structurally what `tokens.overlays` + hero themes + `[data-zbk-theme]` scoping already do. Don't build against the draft, but when phase 3 shapes the document artifacts, keep base-vs-overlay as *separate DTCG documents* (which they already are) so a future resolver manifest can point at them without another refactor.
2. **Aliases deeper than two segments.** DTCG allows `{a.b.c.d}`; zebkit hard-codes exactly two segments (`token-converter.validateCssReferencesExist`). Alignment should keep zebkit's two-level authoring convention (it *is* the `--zbk-module-entry` CSS naming scheme) but the reference *parser* should accept arbitrary depth so imported DTCG documents with nested groups can resolve. Flattening rule (group path → CSS var name) must be defined once, in one place.
3. **JSON Pointer (`$ref`) and `$extends` are in the stable spec.** You don't have to support authoring with them, but a conformant *reader* (theme override ingestion) will meet them in files exported by other tools. Decide explicitly: phase 3 supports curly-brace aliases fully and rejects `$ref`/`$extends` with a clear error (documented limitation), rather than half-supporting them silently.
4. **`$type` group inheritance interacts with Zod strategy.** Once `$type` can live on the group, per-entry schemas can't require it. The cleanest end-state: one generic DTCG-document Zod schema in `src/definitions/` + per-module *refinements* (which entries must exist, which extension fields are allowed), rather than 55 hand-maintained near-identical schemas. That's a net deletion of code.
5. **The palette inversion has a UX consequence for theming.** Today a consumer can't override primitive ramp colors via token overrides (they're SCSS). Materialized palette tokens make `zbk-color.tokens.json` overrides *possible* — decide deliberately whether that's now supported or lint-blocked (VISION's strata rules say aliases reference primitives; it's silent on overriding primitives themselves — GRAMMAR/VISION should gain a sentence either way).
6. **`transparent` and `currentColor`.** DTCG color has no keyword form. `global-transparent` already exists as a palette concept — materialize it as `{colorSpace: "srgb", components: [0,0,0], alpha: 0}` and keep `currentColor` (if it ever appears) as a proprietary-typed token. Check variants too: variant override values (`canvas: 'transparent'`) are raw strings in a *separate* system (`compile-variants`) that DTCG doesn't govern — variants stay untouched by this effort. Worth stating loudly in the plan so scope doesn't creep.
7. **Numeric-looking keys and JS object ordering.** Spacing keys like `"0"`, `"1"`, `"10"` iterate in numeric-first order in JS objects. This is already true today (so no regression), but if phase 3 round-trips documents through other tools, key order may shuffle. Nothing in the pipeline may ever depend on entry order — the plan adds a test asserting output stability under key reordering.
8. **Media type.** Serve/emit exported documents as `application/design-tokens+json` where content type matters (docs site static serving config).
9. **Keep requiring `$description`.** The spec makes it optional; zebkit's every-token-documented discipline is a differentiator (and feeds the agent context builds). Enforce via zebkit's own lint, not by pretending the spec requires it.
10. **The codemod is a deliverable, then it's garbage.** Write the shape-migration codemod as a checked-in script (it must also convert the 204 theme files and any user follows the same path), run it, keep it for one release cycle for external theme authors' one-time use… except there are no external users pre-release — so delete it in the same PR series. Do not let it become a compat layer.
11. **`allowed-token-types.json` and the type-compat map become public contract.** Post-alignment, `$type` values are the interop surface. The proprietary-type registry needs a home in `src/definitions/` with the DTCG set and the zebkit set clearly separated, and the exported `allowed-token-types.json` should mark which is which.
