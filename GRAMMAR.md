# The Zebkit Component Grammar

[VISION.md](VISION.md) says why zebkit exists; this document says what shape every component must take. It is binding in the same way: a component that deviates from the grammar is wrong, even if it works. New components are measured against this spec before they are measured against anything else.

The grammar exists so the system can be **guessed**. A developer — human or machine — who has learned one zebkit component has learned all of them. Every rule below serves that end: one spelling per intent, one pattern across components, no exceptions that have to be memorized. If a grammatical guess about a component turns out to be wrong, the component is violating the grammar, not the guesser.

## 1. One spelling per intent

For every intent the system supports there is exactly one documented way to express it.

- The custom element is the single documented entry point:

  ```html
  <zbk-button variant="ghost lg">Save</zbk-button>
  ```

- The rendered classes (`zbk-button`, `zbk-button--ghost`) are the compilation target: stable, inspectable, and part of the contract — but not a second documented API. Docs, examples, and generated agent context show the element form, always.
- No attribute aliases, prop synonyms, or alternate call patterns. If two spellings exist for one intent, one of them is a bug.

## 2. Naming

| Surface | Pattern | Example |
|---|---|---|
| Element | `zbk-{component}` | `<zbk-button>` |
| Base class | `zbk-{component}` | `.zbk-button` |
| Variant class | `zbk-{component}--{variant}` | `.zbk-button--ghost` |
| Component token | `--zbk-{component}-{property}[-{state}]` | `--zbk-button-canvas-hover` |
| Custom event | `zbk-{event}` | `zbk-dismiss` |
| Named slot | `slot="{name}"` from the shared slot vocabulary | `<span slot="icon" data-position="start">` |

`{component}` is the pattern's common name in kebab-case (`button`, `tooltip`, `menu-item`). Names describe the pattern, never the appearance.

## 3. Attributes

- Attributes are kebab-case. Boolean attributes are presence-based and reflected.
- **Every component accepts `variant`**: a space-separated list of registered variant names, validated against the variant registry at runtime in dev mode.

  ```html
  <zbk-button variant="outline lg">Export</zbk-button>
  ```

