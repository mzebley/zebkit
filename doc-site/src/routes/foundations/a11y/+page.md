---
title: A11y as runtime
description: Why zebkit treats accessibility as a runtime, end-user-controlled property of the system — not a build-time checklist.
layout: editorial
section: Foundations
status: draft
---

# Accessibility as a runtime property

Most systems treat accessibility as a build-time checklist: contrast verified, focus styles
present, ship it. Zebkit treats it as a **runtime, end-user-controlled property of the
system** — because that's where the whole project started, and because the checklist model
quietly assumes every user is served by the same compiled answer.

Accessibility modifiers are part of the token chain itself. Spacing, font sizing, line
height, motion — these can shift *while the application is running*, under the end user's
control, and everything built on tokens responds in real time.

```css
:root {
  --zbk-a11y-font-size-modifier-md: 1;
  --zbk-a11y-spacing-modifier: 1;
  --zbk-line-height-modifier: 1;
  /* …raise any of these and every token that trusts it scales together. */
}
```

<aside class="editorial-marginalia">
The fluid <a href="/typography/type-scale">type scale</a> is the clearest example: each
generated <code>clamp()</code> bakes in its font-size modifier, so the reader's font dial
multiplies through the entire scale at once.
</aside>

## Two consequences, both load-bearing

- **Responsiveness can't be opt-in.** An opt-in is a thing someone forgets. The reason every
  visual decision must flow through tokens — the reason a hard-coded custom class is an *exit
  ramp* — is that the a11y machinery can only guarantee what it can reach. Full token coverage
  *is* the accessibility architecture.
- **Accessibility precedes aesthetics.** Keyboard interaction, screen-reader semantics, focus
  visibility, and reduced-motion support are mandatory in components and prior to every other
  trade-off. A beautiful component that fails a keyboard user isn't finished; it's wrong.

Tokens carry an `a11y` flag identifying their participation in this chain, and the transition
system separates motion from effects so reduced-motion preferences degrade gracefully rather
than all-or-nothing. It all traces back to [the premise](/foundations/why-tokens): decisions
are data, so the user can hold some of them in their own hands.
