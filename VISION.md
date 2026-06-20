# The Zebkit Vision

This is the manifesto. The technical docs explain how zebkit works; this document explains what zebkit *is*, why it exists, and the beliefs that every architectural decision traces back to. It is written for two audiences at once: humans encountering the project for the first time, and AI agents who will build with it, extend it, or generate designs against it. If you are an agent, treat the principles and anti-goals in this document as constraints, not suggestions. If you are a human, treat them as the standard against which any proposed change should be argued.

Zebkit is still in discovery mode — building the dream, not maintaining a legacy. That makes this document more important, not less: while everything is still molten, this is the mold.

---

## Origin: a question about a variable

Zebkit started with a small invention and a long mulling.

The invention was a way to express accessibility modifiers as CSS variables — making things like font sizing and contrast respond to *end-user* adjustments at runtime, in real time, without rebuilding anything. That worked, and then the implication wouldn't let go:

> If an end user can change the font size and contrast in real time, why couldn't a developer change *anything* — any visual property at all — and update how things look without writing new classes every time?

That question contains the whole project. A CSS variable doesn't care whether it was changed by an accessibility control, a theme switcher, or a designer handing off a new visual direction. If every visual decision flows through a variable, then every visual decision becomes adjustable through the same single mechanism — at runtime by users, at build time by developers, at design time by designers. The mechanism that made accessibility responsive turns out to be the mechanism that makes *everything* responsive.

The second seed was the perfect button. A button that does all the proper button things — the semantics, the keyboard behavior, the focus management, the ARIA, the states — is functionally finished. Forever. Everything left is appearance, and appearance is just CSS, and CSS can be driven entirely by tokens. So long as the button's HTML structure and class bindings stay consistent, that one button can live in absolutely any project and look like absolutely anything, with nothing changing but token values. You never rewrite the button. You re-describe it.

The third seed was frustration, from living on both sides of the designer/developer handoff. Hand a design to a developer with perfect functional instincts and no feel for UI, and you watch fidelity bleed out in translation — spacing eyeballed, states forgotten, hierarchy flattened. But if both sides are using *the same components*, and the design handoff is *a set of token values* that compile into the styles, there is no translation step left to lose fidelity in. The designer's intent arrives as data, and data compiles deterministically.

And underneath all of it, a tension every designer-developer knows: a consistent, established design system is a joy to build with — no writing the same foundation classes ad nauseam at every project start, no misremembering slightly different utility names, no re-deriving component structure. But the established systems make you pay for that consistency with their *opinion*. Bending Material or Bootstrap to look like your design — rather than like a recolor of Bootstrap — costs more custom-class effort than the system saved you. The consistency is the part worth keeping. The baked-in visual identity is the part that has to go.

Zebkit is the attempt to keep the consistency and evict the opinion.

---

## The premise: design decisions are data

The foundational belief, from which everything else derives:

**Every visual decision is a token. Tokens are the design. Everything else is delivery.**

A design system traditionally encodes its decisions in CSS rules, component styles, and convention — places where decisions are hard to find, hard to change, and impossible to change *at once*. Zebkit instead treats the entire visual identity of a system as a structured dataset: named, typed, described token values that compile into CSS custom properties. The components don't own their appearance; they *reference* it. The utility classes don't contain values; they *bind* to them.

This inverts the usual relationship between a design system and its consumers. You don't customize zebkit by overriding it, fighting specificity, or forking components. You customize it by describing what you want, in tokens, and compiling. Re-theming is a data operation, not a development project.

The premise is falsifiable, and we want it to be: if you ever encounter a visual decision in zebkit that cannot be changed through tokens alone, that is a bug in the system, not a limitation to work around.

Three properties fall out of the premise:

1. **One mechanism, all timescales.** The same token chain serves the end user adjusting accessibility settings mid-session, the developer re-theming an app, and the designer handing off a new visual language. Nothing special-cased, nothing bolted on.
2. **Determinism.** Given the same tokens, you get the same design. There is no interpretive layer where intent can drift.
3. **Inspectability.** Because decisions are data, tooling can read them, validate them, document them, and reason about them. A token has a name, a type, a description, and an accessibility flag — a CSS value buried in a rule has none of those.

---

## The platonic component

Zebkit components aspire to be *finished*. Not "stable until the redesign" — finished, in the way a well-specified algorithm is finished.

A zebkit component is the platonic ideal of its pattern: the semantically perfect, maximally accessible button, modal, accordion. It uses light DOM and real HTML semantics. It implements the keyboard interactions, the focus management, the ARIA relationships, the state handling — all the behavior the pattern *means* — and exposes every visual property as a namespaced component token that defaults to semantic aliases.

The claim, stated plainly so it can be held to account:

**A zebkit component should be able to adapt to any visual design without a code change. If adapting it requires touching the component, the component's token surface is incomplete — fix the surface, not the instance.**

This is what "unchanging" means. The component's HTML structure and class bindings are a contract. Because the contract holds, everything downstream of it holds: your usage never breaks, your muscle memory never invalidates, the designer's tokens always have a stable target to land on, and an agent generating UI can rely on the structure being exactly what the docs say it is. Visual identity floats freely above a fixed semantic skeleton.