- **Native semantics pass through.** Attributes that have a native or global meaning (`disabled`, `type`, `name`, `value`, `autofocus`, `aria-*`) are forwarded verbatim to the internal native element. Never invent a zebkit attribute for something the platform already has a word for.
- **ARIA lands where AT looks.** Authors write `aria-*` and `role` on the zebkit element as if it were the native control; on upgrade the component relocates them to the internal native element and mirrors later changes. Labeling a component never requires knowing its internal structure.
- Component-specific attributes (e.g. a tooltip's `placement`) use the platform's vocabulary where one exists and are documented in the component's Custom Elements Manifest entry.

## 4. States

States are semantics; what they look like is the token layer's business. Two kinds:

**Interaction states** — fixed vocabulary, identical on every component:

| State | Token suffix | Bound to |
|---|---|---|
| default | *(none)* | base state |
| hover | `-hover` | `:hover` |
| active | `-active` | `:active` |
| focus | `-focus` | `:focus-visible` |
| disabled | `-disabled` | `:disabled` / `[disabled]` |

**Semantic states** — drawn from a shared vocabulary (`-selected`, `-checked`, `-indeterminate`, `-invalid`, `-readonly`, `-expanded`, ...) and present only when the pattern genuinely has that semantic. A component never invents a private state suffix; the shared vocabulary grows by amending this spec.

Every visual property that varies by state gets the suffixed token. A state whose appearance can't be changed through tokens alone is a token-surface gap — fix the surface.

## 5. Tokens

- **Full surface**: every visual property the component renders is a `--zbk-{component}-*` token. If adapting the component to a design requires touching the component, the surface is incomplete.
- **Strata discipline**: component tokens default to alias tokens, never directly to primitives. Raw values appear only in primitives.
- Every token carries a `type`, a `description`, and an `a11y` flag where applicable, validated by the component's Zod schema (`token-schema.ts` stays in sync with `tokens.ts`).

## 6. Variants

A variant is a **named, partial remapping of a component's token surface, compiled to a class**. It is the theme-override operation scoped to a selector.

```ts
const ghost: ButtonVariantConfig = {
  component: 'button',
  name: 'ghost',
  axis: 'style',
  overrides: {
    canvas: 'transparent',
    'canvas-hover': '{state.hover-wash}',
    ink: '{accent-primary.600}',
    'border-color': 'transparent',
  },
};
```

Rules:

- **Override values are alias references or structural literals** (`transparent`, `none`, `0`, `currentColor`). Never primitives, never raw visual values. A variant is an alternate alias mapping, so re-theming the aliases re-themes every variant automatically.
- **Anything not overridden falls through** to the base token. Variants stay small by construction.
- **No per-variant token namespace.** A variant class sets `--zbk-button-canvas` directly; there is no `--zbk-button-ghost-canvas`. Re-describing a variant is a data edit (variant config or consumer JSON overlay), not a second token layer.
- **`axis` is optional, advisory metadata** (`style`, `size`, ...). Same-axis variants are alternatives — they naturally override the same tokens, and dev mode warns only when two are *applied together*. Different axes promise composability (`ghost lg`), so the build warns when different-axis variants override the same token. Nothing is blocked — the vocabulary stays complete.
- **Escape hatches (`styles.inline`, `styles.stylesheetPaths`) are for consumers only.** They exist so a genuine one-off doesn't force an exit from the variant system entirely, but their declarations bypass the token and a11y guarantees, and the build says so. A lint fails the build if any zebkit-shipped variant uses them.
- Shipped variants are **structural recipes, not aesthetic choices** — patterns like `ghost`, `outline`, `subtle`, `sm`, `lg` defined entirely in terms of aliases. Taste ships as guidance, never as the only option.
- Every variant lands in the compiled variant registry (component → name → class + overridden tokens + axis) — the machine-readable source for runtime validation, docs, and agent context.
- **Consumers add or patch variants with JSON files in their base theme's token folder**, detected by filename: `zbk-{component}.variants.json` (all custom variants for a component), `zbk-{component}.variant.{name}.json` (one variant), or any `*-variants.json` (multi-component collection). Same rules as shipped variants; a shipped name patches, a new name compiles a new class. A new name additionally needs `ZebkitElement.registerVariants(json)` before elements upgrade so `variant="..."` accepts it — registration teaches the runtime the vocabulary, the CSS comes from the build.

## 7. Light DOM and the content model

- **Components render into light DOM.** No shadow roots. Tokens, utility classes, cascade layers, and the runtime a11y machinery must reach everything.
- **The element owns its internal skeleton.** The author writes the element and its content; the component renders the structure (the native element at its core, wrappers, ARIA wiring). Authors never hand-write internal DOM.
- **Content is adopted, not replaced.** On upgrade, the element moves its authored children into the skeleton it renders. Named positions use the `slot` attribute with a shared vocabulary that means the same thing on every component and grows only by amending this spec. Default (unnamed) children are the component's primary content. The vocabulary:
  - `icon` — a supplementary pictogram rendered alongside the primary content (aria-hidden). Components that support start/end icon placement use `data-position="start|end"`; when omitted, placement is inferred from the original authored child order.
  - `prefix` / `suffix` — supplementary content (any markup: svg, icon-font glyph, HTML character, image) rendered inside a field's box at its inline start/end, sized by the component's `icon-size` token and colored by `affix-ink`. Affixes are aria-hidden, so they are presentational: information an affix carries must also live in the field's accessible name or description.
  - `checked` / `unchecked` / `indeterminate` — state-indicator content on selection controls (any markup: svg, icon-font glyph, HTML character, image). Layered over the control, shown for exactly the matching state, sized by the component's `indicator-size` token, colored by `indicator-color`, animated with the component's transition tokens. The control is aria-hidden, so indicator content is presentational; the state is conveyed by the native input.
- **Slot names are string literals at the call site.** Component sources reference slot names as string literals in `slotted()` / `hasSlotted()` and the icon helpers (`renderIcon` / `hasIcon` / `iconsAt`) — never indirected through a variable — so the manifest↔code delivery check (lint C5) can read the consumed vocabulary statically.
- **Pre-upgrade markup must be sane.** Authored content is real DOM and should read correctly before the element upgrades (SSR and progressive enhancement are the same requirement).
- **Generated ids, never hardcoded.** Internal ARIA relationships (`aria-describedby`, `aria-controls`, ...) use generated unique ids. Author-supplied ids and IDREF lists are preserved — appended to, never clobbered, and restored on disconnect.

## 8. Behavior and accessibility

- **A native element sits at the core** whenever the platform provides one (`<button>`, `popover`, `<dialog>`). The component's job is to complete the pattern — keyboard interactions, focus management, ARIA relationships — not to reinvent the platform.
- **Never proxy native events.** A click on the internal `<button>` bubbles out of light DOM on its own; re-dispatching it as a custom event is a second spelling. Custom events exist only for semantics the platform cannot express, are named `zbk-{event}`, bubble, and are cancelable when they announce a preventable action.
- **Focus forwards.** The internal native element is the tab stop. The host never takes `tabindex`; calling `focus()`/`blur()` on the element forwards to the internal focusable.
- **Announcements go through the shared live region.** Components never create private live regions; the system announcer utility is the one spelling for screen-reader announcements.
- **Accessible names are enforced.** Dev mode warns, in the §9 format, when an interactive component computes an empty accessible name (e.g. an icon-only button with no label).
- Keyboard support, screen reader semantics, focus visibility, and reduced-motion handling are part of what the component *is*. They precede every other consideration and are not configurable off.

## 9. Feedback names the fix

Dev-mode diagnostics are written for a reader in a fix loop — human or machine. Every message states the component, what is wrong, and the valid vocabulary:

```
[zbk-button] Unknown variant "ghots". Registered variants: ghost, outline, subtle, sm, lg.
[zbk-button] Variants "ghost" and "outline" share axis "style" and both set --zbk-button-canvas; the later class wins.
```

Build-time validation (token schemas, variant reference checks, manifest lints) follows the same rule: no message without the fix in it.

## 10. Shipped artifacts

Every component ships, and CI keeps current:

| Artifact | Contains |
|---|---|
| Custom Elements Manifest entry | attributes, slots, events, with descriptions |
| Token module + Zod schema | every token: name, type, description, a11y flag |
| Variant registry entry | variants, overridden tokens, axis, descriptions |
| Generated agent context | the distilled contract, compiled from the three above |

The agent context is a build output, never hand-written — the docs site, the TypeScript types, and the agent's context window are three renderings of one dataset. A component whose documentation cannot be generated from its source of truth is not done.
