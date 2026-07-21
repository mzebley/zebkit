# Token Modules

Token modules are the token language: each folder under `src/tokens/` contributes a typed map of visual decisions to the build. Add a module when the scale or semantic meaning belongs in the shared vocabulary; component-specific surfaces belong beside their component instead.

Entries follow the [DTCG 2025.10](https://www.designtokens.org/TR/2025.10/format/) design-token shape — `$value` / `$type` / `$description`, with anything zebkit-specific namespaced under `$extensions["dev.zebkit"]` (the `a11y` modifier opt-in, font-loading metadata, generated-scale steps). See the [manifesto](../../foundations/VISION.md) and [plans/dtcg-alignment/](../../plans/dtcg-alignment/).

## The pieces

| File | Purpose |
|---|---|
| `tokens/tokens.ts` | Exports `key`, an optional `layer`, the default token map, and — rarely — an `extensions` block (group-level scale controls) or `cssEmission = 'external'` (the primitive palette). |
| `tokens/token-schema.ts` | **Optional.** A bespoke Zod `tokenSchema` only for modules with structural constraints (breakpoint ordering, generated scale steps, font-family loading metadata). Without it, the build validates against the generic `tokenModuleSchema`. |
| `src/definitions/tokens.ts` | Defines `TokenObject`: `$value`, `$type`, `$description`, and optional `$extensions`. |

```ts
export const key = 'spacing';

export default {
  compact: {
    $value: '{spacing.05}',
    $type: 'dimension',
    $description: 'Compact spacing for dense layouts.',
  },
};
```

## Discovery and validation

Discovery is automatic: the build finds every `**/tokens/tokens.ts` beneath `src/tokens/`; component modules at `src/components/{name}/tokens/` follow the same convention. There is no registration list.

Every module is validated. A module with a sibling `token-schema.ts` uses it; the rest validate against the generic `tokenModuleSchema` — a record of DTCG entries — so most modules need no schema file at all. A failed parse, invalid override, unknown token, broken reference, or value-conversion failure stops the build.

Full exports use the **Zebkit DTCG 2025.10 profile**: standard document structure plus the documented proprietary types required by zebkit's CSS surface. Curly aliases may have arbitrary depth and nested groups flatten with `-`; `$ref` and `$extends` are rejected deliberately. Strict exports contain only zebkit's fully implemented DTCG types, are reference-closed, and pass `npm run check:dtcg-validate` as DTCG 2025.10 documents.

## Theme overrides and exports

Override any shipped token, including primitive colors, with a structured value, a compatible curly alias, or a supported raw CSS shorthand. Unknown tokens and malformed or incompatible values fail the build; raw CSS that cannot be normalized fails when token export is requested.

```json
{
  "red": {
    "$type": "color",
    "600": {
      "$value": { "colorSpace": "hsl", "components": [8, 80, 48] }
    }
  }
}
```

Full and strict combined exports:

```json
{
  "configVersion": 1,
  "tokens": {
    "exportTokens": true,
    "exportStrict": true,
    "splitMode": "combined",
    "outputFormats": ["JSON"]
  }
}
```

This writes `<theme>-tokens.json`, `<theme>-tokens.strict.json`, and `<theme>.drop-manifest.json`. Set `splitMode` to `per-module` for `zbk-<module>.tokens.json` and `zbk-<module>.strict.tokens.json`; the drop manifest remains theme-level. `exportStrict: true` requires `exportTokens: true`.

## Keys and utility bindings

Modules with the same `key` merge into one logical group, with a warning when a later module overwrites a token. For example, primitive and semantic spacing modules both use `spacing`; put semantic aliases in [`semantic/`](semantic/) and keep the token strata in the [manifesto](../../foundations/VISION.md#the-token-strata-a-theory-of-change).

Utility manifests bind `tokens.group` to this key. When a token-bound family derives its values automatically, new tokens become utility values without a manifest edit; see [Token binding](../scripts/utilities/README.md#token-binding).

## Workflow

1. Add `tokens/tokens.ts` anywhere under `src/tokens/`. Add a `token-schema.ts` only if the module has structural constraints the generic schema cannot express.
2. Build the docs token set: `npm run build:tokens -- --config theme/zebkit.docs.config.json`.
3. Run `npm run check` before handing off the change.

The docs token build writes the static profile artifacts; `npm run build:doc-token-data` parses them through the shared DTCG boundary and writes the flat, display-ready docs projection. `doc-site/scripts/copy-tokens.js` only copies already-generated artifacts. `npm run build:defaults` creates the snapshots bundled with the CLI.
