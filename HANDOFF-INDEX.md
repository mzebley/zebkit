# Handoff index: the pre-main wave

Untracked coordination doc (2026-07-15, written by Fable). Five plans take the `components` branch from "audit findings open" to "ready to merge to main." Each plan is self-contained for an agent with no other context; this file exists so the wave can be dispatched without collisions.

**Every plan inherits: read VISION.md + GRAMMAR.md first; pre-release, no back-compat; Mark reviews and commits himself — agents never run `git commit`.**

## The plans

| Plan | Scope | Size |
|---|---|---|
| [HANDOFF-packaging-truth.md](HANDOFF-packaging-truth.md) | Per-component subpath exports, multi-entry build, INSTALL.md fixes, package.json truth (P0 — the docs currently describe a package that doesn't exist) | M |
| [HANDOFF-contract-enforcement.md](HANDOFF-contract-enforcement.md) | New lints C7 (styles↔tokens diff), C8 (registration), C9 (markdown examples); variant override typos fail the build; Zod errors name the fix | M–L |
| [HANDOFF-repo-hygiene.md](HANDOFF-repo-hygiene.md) | Delete Stencil-era artifacts, AGENT.md, two completed handoffs; fix stale `src/core` comments | S |
| [HANDOFF-authoring-docs.md](HANDOFF-authoring-docs.md) | New `src/tokens/README.md` + `src/components/README.md`, root README trail head, semantic README fixes | S–M |
| [HANDOFF-utilities-context.md](HANDOFF-utilities-context.md) | Utility manifests → per-domain agent context, llms.txt as index, llms-full.txt, agents-page table generated (see its Addendum — color has landed) | L |

## Ordering and parallelism

```
packaging-truth ──→ contract-enforcement        (C9 lints the files packaging fixes)
repo-hygiene        (independent, anytime)
authoring-docs      (independent, anytime)
utilities-context   (independent, anytime)
```

File-ownership map — if two agents run concurrently, this is the law:

- `package.json`, `scripts/build-components.ts`, `INSTALL.md`, component README import lines → **packaging-truth** only.
- `src/scripts/components/lint.ts` + its README, `src/scripts/tokens/compile-variant-helpers.ts`, `compile-tokens.ts` → **contract-enforcement** only.
- `scripts/build-agent-context.ts`, `docs/src/routes/agents/+page.mdx`, everything under `docs/static/zebkit/context/` → **utilities-context** only.
- Root `README.md`, `src/tokens/**/README.md`, new `src/components/README.md` → **authoring-docs** only.
- Deletions and code-comment fixes → **repo-hygiene** only (it explicitly skips files other plans own).

Known cross-plan effect: contract-enforcement's C7 may surface real token-surface findings in components — fixing those (in `src/components/*/styles.scss` or `tokens/tokens.ts`) is in its scope and touches no other plan's files.

## Merge-to-main checklist (after all five land)

1. `npm run check` fully green. Note: `check:cem` / `check:context` diff against the git index, so they only pass once regenerated artifacts are staged/committed — stage generated files together with the change that caused them.
2. `npm run test:integration` green (includes the new packaging test).
3. `npm pack --dry-run` — file list sanity: per-component dist entries, `custom-elements.json`, context files under `dist/cli/context/`, no stray artifacts.
4. Smoke the consumer loop in a scratch dir: `npm install <packed tarball> && npx zebkit init --quick && npx zebkit build`, confirm `./zebkit/context/` contains component + utility docs and the CSS compiles.
5. Delete this index and any completed handoff files (or leave them untracked — they should not be committed).
6. Merge `components` → `main`.

## Explicit non-goals for this wave

- **`zbk-heading` rebuild** — stays on the `MISSING_MANIFESTS` ledger; it belongs to the component wave (`plans/components/`), where the conventions and reference implementations make it cheap.
- **Docs-site "Getting started" page** — INSTALL.md remains the canonical install doc this wave; the page belongs to the docs-redesign work (DOCS-BUILD-PLAN.md).
- **Per-component CSS/JS exclusion parity** (components config affecting the JS bundle) — the subpath exports lay the groundwork; wiring config to it is future work.
- **Linting `docs/**/*.mdx` code fences** — deferred from C9 (Svelte expressions in fences); noted as follow-up there.
