# Handoff: contract enforcement (close the remaining drift surfaces)

Untracked handoff plan (2026-07-15, written by Fable from the `components` branch audit). The audit found the manifest/lint system excellent but with four unguarded seams. Each phase below turns one honest-by-discipline contract into an honest-by-machine one (VISION: "a claim that can't be checked mechanically is a claim waiting to become a lie").

**Read VISION.md and GRAMMAR.md (§5, §9) first. Mark reviews and commits himself — do NOT run `git commit`. Run AFTER HANDOFF-packaging-truth.md (Phase 3 here lints files that plan fixes).**

Existing lint rules are C1–C6 in `src/scripts/components/README.md` + `src/scripts/components/lint.ts`. New rules continue the numbering and MUST be documented in that README's rule list when added. Every new message follows GRAMMAR §9: state the component, what is wrong, and the valid vocabulary/fix.

## Phase 1 — C7: token-surface delivery diff

The gap: nothing ties a component's `styles.scss` to its token module. A token defined in `tokens/tokens.ts` but never consumed renders in docs/agent context as a live surface that does nothing; a `var(--zbk-{component}-x)` with no backing token is an un-themeable property that silently uses fallbacks. This is exactly what U2/U3 already do for utilities — mirror that design.

For each component directory with `tokens/tokens.ts`:

1. Extract every `--zbk-{component}-*` reference from that component's `styles.scss` AND `index.ts` (some components read tokens at runtime — reuse `extractZbkTokens` from `src/scripts/prune/content-scan.ts` rather than writing a new regex; it already handles `var()` nesting).
2. Diff both directions against the token module's keys (keys include state suffixes literally, so it's a plain name match):
   - **Referenced but undefined** → error: incomplete token surface (GRAMMAR §5 violation).
   - **Defined but unreferenced** → error: dead surface (docs would lie). Support a per-component `knownExceptions` allowlist in `lint.ts` for any legitimately indirect token; start it empty, shrink-never-grow, comment why for each entry added.
3. Scope strictly to the component's own `--zbk-{component}-` prefix. References to alias/primitive vars in component SCSS are out of scope for C7 (strata discipline is a separate concern — do not expand into it here).

Expect real findings on first run — that is the point. Fix them in the components (usually a stale token or a missed state), never by allowlisting to get green.

## Phase 2 — C8: registration completeness

The gap: `src/components/index.ts` is the one manual wiring step. A forgotten registration builds, lints, and documents fine but silently never ships in the bundle.

C8: for every directory under `src/components/` except `base`, `src/components/index.ts` must contain (a) an import from `./{name}`, (b) re-exports of the class and define function, (c) a `defineZbk{PascalName}()` call inside `defineZebkitComponents()`. A string/regex check against the file source is sufficient and matches how C5 reads call sites; do not bring in a TS parser for this. Message names the three edits (the same list as `plans/components/00-conventions.md` step 1).

## Phase 3 — C9: markdown examples are executable documentation

The gap: lint C3 proves manifest examples honest, but `INSTALL.md` and the component READMEs sit outside the net — the audit found `defineCoreComponents` and `variant="primary"` shipped in the install guide.

C9: run the existing C3 validators (zbk-* tags exist in CEM; attributes on zbk-* elements exist in CEM with globals passing; `slot` values declared by that component's manifest; `variant` names registered) over every ` ```html ` fence in:

- `INSTALL.md`
- `src/components/*/README.md`

Notes:

- Reuse the C3 validation functions — extract them so both rules share one implementation; do not fork the logic.
- Non-zbk elements pass untouched (C3 already behaves this way), so the rendered-skeleton blocks in READMEs (internal `<label class="zbk-checkbox">` markup) lint clean.
- Support an opt-out fence tag (` ```html no-lint `) for deliberately broken teaching examples; document it in the README rule list. Do not use it to silence real findings.
- Leave `docs/**/*.mdx` out of scope for now (Svelte template expressions inside fences make it a different problem); note it as a follow-up in the summary.

## Phase 4 — variant override integrity fails the build

`src/scripts/tokens/compile-variant-helpers.ts` (~lines 160–175) only `console.warn`s when a variant override references an unknown component token — a typo'd key in a theme JSON silently no-ops. Pre-release, no back-compat:

- Unknown token references in variant overrides (shipped registry, bundled theme overrides, and consumer JSON) become **build failures**, collected across all variants and thrown as one error. Each line: component, variant, bad key, source file, and the valid token keys for that component (§9 format).
- Keep `components.{name}.variants` allowlist entries naming unknown *shipped variants* as warnings — that is config noise, not a silent visual no-op. State this distinction in a comment.
- Check test coverage in `compile-variants.test.ts` and extend it: one test proving the failure fires with the right message, one proving valid overrides still pass.

## Phase 5 — Zod failures name the fix

`validateTokenExport` in `src/scripts/tokens/compile-tokens.ts` (~line 220) swallows the ZodError: "Token export failed schema validation" says neither which module, which key, nor why. Capture the issues and include `path → message` lines in the fatal error entry for that file. Two-line change plus a test.

## Verification

- `npm run check` green end-to-end.
- QA the feedback loop (the "system talks back" test): temporarily introduce one violation per new rule — a var with no token, an unregistered component dir, a bad attribute in an INSTALL fence, a typo'd variant override key, a schema-invalid token — confirm each message names the fix, then revert. Paste the five messages in the summary.
- Update `src/scripts/components/README.md` rule list (C7–C9) and the workflow section if it changed.
