# Handoff: packaging truth (exports, INSTALL.md, dist hygiene)

Untracked handoff plan (2026-07-15, written by Fable from the `components` branch audit). Fixes the P0 findings: the package's documented import surface does not exist, and the install guide contains code that fails.

**Read VISION.md and GRAMMAR.md first. Pre-release, no back-compat: change shapes cleanly, no dual formats. Mark reviews and commits himself — do NOT run `git commit`.**

## Context (from the audit)

- All seven field/control READMEs document `import { defineZbkX } from "zebkit/components/{name}"`, but `package.json` `exports` only exposes `.` (the CLI bundle) and `./components`. In Node and any exports-respecting bundler the documented import throws `ERR_PACKAGE_PATH_NOT_EXPORTED`.
- `"main": "index.ts"` points at a file that does not exist.
- `INSTALL.md` tells consumers to call `defineCoreComponents()` (real name: `defineZebkitComponents`) and shows `<zbk-button variant="primary">` (registered variants: ghost, outline, subtle, sm, lg).
- `scripts/build-components.ts` never cleans `dist/components/` — stale `zbk-button.js`/`zbk-button.d.ts` from an older build shape sit there and would publish via `files`.
- `package.json` declares `"customElements": "custom-elements.json"` but `custom-elements.json` is not in the `files` allowlist, so the CEM never ships.

**Decision (made by Mark): per-component subpath exports, keeping the aggregate.** `zebkit/components` = register-everything; `zebkit/components/{name}` = one component. Both spellings stay because they serve different intents (GRAMMAR §1).

## Phase 1 — multi-entry component build

Rework `scripts/build-components.ts`:

1. `fs.emptyDir(dist/components)` before building (kills the stale files permanently).
2. esbuild with multiple entry points — `src/components/index.ts` plus every `src/components/{name}/index.ts` (discover by readdir, exclude `base`; do NOT hardcode a list). Use `bundle: true`, `splitting: true`, `format: 'esm'`, `outdir: dist/components`, entry naming so each component lands at `dist/components/{name}/index.js` and the aggregate at `dist/components/index.js`. Shared code (ZebkitElement, announce) must come out as shared chunks, not be duplicated per entry — verify by grepping two component outputs for the base class.
3. Keep the self-contained browser bundle (`dist/components/zebkit.js`) exactly as-is.
4. Type declarations for every entry: `dist/components/index.d.ts` plus `dist/components/{name}/index.d.ts`. rollup-plugin-dts accepts an input map + `output.dir`; tsc `emitDeclarationOnly` is an acceptable alternative if path aliases resolve. Implementation is the agent's call; the acceptance criteria below are not.
5. The component-token-roots step at the end (writes `dist/cli/defaults/component-tokens.json`) must keep working — point it at the aggregate output. While there, fix its comment: components render into **light DOM**, not "shadow styles".

## Phase 2 — package.json

```jsonc
"exports": {
  ".": "./dist/cli/zebkit.mjs",
  "./components": { "types": "./dist/components/index.d.ts", "import": "./dist/components/index.js" },
  "./components/*": { "types": "./dist/components/*/index.d.ts", "import": "./dist/components/*/index.js" },
  "./package.json": "./package.json"
}
```

- Delete `"main"` entirely (exports-only package).
- Add `"engines": { "node": ">=18" }` (INSTALL.md already claims it).
- Add `custom-elements.json` to `files`.
- Consider `"sideEffects": false` — only after verifying no module runs registration at import time (defines are explicit calls; grep for top-level `customElements.define` / `defineZbk*()` invocations outside functions). If anything is import-effectful, skip the flag and say so in the summary.
- Note: the `./components/*` wildcard also matches chunk files. Acceptable — nobody is documented to import chunks; do not add machinery to hide them.

## Phase 3 — INSTALL.md corrections

- `defineCoreComponents` → `defineZebkitComponents` (verify against `src/components/index.ts`).
- Replace `variant="primary"` with a registered variant (`outline` or `ghost` — check `src/components/button/variants/index.ts`).
- Verify every attribute in the `<zbk-heading>` example exists in its `custom-elements.json` declaration; if not, swap the example to grammar components (button + input).
- Add the per-component import form as the tree-shaking path alongside the register-everything form, mirroring the README wording.
- Do NOT touch root README.md (owned by HANDOFF-authoring-docs.md).

## Phase 4 — proof

- Component READMEs: no wording changes needed (their imports become true), but verify each documented specifier resolves per the map.
- Add an integration test (mirror the existing bundled-CLI integration test setup, `jest.integration.config.js`): for every directory under `src/components/` except `base`, assert `zebkit/components/{name}` resolves against the built package (packed tarball or `exports` resolution) and the dist file + `.d.ts` exist. This is the drift-proof guarantee that a future component can't ship undocumented or unexported.
- `npm pack --dry-run` — inspect: per-component files present, `custom-elements.json` present, no stray `zbk-button.js` at `dist/components/` root.

## Verification

`npm run build && npm run check` green, plus the new integration test via `npm run test:integration`. Report the pack file list in the summary.

## Ordering

Run BEFORE HANDOFF-contract-enforcement.md — its markdown-example lint (C9) validates the files this plan fixes.
