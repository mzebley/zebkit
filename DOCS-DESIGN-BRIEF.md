# Zebkit Docs — Design Brief

> Companion to [DOCS-BUILD-PLAN.md](DOCS-BUILD-PLAN.md). This brief defines *what the site should look, feel, and behave like*. The build plan defines *how to construct it*. Read [VISION.md](VISION.md) first — every decision below traces back to it.

---

## 1. North star

Most design-system docs are a **catalog**: here are the swatches, the components, the API. That is the wrong genre for zebkit, because zebkit's entire claim is a *verb* — **"change everything; rewrite nothing."** A catalog can't demonstrate a verb.

So the organizing principle:

**The docs site is the single best piece of evidence that the thesis is true.** It should make a skeptical engineer stop and go *"wait — the whole hero just became a different design system and nothing reflowed."*

A corollary resolves the "what should it even look like" question: zebkit carries **zero visual opinion by design**, so the docs shouldn't impose a loud aesthetic either — that would be off-brand and slightly hypocritical. The right identity is not a *style*, it's a **posture**: an *instrument / control surface for design*. Think devtools, a synthesizer, a mixing board, a CAD viewport. The docs celebrate the **mechanism**, and the mechanism's beauty is precision, legibility, and visible values.

## 2. The big idea: the site is itself a zebkit theme

The docs site's entire appearance is achieved with **a zebkit token set + utility classes only** — no bespoke design language layered on top. The site *is* a consumer of zebkit, themed exactly the way a customer would theme it.

This is the most credible proof possible: the reference site for "no one ever needs to leave the system" is one that **never left the system.** Two consequences are binding:

- If building a page requires a hard-coded value or a custom class that isn't token-bound, that is a **gap in the utility/token surface** — log it (feeds [project-utility-coverage-tracker]), don't paper over it. The docs build is a continuous exhaustiveness test.
- The "Reskin" hero (§6) is therefore not a trick. It is literally the same operation that produced the site — swapping one token set for another.

## 3. Two registers: Instrument + Editorial

The site speaks in two visual registers, chosen per page type. They share one type system and one neutral palette, so the switch feels like one publication with two kinds of spread, not two sites.

| | **Instrument** (reference) | **Editorial** (narrative) |
|---|---|---|
| Used for | Tokens, Components, Utilities, color families | Home, Foundations narrative, the "why" pages, manifesto-adjacent prose |
| Density | High, data-dense, tabular | Airy, generous, one strong column |
| Hero element | A live preview / inspector rail | Display typography, marginalia |
| Feel | Devtools / control surface | A well-set magazine spread |
| Type emphasis | Mono carries the values | Display serif carries the voice |

The default is *minimalist either way*. Editorial means **strong typographic presence**, not decoration: confident display headings, real hierarchy, big readable measure, marginal notes — the restraint of good print, not the busyness of a content farm.

## 4. Type system

Four **roles**, not four equal faces. The docs site wires these as its **zebkit typography tokens** (themeable like everything else). The faces named below are the working choice (direction B from the type exploration) — swappable without touching anything but token values.

- **Display & editorial headings — Instrument Serif.** High-contrast, magazine-elegant. Used *large only* (hero, section heads), where its contrast reads as character rather than fragility.
- **Reading body & sub-heads — Newsreader.** A literary serif built for screen reading; carries long-form narrative and reference prose. (Google Fonts.)
- **Tokens, values, code, instrument labels — Space Mono.** Mono is the typographic signal that *"this is data you can change."* Space Mono adds control-panel character to values and the wordmark.
- **Accessibility high-legibility swap — Atkinson Hyperlegible Next.** Purpose-built by the Braille Institute for low-vision legibility; the a11y dials switch reading text to this on demand. It is the legibility *floor*, not the default voice.

Rules: two weights per face max. Sentence case everywhere. Reserve Instrument Serif for large sizes; let Newsreader handle anything at sub-head scale or below. Optical sizing wherever the variable face supports it. Set a baseline rhythm on editorial pages and hold it.

## 5. Color, material, motion

- **Neutral base, warm.** Paper-warm off-white canvas and near-black warm ink (not cold grey) — print warmth reads "magazine," and keeps the chrome from feeling like a generic SaaS dashboard. Use zebkit's `app`/`canvas`/`ink` semantic tokens.
- **Hairlines and margin do the work.** 0.5px rules, generous whitespace, an honest grid. No drop shadows, no gradients, no glow in the chrome.
- **Color is reserved.** It enters only through (a) the Reskin hero previews, (b) color/token documentation swatches, and (c) a single restrained accent for interactive affordances (links, focus rings, active nav). The neutral chrome exists so themed content *pops*.
- **Motion is restrained and dogfooded.** Transitions use zebkit's transition tokens and degrade through the reduced-motion path — proving the motion-vs-effects distinction. Reskin transitions are quick and crossfade-like; never bouncy.

