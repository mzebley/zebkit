# Token Modules

Token modules are the token language: each folder under `src/tokens/` contributes a typed map of visual decisions to the build. Add a module when the scale or semantic meaning belongs in the shared vocabulary; component-specific surfaces belong beside their component instead.

## The pieces

| File | Purpose |
|---|---|
| `tokens/tokens.ts` | Exports `key`, an optional `layer`, and the default token map. |
| `tokens/token-schema.ts` | Exports the Zod `tokenSchema` that validates that map. |
| `src/definitions/tokens.ts` | Defines `TokenObject`: `value`, `type`, `description`, and optional `a11y`. |

```ts
export const key = 'spacing';

export default {
  compact: {
    value: '{spacing.05}',
    type: 'spacing',
    description: 'Compact spacing for dense layouts.',
  },
};
```

## Discovery and validation

Discovery is automatic: the build finds every `**/tokens/tokens.ts` beneath `src/tokens/`; component modules at `src/components/{name}/tokens/` follow the same convention. There is no registration list.

Each module must have its sibling schema. A missing schema, failed Zod parse, or value-conversion failure stops the build, so a module cannot silently ship only part of its surface.

## Keys and utility bindings

Modules with the same `key` merge into one logical group, with a warning when a later module overwrites a token. For example, primitive and semantic spacing modules both use `spacing`; put semantic aliases in [`semantic/`](semantic/) and keep the token strata in the [manifesto](../../VISION.md#the-token-strata-a-theory-of-change).

Utility manifests bind `tokens.group` to this key. When a token-bound family derives its values automatically, new tokens become utility values without a manifest edit; see [Token binding](../scripts/utilities/README.md#token-binding).

## Workflow

1. Add `tokens/tokens.ts` and `tokens/token-schema.ts` anywhere under `src/tokens/`.
2. Build the docs token set: `npm run build:tokens -- --config zebkit.docs.config.json`.
3. Run `npm run check` before handing off the change.

The docs token build writes the static token artifacts; `docs/scripts/copy-tokens.js` syncs them into the generated docs data. `npm run build:defaults` only creates the snapshots bundled with the CLI.
