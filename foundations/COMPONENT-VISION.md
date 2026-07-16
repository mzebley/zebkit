# The Component Vision

*The narrative companion to [VISION.md](VISION.md) (why zebkit exists) and [GRAMMAR.md](GRAMMAR.md) (the binding contract). This document tells the story of what a zebkit component is — written for the doc site, for humans deciding whether to build with this, and for anyone who wants the reasoning behind the rules.*

---

## The perfect baseline

Every component library rewrites the button. Not because buttons change — because *their* button was never actually finished. It was finished-looking: styled for one brand, sized for one product, with the semantics and keyboard behavior added to whatever level the deadline allowed.

Zebkit starts from the other end. A button that does all the proper button things — real `<button>` semantics, keyboard behavior, focus management, ARIA, every interaction state — is functionally *finished, forever*. Everything left is appearance, and in zebkit, appearance isn't code. It's data.

So a zebkit component is the platonic ideal of its pattern: the semantically perfect, maximally accessible version of the thing, with **zero visual opinion** and **every visual property exposed as a token**. An unthemed zebkit button should feel like an unanswered question, not like zebkit's aesthetic. The answer arrives as token values, and the same skeleton wears any design without a line of component code changing.

That's the deal: we finish the hard, invisible 90% once. You describe the visible 10% in data.

## You write the element. That's the whole job.

```html
<zbk-button variant="ghost lg">Save draft</zbk-button>
```

That's a complete, correct, accessible, themed button. You didn't write its internal DOM, didn't wire its states, didn't pick class names, didn't remember anything. The custom element renders its own skeleton in **light DOM** — real HTML you can inspect, that utility classes and theme layers and the runtime accessibility controls can all reach, that reads correctly even before the JavaScript arrives.

The rendered classes underneath (`zbk-button`, `zbk-button--ghost`) are stable and honest — nothing is hidden in a shadow root — but they're the compilation target, not a second way in. There is exactly one documented spelling for every intent. That's a feature, not a restriction: when there's one way to write a thing, there's nothing to misremember, nothing to look up, and nothing for two teammates (or two code generations) to do differently.

## Variants: a named remapping, not a catalog

Here's the idea that makes the component count stay small while the design space stays infinite.

Most libraries handle "I want a ghost button" by shipping a ghost button — more CSS, another enum value, another thing to maintain, and inevitably not quite the ghost *you* wanted. Zebkit handles it the same way it handles theming, because it is the same operation:

**A variant is a named, partial remapping of a component's token surface, compiled to a class.**

```ts
{
  component: 'button',
  name: 'ghost',
  axis: 'style',
  overrides: {
    canvas: 'transparent',
    'canvas-hover': '{state.hover-wash}',
    ink: '{accent-primary.600}',
    'border-color': 'transparent',
  },
}
```

Four lines of data, and every button state — hover, active, focus, disabled — is handled, because states are just tokens and anything you don't override falls through to the base. There is no ghost-button CSS to write, no specificity to fight, no second component to keep in sync. The variant class re-points a handful of custom properties; the component that consumes them never changes.

Three things fall out of this:

- **Variants compose.** `variant="ghost lg"` works because `ghost` remaps colors and `lg` remaps sizes — disjoint token subsets. The optional `axis` label makes that explicit, so the system can warn you when two variants genuinely fight over the same property, without ever forbidding the combination.
- **Your variants are equal citizens.** A `brand-cta` variant is a JSON file in your repo, applied at build time exactly like a theme override — not a fork, not a wrapper, not a feature request. The library's shipped variants and yours go through the same door.
- **Re-theming reaches variants automatically.** Variant overrides point at *alias* tokens — the semantic layer — never at raw values. Remap what `{accent-primary.600}` means and every ghost button follows, in every state, with no variant edits.

Zebkit ships a small set of variants (`ghost`, `outline`, `subtle`, `sm`, `lg`) — but they're **structural recipes, not aesthetic choices**. "Ghost" defines a *shape of remapping* (transparent canvas, ink takes the accent role); the actual colors are still yours. They exist to show the pattern, and you can override or replace every one of them.

And for the genuine one-off — the thing that truly needs a CSS declaration the token surface doesn't cover — variants carry an escape hatch for consumer use. It's there so an edge case doesn't force you out of the system entirely, and it's labeled honestly: declarations that go through it leave the token and accessibility guarantees, and the build will say so. Zebkit's own variants never use it; a lint makes sure of that.

## Built for the developer with no memory

Zebkit components are designed for a consumer who remembers nothing: the developer on day one, the developer back after six months, and the AI agent generating UI — who is permanently both. They all need the same thing, and it isn't better documentation. It's a system where **correct guesses are the likely ones**.

So the components share one grammar, specified in [GRAMMAR.md](GRAMMAR.md) and binding on every component, forever: the same `variant` attribute everywhere, the same token pattern (`--zbk-{component}-{property}-{state}`), the same state suffixes, the same slot names, the same event naming. Learn one component and you've learned them all — if a reasonable guess about a component you've never used turns out wrong, we treat that as *our* bug, not yours.

The contract is also machine-readable, and machine-*checked*: every component ships a Custom Elements Manifest entry, a validated token schema, and a variant registry entry, and the documentation — including the context handed to AI agents — is generated from those same sources. Nothing you're told about the system is hand-written, so nothing you're told can drift from what ships.

And when you do get something wrong, the system answers in words that name the fix:

```
[zbk-button] Unknown variant "ghots". Registered variants: ghost, outline, subtle, sm, lg.
```

Because components are finished — the skeleton and grammar never churn — everything anyone ever learns about zebkit stays true. That's the quiet payoff of the platonic-component belief: a system that doesn't change is the only kind that can actually be *known*.

## Where it starts

The first two components are chosen to prove the two ends of the spectrum:

- **Button** — all appearance. A native `<button>` is already the platonic button; zebkit's job is the token surface, the variant model, and the conveniences (loading, icons) done right. If the variant idea works anywhere, it must work flawlessly here.
- **Tooltip / toggletip** — all behavior. One component, two trigger modes: the hover-and-focus hint wired through `aria-describedby`, and the click-triggered toggletip announced through a live region for screen readers — with Escape dismissal, hover persistence, and positioning that flips and shifts correctly on every browser your users actually have, not just the newest ones. If the "we finish the invisible 90%" promise means anything, it must mean something here.

Every component after these follows the same shape, measured against the same grammar. That's the vision: a fixed set of finished skeletons, a token language rich enough to describe anything, and one way to write each thing — so the only decision left on your desk is what it should look like. Which was always the fun part anyway.
