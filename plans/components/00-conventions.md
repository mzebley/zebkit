# 00 — Shared implementation conventions

Read this before any component plan. It is the shared half of every handoff: everything here applies to every component, and plan files never repeat it. Precedence when sources disagree: **GRAMMAR.md > the component plan file > this file**. Report conflicts; do not guess.

## Reference implementations

Copy patterns from these files instead of inventing:

| Concern | Reference |
|---|---|
| Field pattern (label wrapper, affixes, native forwarding) | `src/components/input/index.ts` |
| Child adoption with filtering (some children go one place, rest another) | `src/components/select/index.ts` |
| Overlay: floating-ui positioning, popover API promotion, show/hide, document listeners | `src/components/tooltip/index.ts` |
| Selection control + indicator slots | `src/components/checkbox/index.ts` |
| Simple interactive control | `src/components/button/index.ts` |
| Base class mechanics (variants, ARIA relocation, adoption, focus forwarding, `warn`) | `src/components/base/zebkit-element.ts` |
| Screen-reader announcements | `src/components/base/announce.ts` — always `import { announce }`; never create a live region |

## Files every component ships

For a component named `{name}` (kebab-case):

```
src/components/{name}/
  index.ts                 # element class + defineZbk{Name}() (idempotent)
  index.test.ts            # jsdom jest tests
  styles.scss              # auto-discovered by the token build (glob **/styles.scss)
  README.md
  tokens/tokens.ts         # auto-discovered (glob **/tokens/tokens.ts)
  tokens/token-schema.ts
  variants/                # only if the plan specifies variants
    index.ts  types.ts  {variant}.ts
```

Plus these edits outside the directory:

1. `src/components/index.ts` — import, re-export, and call `defineZbk{Name}()` inside `defineZebkitComponents()` (keep existing ordering style).
2. `doc-site/src/routes/components/{name}/+page.mdx` — copy the structure of `doc-site/src/routes/components/input/+page.mdx` (frontmatter, script block building token rows, Live examples, Usage with rendered-skeleton block, attribute/token tables, AgentContext footer).
3. `doc-site/src/lib/data/navigation.ts` — add `{ label: '{Name}', link: '/components/{name}' }` to the Components group, alphabetically.
4. If the plan has a **GRAMMAR.md amendment** section, apply it exactly as written.

## index.ts shape

Follow `src/components/input/index.ts` structurally:

