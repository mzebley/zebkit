# Zebkit Agent Operating Guide

This document primes any agent (human or automated) that contributes to Zebkit.
It explains the vision, non-negotiable principles, working agreements, and
repeatable patterns that keep the library consistent.

## Vision Snapshot
- Deliver a token-driven, accessibility-first component library that ships
  semantic HTML as the foundation and lets design happen entirely through
tokens.
- Treat tokens as the source of truth for every styleable characteristic so
  the same component codebase can morph into any brand while preserving
  usability.
- Expose the entire customization surface area through CSS custom properties so end users can "dial in" experiences in real-time for accessibility and
  personal preference.

## Core Principles
- **Accessibility before aesthetics**: components ship keyboard, screen reader, and reduced-motion friendly behaviors out of the box. Visual styling never overrides semantic structure or ARIA integrity.
- **Tokens over hard-coded values**: every visual decision is represented by a
  token (semantic > alias > primitive). Direct values belong only in
  primitives.
- **Composable, declarative HTML**: components start from clean HTML APIs and
  progressive enhancement; JavaScript augments when needed.
- **Deterministic overrides**: any consumer must be able to re-theme through
  tokens without editing component internals.
- **Measurable quality**: ship with linting, testing, and story/visual specs
  that confirm accessibility contracts and token coverage.

## Token System
- Tokens resolve in three strata:
  1. **Primitive tokens**: foundational design values exposed as CSS custom properties such as `--zbk-color-*`, `--zbk-spacing-*`, and `--zbk-font-size-*`. These live in the core foundation files (e.g. `_colors.scss`, `_spacing.scss`).
  2. **Alias tokens**: semantic mappings (`--zbk-primary-*`, `--zbk-body-background`, `--zbk-focus-color`) that point exclusively to primitives and describe intent.
  3. **Component tokens**: namespaced tokens consumed by components (e.g. `--zbk-button-*`) that default to aliases but can be overridden per instance or per state.
- Tokens should offer state, mode, or size variants when the experience demands it. Avoid duplicating raw values—reference the lower layer via `var(--token)`.
- Document new tokens in the component's token registry file under `src/core/*`.
- When introducing new token groups, update any rendered CSS bundle and ensure defaults land in `zebkit-vars.css`.
- Color primitives are organized in `src/core/colors/` by palette intent. Define new colors there before creating or updating semantic aliases in `src/core/semantic/color/`.

## Component Authoring Standards
- Structure files as `[component]/index.ts`, `[component]/tokens.ts`, and
  `[component]/token-keys.ts` to keep behaviors separated from design
  contracts.
- Token keys files must export string literal unions so TypeScript consumers
  get autocomplete and compile-time safety.
- Components should accept tokens through props/attributes that map directly to CSS custom properties when rendered.
- Include keyboard interactions, focus management, and ARIA hooks in the base
  HTML. Guard against double announcements or tabindex traps.
- Provide visual state tokens for `default`, `hover`, `active`, `focus-visible`, `disabled`, and `danger` when relevant.

## Pattern Consistency
- **Naming**: every CSS variable starts with `--zbk-`; primitives use a domain prefix (`--zbk-color-*`, `--zbk-spacing-*`), aliases describe purpose (`--zbk-primary-500`, `--zbk-body-background`), and component tokens stay namespaced (`--zbk-button-*`).
- **State suffixes**: append `-default`, `-hover`, `-active`, `-focus`, `-disabled` (and others like `-danger`) when a token must track interaction state.
- **Size ramps**: reuse the established typographic and component scales (`xs`, `sm`, `md`, `lg`, `xl`) via existing tokens instead of hard coding.
- **Spacing**: pull from `--zbk-spacing-*` primitives; avoid inline pixel math unless minting a new primitive.
- **Animations**: separate duration, easing, and transform tokens so motion can be tuned or replaced for reduced-motion contexts.

## Working Agreements for Agents
1. Read this guide, then inspect the relevant component folder before changing
   anything. Understand the HTML contract and token map first.
2. Prefer token additions over ad-hoc CSS edits. If a token feels missing,
   create it at the correct layer with documentation.
3. Always run the appropriate tests (`npm test`, component-specific stories)
   when altering behavior or tokens. Accessibility changes should include
   corresponding tests or manual verification notes.
4. Leave succinct comments only when logic is non-obvious. Assume readers are
   familiar with modern TypeScript and ARIA patterns.
5. Validate source maps and generated bundles if you touch build scripts or the
   CSS export pipeline.
6. Update this AGENT.md when new global expectations or workflows are agreed.

## Accessibility Checklist (Quick Scan)
- Keyboard reachability: Tab, Shift+Tab, Space/Enter interactions work.
- Focus visibility: `focus-visible` tokens provide minimum AA compliant contrast.
- Screen reader labelling: `aria-*` attributes, `role`, and semantic tags are
  correct and not duplicated.
- Reduced motion: respect `prefers-reduced-motion` using motion tokens.
- Color contrast: ensure token defaults maintain WCAG AA for text and UI states.

## Change Review Expectations
- Document token changes in commits/PR descriptions referencing affected
  components.
- Provide before/after reasoning, not just screenshots.
- Verify no component consumes raw color/spacing values after your change.
- If a change impacts public CSS variable names, note the breaking surface area
  explicitly.

## Implemented Foundation Modules
- **Elevation** - Complete box shadow system with semantic sizes (xs, sm, md, lg, xl, 2xl) and inner variants
- **Opacity** - Full opacity scale (0–100) in 5% increments
- **Z-Index** - Numeric stacking order with semantic tokens (dropdown, sticky, fixed, modal, tooltip)
- **Transition** - Playful and calm motion/effects easing curves with accessibility-aware durations
- **Semantic color, border, spacing** - Functional aliases for all major visual properties

## Future Enhancements (Vision Backlog)
- Live theming playground to adjust tokens at runtime for demos and audits.
- Automated accessibility regression tests that validate focus order, aria semantics, and color contrast.
- Component composition guides to demonstrate complex, themeable component patterns.

Keep Zebkit opinionated about semantics and flexible about aesthetics. When in doubt, prioritize inclusive defaults and token completeness over visual flair.
