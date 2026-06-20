---
title: Tokens — the strata
description: Why zebkit is token-driven, and how the three strata compose.
layout: editorial
section: Foundations
status: draft
---

# The strata

Zebkit has exactly one opinion: **every visual decision is a token.** Nothing is hard-coded,
so anything can be re-themed without touching a component's internals.

Tokens compose in three strata, each referencing the one beneath it:

- **Primitive** — the raw material. `--zbk-color-ember-500`, `--zbk-spacing-3`. Values, not decisions.
- **Alias** — a semantic decision. `--zbk-app-canvas`, `--zbk-accent-primary-600`. *What a thing means.*
- **Component** — a namespaced default. `--zbk-button-background`. Wired to an alias, overridable per instance.

<aside class="editorial-marginalia">
Re-theming happens at the alias layer: point `--zbk-accent-primary-600` at a different
primitive and every affordance that trusts it moves together — no markup change.
</aside>

## See them all

The full, filterable inventory lives in the [token catalog](/tokens) — generated straight from
the compiled token set, so it always matches what ships.
