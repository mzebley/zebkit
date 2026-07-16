# Semantic Tokens

Semantic tokens are aliases that give a shared name to a design decision while preserving the primitive scale beneath it. They live beside primitive modules under `src/tokens/`, use the same module contract, and merge with primitives when they export the same `key`.

Author a semantic module through the parent [token-module guide](../README.md). The [manifesto's token strata](../../../foundations/VISION.md#the-token-strata-a-theory-of-change) define when an alias is the right layer; component-only decisions belong in the component token surface instead.

Current semantic domains include [border](border/), [color](color/), and [spacing](spacing/).