- File-header comment: what the pattern is, an authored-markup example, where styling lives. Match the prose density of input's header. No emojis anywhere.
- Class `Zbk{Name} extends ZebkitElement` with `static componentName = '{name}'` and, when variants exist, `static variantConfigs = {name}Variants`.
- Class-level JSDoc with one `@slot` line per slot (this feeds the Custom Elements Manifest); JSDoc on every public property (feeds the manifest's attribute descriptions).
- `static properties` via Lit `PropertyDeclarations`; attributes kebab-case; booleans presence-based.
- `protected get nativeElement()` returning the internal element that carries semantics (ARIA relocates there; focus forwards there). Query with `:scope` selectors.
- Render the exact skeleton from the plan's §4 using `this.componentClasses` on the skeleton root and `${this.baseClass}__part` classes for internal parts. Place authored content with `this.slotted()` / `this.slotted('slot-name')`; guard optional parts with `this.hasSlotted(...)`.
- Native attributes forward verbatim with `?? nothing` for optionals (see input's render).
- Dev diagnostics through `this.warn(...)`; every message names the fix (GRAMMAR.md §9).
- Export `const defineZbk{Name} = (): void => { if (!customElements.get('zbk-{name}')) customElements.define('zbk-{name}', Zbk{Name}); }`.

Hard rules (from GRAMMAR.md, restated because violations are common): light DOM only; never re-dispatch a native event as a custom one; host never takes `tabindex`; internal ARIA relationships use `this.uidFor(...)`; interaction states are `:hover/:active/:focus-visible/:disabled` styled purely by tokens.

## tokens/tokens.ts shape

Mirror `src/components/input/tokens/tokens.ts`:

```ts
export const key = "{name}";           // becomes the --zbk-{name}-* namespace
export const layer: LayerName = "base";
export type {Name}TokenKey = 'canvas' | 'canvas-hover' | /* ... */;
const tokens = { /* ... */ } as const satisfies Record<{Name}TokenKey, TokenObject>;
export default tokens;
```

- Every value is an alias reference (`{app.canvas}`, `{spacing.sm}`, ...) or a structural literal (`transparent`, `none`, `0`, `1em`, `currentColor`, `inherit`, `contents`). Never a primitive reference, never a raw visual value.
- Every entry uses the DTCG shape: `$value`, `$type`, `$description`. Motion durations opt into the reduced-motion modifier with `$extensions: { "dev.zebkit": { a11y: true } }`.
- State suffixes exactly as GRAMMAR.md §4: `-hover`, `-active`, `-focus`, `-disabled`, plus only the semantic states the plan's §9 lists.
- Self-references are allowed and encouraged for "same as X" defaults: `{ $value: "{{name}.canvas-focus}" }`.
- No per-component `token-schema.ts`: component modules validate against the generic `tokenModuleSchema`. Type the default export `as const satisfies Record<{Name}TokenKey, TokenObject>` so a dropped or mistyped key fails compilation.

### Alias vocabulary (do not invent names outside this list)

- Color namespaces: `app`, `action`, `accent-primary`, `accent-secondary`, `brand`, `info`, `positive`, `caution`, `critical`, `disabled`. Each color namespace exposes `canvas`, `ink`, `border` and modifier forms `-emphasis`, `-muted`, `-subtle`, `-inverse` (e.g. `{critical.border-emphasis}`, `{info.canvas-subtle}`). `disabled` exposes `canvas`, `ink`, `border`. The accent namespaces additionally expose numeric shades already in use by shipped components (`{accent-primary.400}`, `{accent-primary.500}`, `{accent-primary.600}`).
- Focus: `{focus.color}`, `{focus.width}`, `{focus.offset}`.
- Border: `{border.style}`, `{border.width-sm|md|lg|xl}`, `{border.radius-xs|sm|md|lg|xl}`.
- Spacing: `{spacing.2xs|xs|sm|md|lg|xl|2xl|3xl}`.
- Type: `{font-family.interface}`, `{font-size.xs|sm|md|lg}`, `{font-weight.normal|medium|bold}`, `{line-height.2}`, `{tracking.normal}`.
- Motion: `{transition.calm-fx-duration-default}`, `{transition.calm-fx-function-default}` (and `playful-` variants).
- Elevation: `{elevation.xs|sm|md|lg|xl|2xl|none}`. Z-index: `{z-index.dropdown|sticky|fixed|popover|modal-backdrop|modal|tooltip}`.
- Opacity: `{opacity.0..100 in 5s}` (e.g. `{opacity.70}`).

If a plan's token table names an alias not listed here, verify it exists in `src/tokens/` before using it; if it doesn't, stop and report the gap instead of substituting.

## variants/ shape

Only when the plan's §10 lists variants. Mirror `src/components/input/variants/`: `types.ts` (config type keyed to the token type), one file per variant, `index.ts` exporting the array. Rules from GRAMMAR.md §6: overrides are alias references or structural literals only; `axis` metadata (`size`, `style`, `status`); never reduce a size below the 44px tap-target floor; every variant gets a `description`.

## styles.scss shape

Mirror `src/components/input/styles.scss`:

- `@use 'tokens/styles/variables/prefix' as prefix;` then everything inside `@layer components`.
- Every visual property reads `var(--#{prefix.$cssVar}-{name}-...)`. Zero raw visual values — structural layout properties (`display: inline-flex`, `box-sizing`) are the only literals allowed.
- Selectors target the rendered classes so the CSS also works on hand-written static markup matching the skeleton.
- Focus style: `outline` from the three focus tokens on `:focus-visible` (copy input's block).
- State selectors: `:hover`, `:active`, `:focus-visible`, `:disabled`/`[disabled]`, plus attribute selectors for semantic states (`[open]`, `[aria-current]`, ...) exactly as the plan's §9 maps them.
- Any keyframe animation gets a `@media (prefers-reduced-motion: reduce)` block that replaces motion with a non-motion cue (e.g. opacity pulse) — the plan says which.

## index.test.ts shape

Mirror `src/components/input/index.test.ts`: `@jest-environment jsdom` pragma, a `mount(markup)` helper appending to `document.body` and awaiting `updateComplete`, `console.warn` spied in `beforeEach`/restored in `afterEach`, `document.body.innerHTML = ''` between tests. Cover at minimum: rendered skeleton classes, child adoption into the right positions, attribute forwarding, each behavior in the plan's §7, each ARIA wiring in §8, each dev warning in §12, variant class application. The plan's §13 enumerates the component-specific cases.

## README.md shape

Mirror `src/components/input/README.md`: what it is (2–3 sentences), pointer to GRAMMAR.md, Usage with authored markup and the rendered light-DOM skeleton, registration snippet, attribute table, slots, events, a11y notes, token table pointer. Moderately concise; examples over prose.

## Verify (run all, in order, from repo root)

```bash
npm test
npm run type-check
npm run build:defaults      # regenerates token/variant JSON snapshots
npm run build:cem           # regenerates custom-elements.json
npm run build:context       # regenerates doc-site/static/zebkit/context/*
npm run check               # full gate: tests, types, utilities, cem/context/docs drift
```

Commit regenerated artifacts (`custom-elements.json`, `doc-site/static/zebkit/context/*`, generated token JSON) together with the source. `npm run check` failing on "drift" means a generator wasn't re-run — its output names the command.

## Definition of done (every component)

- [ ] All files from "Files every component ships", including the three external edits
- [ ] Skeleton, attributes, behavior, ARIA, tokens, variants, events, warnings match the plan sections exactly
- [ ] `token-schema.ts` keys identical to `tokens.ts` keys
- [ ] No raw visual values outside structural literals; no primitives referenced from component tokens
- [ ] Keyboard path exercised in tests; accessible-name warning tested where the plan requires one
- [ ] All six Verify commands pass; regenerated artifacts committed
- [ ] GRAMMAR.md amendment applied verbatim (when the plan has one)
