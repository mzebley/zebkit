

# Colors

This folder defines the **semantic color system** for zebkit.

The goal here is:

- to avoid hard‑coding primitives (raw hex, HSL, etc.) throughout components
- to give designers and developers **predictable knobs** to work with
- to make theming (light/dark/alt brands) a matter of remapping tokens, not rewriting components

This README describes how the color system is structured and how the token schemas are intended to be used.

---

## Mental model

Colors in zebkit are organized along three main axes:

1. **Family** – _what palette the color belongs to_  
   - `brand`
   - `accent-primary`
   - `accent-secondary`
   - `app`
   - `action`
   - `caution`
   - `critical`
   - `info`
   - `positive`

2. **Role** – _what the color is used for_  
   - `canvas` – backgrounds / surfaces  
   - `ink` – foregrounds / text / icons  
   - `border` – outlines, dividers, strokes  

3. **Variant & intensity** – _how the color is applied in context_  
   - **Intensity**: `soft`, `muted`, (base), `strong`  
   - **Variant**: base and `inverse`  
     - `inverse` colors are used on inverted/dark surfaces

Put together, a single token name can be read like a sentence:

> `brand-ink-inverse-muted`  
> → brand family • ink role • inverse variant • muted intensity

---

## Naming pattern

All color tokens follow a consistent string pattern:

```txt
[family]-[role](-[variant])?(-[intensity])?
```

Where:

- **family**
  - `brand`
  - `accent-primary`
  - `accent-secondary`

- **role**
  - `canvas`
  - `ink`
  - `border`

- **variant** (optional)
  - `_none_` → default mode
  - `inverse` → for use on inverse/dark contexts

- **intensity** (optional)
  - `_none_` → base intensity
  - `soft`   → gentler, more washed out
  - `muted`  → low‑emphasis, low contrast
  - `strong` → more saturated/contrasty

Examples:

- `brand-canvas` → base brand background
- `brand-canvas-soft` → lightly tinted brand surface
- `brand-canvas-inverse-strong` → strong brand background in an inverse context
- `brand-ink-muted` → lower‑emphasis brand text/icon color
- `brand-border-inverse-soft` → soft brand border on an inverse/dark surface

---

## Color families

A **color family** is a coherent set of tokens sharing a palette and following the same schema.

Currently defined families:

- `brand` – primary identity/CTA palette
- `accent-primary` – supporting accent used for important, but secondary emphasis
- `accent-secondary` – tertiary accent used for more decorative or contextual emphasis

Each family exposes the same semantic surface area, so consumers can swap between families without changing component logic.

### Family roles

Every family implements the same three **roles**:

- `canvas` – background/surface colors
- `ink` – foreground colors (text and icons)
- `border` – strokes, outlines, dividers

Each role has:

- a base token
- three **intensity** variants: `soft`, `muted`, `strong`
- four **inverse** variants: `inverse`, `inverse-soft`, `inverse-muted`, `inverse-strong`

---

## Brand family: slots

The brand family tokens are defined using the shared `slots` list:

```ts
const slots = [
  "canvas",
  "canvas-soft",
  "canvas-muted",
  "canvas-strong",
  "canvas-inverse",
  "canvas-inverse-soft",
  "canvas-inverse-muted",
  "canvas-inverse-strong",
  "ink",
  "ink-soft",
  "ink-muted",
  "ink-strong",
  "ink-inverse",
  "ink-inverse-soft",
  "ink-inverse-muted",
  "ink-inverse-strong",
  "border",
  "border-soft",
  "border-muted",
  "border-strong",
  "border-inverse",
  "border-inverse-soft",
  "border-inverse-muted",
  "border-inverse-strong",
] as const;
```

For the **brand** family, these slots become fully‑prefixed token keys:

```txt
brand-canvas
brand-canvas-soft
brand-canvas-muted
brand-canvas-strong
brand-canvas-inverse
brand-canvas-inverse-soft
brand-canvas-inverse-muted
brand-canvas-inverse-strong

brand-ink
brand-ink-soft
brand-ink-muted
brand-ink-strong
brand-ink-inverse
brand-ink-inverse-soft
brand-ink-inverse-muted
brand-ink-inverse-strong

brand-border
brand-border-soft
brand-border-muted
brand-border-strong
brand-border-inverse
brand-border-inverse-soft
brand-border-inverse-muted
brand-border-inverse-strong
```

Each of these keys maps to a `tokenObject`.

---

## How components should use brand color tokens

Components should **not** hard‑code primitives or scale steps. Instead, they lean on semantic tokens from the appropriate family, e.g.:

- button backgrounds → `brand-canvas`, `brand-canvas-strong`, `brand-canvas-soft`
- button text → `brand-ink`
- button borders → `brand-border-muted` or `brand-border-strong`
- inverse buttons / dark sections → `brand-ink-inverse-*`, `brand-canvas-inverse-*`

Because the families all share the same structure, swapping palettes (e.g. using `accent-primary-*` instead of `brand-*`) should be possible without changing component logic—only token wiring.

---

## Adding new families

To add a new color family that follows the same structure:

1. Create a new folder under `src/core/colors` (e.g. `status-success` or `app`).
2. Add a `tokens.ts` file with keys prefixed by the family name and matching the `slots` list.
3. Add a `token-schema.ts` file that calls `buildColorFamilySchema("family-prefix")`.
4. Wire that family into the compiler so its tokens get emitted as CSS variables.

As long as the family uses the same slots, you get:

- consistent semantics
- consistent validation
- consistent theming behavior

---

## Future directions

Planned extensions on top of this foundation:

- **App‑level families** (`app-*`):
  - map global surfaces/ink/borders to the appropriate family tokens
  - e.g. `app-canvas` → `brand-canvas-soft`, `app-ink` → `neutral-ink-strong`
- **Status families** (`status-success-*`, `status-warning-*`, etc.):
  - follow the same `canvas` / `ink` / `border` + `inverse` + intensity pattern

The key idea is that we keep **one mental model**:

> family → role → variant → intensity

and reuse it everywhere, so the system remains predictable as it grows.