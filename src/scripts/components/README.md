# Component Manifests

Hand-authored JSON contracts (`src/components/{name}/zbk-{name}.manifest.json`) carrying the **guidance layer** of a component's contract: the slot vocabulary and semantics, usage guidance (useWhen/notWhen), keyboard contract, and canonical examples. Everything else — attributes, tokens, events, variants — stays derived from code (Custom Elements Manifest, token modules, variant registry). The manifest never restates it.

**The golden rule: the manifest defines slots and guidelines; the code delivers them.** The lint proves delivery in both directions.

## The pieces

| File | Role |
|---|---|
| `schemas/component-manifest.schema.json` | JSON Schema. Its slot-name enum IS the shared slot vocabulary (GRAMMAR.md §7) — adding a slot name means amending the spec. |
| `src/components/*/zbk-*.manifest.json` | The hand-authored manifests, one per component, beside the component. |
| `src/scripts/components/lint.ts` | `npm run lint:components` — keeps manifests and code honest (runs in `npm run check`). |
| `src/scripts/components/generate.ts` | `npm run generate:components` — writes each component's `slot-contract.ts` (never edit those by hand). |
| `src/components/*/slot-contract.ts` | Generated runtime contract. The component sets `static slotContract`; `ZebkitElement` warns on unknown `slot` names and fires the accessible-name check when `default` is required (override `accessibleNameWarning()` to tailor or opt out). |

## Lint rules

- **C1** — manifest validates against the schema.
- **C2** — integrity: `tag` has a CEM declaration and the manifest lives in that component's directory; `related`/`notWhen.instead` zbk-* tags exist; `variantTiers` keys are registered variants; slot `tokens.size`/`tokens.color` are real keys in the component's token module.
- **C3** — examples are executable documentation: zbk-* tags exist in the CEM; attributes on zbk-* elements exist in the CEM (global HTML attributes — `aria-*`, `data-*`, `on*`, `class`, ... — always pass, so anti-pattern examples stay writable); `slot="..."` values are declared by the manifest; `variant="..."` names are registered; a tier below recommended carries a `why`.
- **C4** — every zbk-* tag in the CEM has a manifest. `MISSING_MANIFESTS` in `lint.ts` is the migration ledger: shrink it, never grow it.
- **C5** — delivery diff: declared slots match the slots the component source consumes, both directions. Asymmetric on purpose — "declared but undelivered" accepts any quoted occurrence of the name (delivery flows through private wrappers like `renderIndicator('checked')`); "delivered but undeclared" uses only precise base-class call sites (`slotted()`/`hasSlotted()` literals, and `renderIcon`/`hasIcon`/`iconsAt` whose name parameter defaults to `icon`) so attribute names that shadow the vocabulary (`'checked'`) can't false-positive.
- **C6** — generated `slot-contract.ts` matches the manifest: the committed contract must equal what `npm run generate:components` would write. Fails on drift (a manifest changed but nobody regenerated, or a hand-edit to a generated contract). Run `npm run generate:components` and commit the result.
- **C7** — token-surface delivery diff: every `--zbk-{component}-*` reference in a component's `styles.scss` or `index.ts` has a token, and every defined component token is consumed. `KNOWN_TOKEN_EXCEPTIONS` is empty by default and may only document genuinely indirect consumption.
- **C8** — registration completeness: every component directory is imported from, re-exported by, and defined through `src/components/index.ts`.
- **C9** — Markdown HTML fences in `INSTALL.md` and component READMEs use the same executable-example checks as C3. Write ` ```html no-lint ` only for deliberately broken teaching examples; MDX fences remain out of scope until they have an MDX-aware parser.

## Anatomy of a manifest

```jsonc
{
  "$schema": "../../../schemas/component-manifest.schema.json",
  "tag": "zbk-button",
  "purpose": "What it is, one or two sentences.",
  "nativeElement": "button",
  "useWhen": ["The user triggers an action."],
  "notWhen": [{ "case": "Activation navigates.", "instead": "An <a> element." }],
  "guidance": ["Component-level rules tooling must respect."],
  "slots": {
    "default": { "description": "...", "required": true },
    "icon": {
      "description": "...",
      "presentational": true,                      // rendered aria-hidden
      "tokens": { "size": "icon-size" },           // governing token keys
      "positions": ["start", "end"],               // honors data-position
      "guidance": ["Slot-specific rules."]
    }
  },
  "keyboard": [{ "keys": "Enter / Space", "does": "Activates (native, preserved)." }],
  "examples": [
    { "title": "Basic", "html": "<zbk-button>Save</zbk-button>" },
    { "title": "Anti-pattern", "tier": "discouraged", "html": "...", "why": "What breaks." }
  ],
  "variantTiers": { "sm": "situational" },         // only names that differ from recommended
  "related": ["zbk-toggle"]
}
```

## Workflow: manifesting a component

1. Pick a tag from `MISSING_MANIFESTS` in `lint.ts`.
2. Author `src/components/{name}/zbk-{name}.manifest.json`. Slot semantics come from GRAMMAR.md §7; `tokens` keys from the component's `tokens/tokens.ts`.
3. Delete the tag from `MISSING_MANIFESTS`.
4. `npm run lint:components` — iterate until green; the findings name every bad reference and undelivered slot.

## Commands

```bash
npm run lint:components      # validate (also part of npm run check); --all shows every finding
npm run generate:components  # manifests -> src/components/*/slot-contract.ts (lint C6 fails on drift)
```
