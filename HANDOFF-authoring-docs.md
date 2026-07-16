# Handoff: authoring docs (the two missing READMEs + entry points)

Untracked handoff plan (2026-07-15, written by Fable from the `components` branch audit). The repo's manifest guides (`src/scripts/{components,utilities}/README.md`) are excellent; the gaps are the two authoring guides they assume — how to add a token module, how to add a component — plus an entry-point trail from the root README. The audit's principle: **the best component-authoring doc already exists** (`plans/components/00-conventions.md`) but is framed as transient handoff material where a newcomer will never find it.

**Read VISION.md and GRAMMAR.md first, and Mark's doc style (project CLAUDE.md → user preferences): moderately concise, examples over prose, front-load critical info, 2–4 sentence explanations, no emojis. Mark reviews and commits himself — do NOT run `git commit`.**

Hard rule for this plan: **every fact keeps exactly one home** (the drift-proofing rule from `plans/components/README.md`). New READMEs link to existing homes; they never restate a checklist, schema, or command list that lives elsewhere. If a fact has no home yet, the new README becomes its home.

## Phase 1 — `src/tokens/README.md` (new): adding a token module

Follow the shape of `src/scripts/utilities/README.md` (pieces table → anatomy → workflow → commands). Content, with the source of each fact to verify against:

- **What a module is**: a folder anywhere under `src/tokens/` containing `tokens/tokens.ts` (exports `key`, optional `layer`, default token map) and `tokens/token-schema.ts` (exports `tokenSchema`, a Zod schema). Entry shape is `TokenObject` from `src/definitions/tokens.ts` — value, type, description, optional `a11y`.
- **Discovery is automatic**: the build globs `**/tokens/tokens.ts` (`src/scripts/tokens/gather-files.ts`) — no registration list anywhere. Component modules live at `src/components/{name}/tokens/` and are discovered the same way.
- **Validation is fatal**: missing schema, failed Zod parse, or a bad value conversion aborts the build (`compile-tokens.ts`, `build-tokens.ts`). A new module cannot silently half-ship.
- **Key merging**: modules sharing a `key` merge into one logical group (primitive `spacing` + `semantic/spacing`), with overwrite warnings. Semantic aliases go in `src/tokens/semantic/`; strata rules (references flow downward only) live in VISION.md — link, don't restate.
- **Utilities bind by key**: a manifest's `tokens.group` names the module `key`; auto-derived values mean new tokens flow into utility classes without manifest edits (link the utilities README's Token binding section).
- **Workflow + verify**: author module → `npm run build:tokens -- --config zebkit.docs.config.json` → `npm run check`. Note that new alias/primitive tokens surface in docs data via `build:defaults`.

While there: fix the stale `src/core/...` paths in `src/tokens/semantic/README.md` and `src/tokens/semantic/color/README.md`, and reconcile any statements that no longer match the code (the semantic README predates the rename — treat its claims as unverified until checked).

## Phase 2 — `src/components/README.md` (new): adding a component

A map, not a copy. Roughly one screen:

- What a zebkit component is, in two sentences, linking COMPONENT-VISION.md (the story) and GRAMMAR.md (the binding contract).
- The canonical build checklist — files every component ships and the edits outside the directory — **lives in `plans/components/00-conventions.md`**; link it as the authoritative how-to and say so explicitly. Do not duplicate the checklist (one home). If Mark later retires the plans directory, the checklist moves here — leave a comment noting that intent.
- The manifest workflow: link `src/scripts/components/README.md` (lint rules, manifest anatomy).
- The verification loop: `npm run generate && npm run lint && npm run check`; dev-mode warnings name the fix (GRAMMAR §9).
- Reference implementations: reuse the table from 00-conventions.md by LINK, not by copy.

## Phase 3 — root `README.md`: a trail head

Keep the manifesto tone and brevity. Add one short "Start here" section after the existing text:

- Using zebkit → `INSTALL.md`, docs site, `/zebkit/context/llms.txt` (agent context).
- Understanding it → `VISION.md`, `GRAMMAR.md`, `COMPONENT-VISION.md`.
- Extending it → `src/tokens/README.md`, `src/components/README.md`, `src/scripts/components/README.md`, `src/scripts/utilities/README.md`.

Do not edit INSTALL.md content (owned by HANDOFF-packaging-truth.md); linking to it is fine.

## Verification

- Every relative link in the three touched/created READMEs resolves (check by hand or a quick script).
- Every command quoted actually exists in `package.json` scripts and runs.
- `npm run check` green (docs build unaffected).
- Summary: list each fact you gave a first home to, and each fact you linked instead of restating.