Components therefore carry **zero visual opinion**. They provide visual *state* hooks — `default`, `hover`, `active`, `focus-visible`, `disabled` — because states are semantics. But what those states look like is entirely the token layer's business. A zebkit button styled with no theme should feel like an unanswered question, not like zebkit's aesthetic.

---

## The token strata: a theory of change

Tokens are organized in three tiers, and the tiers are not bureaucracy — they are a theory of how design change propagates.

1. **Primitive tokens** (`--zbk-color-*`, `--zbk-spacing-*`, `--zbk-font-size-*`) are the raw vocabulary: the actual values, the only place in the system where a literal value may appear. Primitives answer "what exists."
2. **Alias tokens** (`--zbk-primary-*`, `--zbk-body-background`) are semantic mappings onto primitives. Aliases answer "what means what" — which color is *primary*, which spacing is *comfortable*. This is the tier where a design language lives.
3. **Component tokens** (`--zbk-button-*`) are per-component surfaces that default to aliases. They answer "what does this specific thing use," and they exist so that any single component can deviate deliberately without disturbing the system around it.

Each tier protects you from a different kind of change. Swap a primitive and every meaning built on it updates in lockstep. Remap an alias and the design language shifts without touching a single raw value. Override a component token and you've made a precise, local exception with a paper trail. The tiers are why a re-theme is a small diff instead of an audit.

The discipline that keeps the tiers meaningful: **references flow downward only.** Components reference aliases, aliases reference primitives, primitives reference nothing. A component token that reaches directly into a primitive has skipped the tier where its meaning should have been declared, and the design language is now lying about itself.

---

## Utilities: the boundary of the system

Components cover the patterns that deserve componentization. Utilities cover everything else — and "everything else" is where most design systems quietly fail their users.

Here is the failure mode zebkit's utilities exist to prevent. A developer needs a cursor change, an overflow rule, a one-off margin. The system doesn't offer one. So they write a custom class. That class hard-codes a value — or even if it carefully binds a CSS variable, it does so out of band, unvalidated, unnamed, undocumented. **The moment that class exists, that corner of the UI has left the system.** The accessibility dials don't reach it. Theme changes don't propagate to it. The next developer doesn't know it exists. The agent generating a redesign can't see it. Every utility the system fails to provide is an exit ramp out of every guarantee the system makes.

So zebkit's utilities are deliberately **exhaustive**, and the boundary of "exhaustive" is principled:

**Exhaustive over the platform. Opinionated in guidance. Prunable in config.**

- *Exhaustive over the platform*: where CSS defines a closed, spec-defined vocabulary — cursor keywords, overflow modes, position schemes — zebkit offers all of it. Completeness over a standard is coverage, not bloat. The developer building a spreadsheet genuinely needs `cursor-col-resize`, and if we don't have it, they exit the system to get it.
- *Opinionated in guidance*: zebkit absolutely has taste, and the taste is encoded — but as **guidance attached to the vocabulary, never as deletions from it.** The utility manifests carry usage guidance for every family: prefer `pointer` for interactive elements; don't reach for hyper-specific cursors; `overflow-hidden` can hide focus indicators, verify keyboard focus stays visible. Humans read it in docs. Agents are *bound* by it. But the user who has a legitimate scenario the guidance didn't anticipate is not fighting the system — the vocabulary is there.
- *Prunable in config*: shrinking the shipped CSS surface is the *consumer's* decision, made in build configuration (the way `enabledBreakpoints` already works), never the system's decision made by truncating the contract. A future direction is to make the opinion machine-readable as per-value tiers (recommended / situational / discouraged) so tooling can warn and docs can rank — taste as data, sitting beside the vocabulary it annotates, shrinking nothing.

This is the deeper pattern: zebkit separates **vocabulary from rhetoric**. The system's vocabulary — components, tokens, utilities — is complete, neutral, and stable. The author's rhetoric — how to use that vocabulary well — travels alongside as guidance. Most design systems bake their rhetoric into their vocabulary, which is exactly why bending them feels like fighting them. Zebkit's flexibility includes the freedom to disagree with its author.

And critically: **utilities are token-bound.** A spacing utility doesn't contain a length; it references the spacing token. Which means utilities aren't merely a convenience — they are how arbitrary, non-componentized corners of a UI stay inside the accessibility and theming guarantees. Use the utility, and the in-flight a11y dial reaches your one-off margin too, without you having to remember a single variable name.

The utility surface itself is governed by hand-authored manifests — single sources of truth that declare each family's grammar, token bindings, and guidance, generate the SCSS, and are continuously linted against it. The manifest is the philosophical structure made executable: `values` is the vocabulary, `guidance` is the rhetoric, and the lint is the promise that the documentation never lies about the system.

---

## Accessibility is a runtime property

Most systems treat accessibility as a build-time checklist: contrast verified, focus styles present, ship it. Zebkit treats accessibility as a **runtime, end-user-controlled property of the system** — because that is where it started, and because the checklist model quietly assumes every user is served by the same compiled answer.