## 6. Signature moments

These are the interactions worth building first — each dramatizes one manifesto principle.

### 6.1 The Reskin (hero) — *the headline*
A **rich, full-bleed** composition of real product UI — app nav, a couple of cards, a form, a small data table, buttons, badges, a type specimen, a chart placeholder — built **only from zebkit components + utilities.** Above it, named theme presets: *Swiss · Brutalist · Terminal · Editorial* (and room for more — the *Swiss* slot is the clean/neutral baseline; rename freely). Click one and the **entire composition re-skins** — color, radius, spacing density, type — with **zero layout shift and zero markup change.**

- Make it complex on purpose. Don't keep it above the fold; let it be a tall, impressive showpiece that rewards scrolling.
- A **token-diff panel** shows the handful of token values that changed — making "the design is data" literal.
- Caption: *"Same HTML. Same classes. Only the tokens changed."*
- **Scope:** hero only for now (the rest of the site stays in its reference theme). Architect it so "reskin the whole site" is a later flip of the same switch.

### 6.2 Runtime a11y dials — *accessibility you operate*
Persistent controls in the top chrome: **font scale, contrast, density/spacing, reduced-motion.** Dragging them visibly re-flows *the docs themselves* in real time, because they drive real zebkit a11y tokens. This is the only design-system site where accessibility is a thing you *operate*, not a badge — it proves "accessibility is a runtime property" by making the reader the runtime.

### 6.3 Token x-ray / inspector rail — *decisions are data*
On reference pages, the right rail is not a table of contents — it's a **live inspector.** Hovering/clicking an element traces its token chain *component → alias → primitive*. Makes the strata visible and teaches them by manipulation.

### 6.4 Unstyled ↔ themed toggle — *the unanswered question*
Show a component raw (no tokens — "an unanswered question") then watch tokens answer it. Embodies "neutral skeleton, floating identity."

### 6.5 Copy for agent — *the handoff is data*
Every component/utility page has a one-click bundle (HTML contract + token surface + guidance) formatted for an LLM, plus a machine-readable `llms.txt` layer. **Skeleton now, full content later** (see build plan Phase 7 and §8).

## 7. Information architecture

```
Home            Manifesto pitch + the Reskin hero
Foundations     The "why": the strata theory, a11y-as-runtime, layers (editorial register)
Tokens          Browsable, searchable data catalog (instrument)
Components       Per-component: contract + token surface + live themeable instance
Utilities        Manifest-driven: vocabulary (values) + guidance tiers (instrument)
Theming          The playground + export-as-token-JSON
For Agents       Machine-readable contract surface (skeleton now)
```

New vs. today: add **Theming** and **For Agents**; turn **Tokens** into a real browsable catalog (not scattered tables); render **Utilities** straight from the manifests so the page *cannot* lie about the system (lean into "generated from the linted source of truth" as a visible feature).

## 8. What gets built (component inventory)

- **Shell:** `TopBar` (wordmark · Cmd-K · a11y dials · theme/dark toggle), `LeftNav`, `EditorialLayout`, `ReferenceLayout` (with inspector rail).
- **Content instruments:** `TokenTable`, `TokenCatalog`, `ColorFamily`, `UtilityTable` (manifest-driven; renders `values` as vocabulary and `guidance` as recommended/situational/discouraged tiers), `TokenLookup` (promoted to global Cmd-K).
- **Signatures:** `HeroReskin`, `A11yDials`, `Inspector` (x-ray), `UnstyledToggle`, `CopyForAgent`.
- **Component docs pattern:** `ComponentLayout` = live instance + HTML-contract block + token-surface table + guidance + copy-for-agent + unstyled toggle. Button is the exemplar.

## 9. Non-negotiables (carry the manifesto into the build)

1. **Token-bound only.** No hard-coded visual values anywhere — not even in the small editorial stylesheet. Bind zebkit CSS vars or use utilities. A missing utility is a logged gap, not a license.
2. **Manifests/token modules are the source of truth.** Utility and token pages are generated from them; never hand-transcribe values.
3. **Accessibility precedes aesthetics.** Keyboard, screen reader, focus visibility, reduced motion are mandatory on every instrument and the a11y dials must actually work.
4. **The site is a zebkit theme.** If achieving the look needs anything outside tokens+utilities, that's a finding about zebkit, surfaced — not a workaround.
