---
title: Why tokens
description: The premise behind zebkit — every visual decision is a token, and tokens are the design.
layout: editorial
section: Foundations
status: draft
---

# Why tokens

Zebkit rests on one belief, and everything else falls out of it:

> **Every visual decision is a token. Tokens are the design. Everything else is delivery.**

Most systems bury their decisions in CSS rules, component styles, and convention — places
that are hard to find, hard to change, and impossible to change *all at once*. Zebkit treats
the entire visual identity as a structured dataset: named, typed, described values that
compile to CSS custom properties. Components don't own their appearance; they *reference* it.
Utilities don't contain values; they *bind* to them.

<aside class="editorial-marginalia">
This inverts the usual relationship with a design system. You don't customize zebkit by
overriding it or fighting specificity — you describe what you want, in tokens, and compile.
A re-theme is a data operation, not a development project.
</aside>

## Three properties fall out

- **One mechanism, all timescales.** The same token chain serves the end user adjusting
  accessibility mid-session, the developer re-theming an app, and the designer handing off a
  new visual language. Nothing special-cased.
- **Determinism.** Given the same tokens, you get the same design. There is no interpretive
  layer where intent can drift.
- **Inspectability.** Because decisions are data, tooling can read, validate, and document
  them. A token has a name, a type, a description, and an accessibility flag — a value buried
  in a rule has none of those.

## A falsifiable claim

The premise is meant to be testable: if you ever hit a visual decision in zebkit that *can't*
be changed through tokens alone, that's a bug in the system, not a limit to work around.

See how the values compose in [the strata](/foundations/tokens), or browse the full,
generated [token catalog](/tokens).
