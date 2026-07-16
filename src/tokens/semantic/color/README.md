# Semantic Color Tokens

Semantic color families describe what a color does in the interface: `canvas`, `ink`, or `border`, with prominence and inverse forms where the shared schema provides them. Components reference these aliases rather than raw palettes, so a theme can remap a role without changing component code.

Each family lives in `src/tokens/semantic/color/{family}/tokens/`, exports its logical `key`, and uses `shared-token-schema.ts` for the common color-role surface. Discovery is automatic; adding a family does not require compiler wiring. Follow the [token-module guide](../../README.md) for the module contract and the [manifesto](../../../../foundations/VISION.md#the-token-strata-a-theory-of-change) for the alias-to-primitive rule.

Existing families are `app`, `action`, `brand`, `accent-primary`, `accent-secondary`, `positive`, `caution`, `critical`, `info`, and `disabled`.