Concretely: accessibility modifiers are part of the token chain itself. Spacing scales, font sizing, contrast, motion — these can shift *while the application is running*, under the end user's control, and everything built on tokens responds. Tokens carry an `a11y` flag identifying their participation in this. The transition system distinguishes motion from effects so reduced-motion preferences degrade gracefully rather than binarily.

Two consequences follow, and both are load-bearing:

1. **Accessibility responsiveness cannot be opt-in**, because an opt-in is a thing someone forgets. The reason every visual decision must flow through tokens — the reason custom classes are an exit ramp — is precisely that the a11y machinery can only guarantee what it can reach. Full token coverage *is* the accessibility architecture.
2. **Accessibility precedes aesthetics in every trade-off.** Keyboard interaction, screen reader semantics, focus visibility, and reduced motion support are mandatory in components and are part of what "platonic" means. A beautiful component that fails a keyboard user is not finished; it is wrong.

---

## The handoff: design intent as a compilable artifact

Restating the third origin seed as a principle, because it is one of the clearest statements of what zebkit is *for*:

**The designer-to-developer handoff should be a data transfer, not a translation.**

When designer and developer both build against the same fixed components, the handoff stops being annotated mockups that a developer interprets — with all the fidelity loss interpretation implies — and becomes a set of token values that compile. The developer with perfect functional instincts and no eye for spacing is no longer a risk to the design, because the design doesn't pass through their judgment; it passes through the compiler. The designer is no longer hoping their intent survives; their intent *is the artifact*.

This also reframes what a "redesign" is. Not a rebuild — a new token set against the same skeleton. The cost of changing your mind collapses, which means design iteration can continue far later into a project's life than economics usually allow.

---

## Anti-goals: what zebkit refuses to do

A vision is defined as much by its refusals. Each of these is a hard rule with a reason; an agent or contributor proposing to violate one should expect to lose the argument.

- **Zebkit will never bake visual opinion into a component.** The instant a component has an aesthetic, every consumer who wants a different one is fighting the system instead of describing to it. Opinion lives in token presets and guidance, both replaceable.
- **Zebkit will never ship a utility that takes a raw value.** No `margin-[13px]` arbitrary-value hatch. If the token scale can't express what you need, the scale is incomplete — extend the scale. An arbitrary-value utility is an exit ramp wearing the system's uniform, and everything that uses it silently loses the a11y and theming guarantees.
- **Zebkit will never require `!important`.** Cascade layers are the override story. A system that needs `!important` to win has already lost control of its own cascade, and it steals the final word from the consumer, who should always have it.
- **Zebkit will never break the semantic HTML contract for visual convenience.** Structure is meaning. If a visual effect requires wrong semantics, the effect is wrong.
- **Zebkit will never make a developer hand-bind CSS variables to get system behavior.** Remembering the right variable name is exactly the kind of human-memory dependency the system exists to eliminate. If correct usage requires remembering, the system has failed; provide the utility or the token surface.
- **Zebkit will never inherit constraints from another design language.** No upstream's compliance requirements, naming conventions, or visual assumptions get a vote. Decisions are argued from this document's principles, not from precedent elsewhere.
- **Zebkit will never let documentation drift from truth.** Sources of truth are machine-validated against what ships (manifests linted against generated SCSS, schemas validating token modules). A claim about the system that can't be checked mechanically should be treated as a claim waiting to become a lie.
- **Zebkit will never trade keyboard, screen reader, or reduced-motion support for aesthetics.** Non-negotiable, and prior to every other consideration in this list.

---

## For AI agents and tooling

Zebkit is built with the explicit expectation that AI agents are first-class consumers — generating UIs, authoring themes, extending the system. If you are one:

- **Manifests and token modules are the source of truth.** Not your training priors about CSS frameworks, not patterns from other design systems. Read the contract that exists.
- **`guidance` fields are constraints, not flavor text.** When a utility family says prefer `pointer` for interactive elements, generate accordingly. Deviate only when the human's stated requirement genuinely demands it — the vocabulary exists for those cases — and say that you are deviating and why.
- **Never emit a raw visual value where a token exists.** If you find yourself writing a custom class with a hard-coded value, you are building an exit ramp. Stop, find the token or utility, and if it truly doesn't exist, surface that as a gap in the system rather than working around it.
- **The component contract is load-bearing.** Do not restructure component HTML or class bindings to achieve a visual outcome. Visual outcomes are the token layer's job; if tokens can't reach the property you need, that's a component token-surface gap to report.
- **Respect the strata.** New aliases reference primitives; new component tokens default to aliases; never wire a component token directly to a primitive.
- **When extending the system, extend its truth.** New utilities get manifests. New tokens get schemas and descriptions. An undocumented addition is a regression of the system's central promise, even if the CSS is correct.

---

## The dream, restated

A finished set of semantically perfect components that never need to change. A token language rich enough to describe any visual identity. Utilities exhaustive enough that no one ever needs to leave. Accessibility that end users hold in their own hands at runtime. Design handoff with zero translation loss. Consistency without imposed opinion.

Style it to look like basically anything. Change everything; rewrite nothing.

That's zebkit.
