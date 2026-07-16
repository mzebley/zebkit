# Handoff: repo hygiene (delete the previous eras)

Untracked handoff plan (2026-07-15, written by Fable from the `components` branch audit). Removes tracked artifacts from pre-rewrite eras and fixes stale path references left by the `src/core` → `src/tokens` rename. Almost entirely deletions and comment edits — no behavior changes.

**Mark reviews and commits himself — do NOT run `git commit`. When a grep contradicts this plan (a file IS referenced), stop and report instead of deleting.**

## Phase 1 — delete tracked artifacts

`git rm` each of these. The audit already verified none are referenced from `tsconfig*.json`, `jest.config.js`, `package.json`, `CLAUDE.md`, or the docs configs — re-grep each name across the repo (excluding `node_modules`, `dist`, `coverage`) immediately before removing, as insurance:

| Path | Why |
|---|---|
| `AGENT.md` | Old operating guide; states outdated strata ("semantic > alias > primitive"). AGENTS.md already says "do not maintain two copies" — this is the second copy. |
| `zebkit/` (whole directory: `index.esm.js`, `p-*.js`, `zebkit.esm.js`) | Stencil-era build output. |
| `zebkit.js`, `zebkit.js.map`, `zebkit.d.ts` | Root-level build artifacts from the old pipeline; current builds write to `dist/`. |
| `zbk-nudge-deck.min.css` | Stray compiled theme at root. |
| `HANDOFF-manifests-consolidation.md` | Describes completed, verified work (all phases done). |
| `HANDOFF-color-migration.md` | Completed — `LEGACY_PARTIALS` is empty, `color.utilities.manifest.json` shipped, U5 is depth-native. |

Do NOT touch:

- `DOCS-BUILD-PLAN.md`, `DOCS-DESIGN-BRIEF.md` — active docs-redesign working documents.
- `HANDOFF-utilities-context.md` — live plan, being executed this wave.
- `NOTES.md` — Mark's scratchpad (see Phase 3).
- `packages/zebkit-components/` — untracked local directory; leave for Mark.
- `INSTALL.md`, README files — owned by other plans in this wave.

## Phase 2 — stale reference fixes (comments only)

The `src/core` → `src/tokens` rename left dead paths in comments. Fix each, then run a final `grep -rn "src/core" src docs/src scripts *.md` sweep — the only remaining hits should be in files owned by other plans (`src/tokens/semantic/README.md` and `src/tokens/semantic/color/README.md` belong to HANDOFF-authoring-docs.md; leave them):

- `src/components/button/variants/types.ts:1` — header comment says `src/core/button/...`.
- `src/definitions/token-variants.ts:65` — example path in JSDoc.
- `docs/src/lib/data/utility-manifests.ts:4` — comment cites `src/core/styles/utility-classes/`.
- `src/tokens/styles/variables/_breakpoints.scss` — comment references `src/core`.
- `src/tokens/colors/shared-token-schema.ts` and `src/tokens/semantic/color/shared-token-schema.ts` — comment paths.
- `docs/src/lib/stores/viewport.svelte.ts`, `docs/src/lib/components/TypeScaleDemo.svelte` — comment paths.

While in `scripts/build-components.ts`: if HANDOFF-packaging-truth.md has not already landed, leave it alone (that plan rewrites the file and owns the "shadow styles" comment fix).

## Phase 3 — NOTES.md light pass (optional, constrained)

Only tick `[ ]` → `[x]` for items verifiably shipped (verify each in the code, do not infer). Candidates to check: the responsive position-sticky bug, and anything the utility-manifest migration covered. Add ONE line under the referenced-tokens-readability item noting it is addressed by the utilities agent-context rendering (HANDOFF-utilities-context.md renders resolved value vocabularies). Change nothing else — it is Mark's scratchpad, not documentation.

## Verification

- `npm run check` green (the deletions must not break the docs build — nothing imports these files, prove it by the build passing).
- `git status` in the summary: list exactly what was removed and edited.
