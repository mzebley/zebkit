

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

3. **Variant & prominence** – _how the color is applied in context_  
   - **Prominence**: `subtle`, `muted`, (base), `emphasis` — a single axis describing how much the color stands out against its canvas (`subtle` recedes, `emphasis` advances)  
   - **Variant**: base and `inverse`  
     - `inverse` colors are used on inverted/dark surfaces

Put together, a single token name can be read like a sentence:

> `brand-ink-inverse-muted`  
> → brand family • ink role • inverse variant • muted intensity

---

## Naming pattern

All color tokens follow a consistent string pattern:

```txt
[family]-[role](-[variant])?(-[prominence])?
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

- **prominence** (optional)
  - `_none_`   → base
  - `subtle`   → least prominent; recedes toward the surface
  - `muted`    → low‑emphasis, low contrast
  - `emphasis` → most prominent; advances with the most contrast

Examples:

- `brand-canvas` → base brand background
- `brand-canvas-subtle` → least-prominent, lightly tinted brand surface
- `brand-canvas-inverse-emphasis` → high-prominence brand background in an inverse context
- `brand-ink-muted` → lower‑emphasis brand text/icon color
- `brand-border-inverse-subtle` → least-prominent brand border on an inverse/dark surface

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
- three **prominence** variants: `subtle`, `muted`, `emphasis`
- four **inverse** variants: `inverse`, `inverse-subtle`, `inverse-muted`, `inverse-emphasis`

> **Prominence is one axis, not a pairing.** Matching suffixes (`ink-emphasis` / `canvas-emphasis`) mark the same prominence level on each role's own scale — they are **not** meant to be combined. A high-prominence ink belongs on a base/subtle canvas; high-prominence (e.g. dark) canvases pair with `ink-inverse-*`. Never place `ink-emphasis` on `canvas-emphasis`.

---

## Brand family: slots

The brand family tokens are defined using the shared `slots` list:

```ts
const slots = [
  "canvas",
  "canvas-subtle",
  "canvas-muted",
  "canvas-emphasis",
  "canvas-inverse",
  "canvas-inverse-subtle",
  "canvas-inverse-muted",
  "canvas-inverse-emphasis",
  "ink",
  "ink-subtle",
  "ink-muted",
  "ink-emphasis",
  "ink-inverse",
  "ink-inverse-subtle",
  "ink-inverse-muted",
  "ink-inverse-emphasis",
  "border",
  "border-subtle",
  "border-muted",
  "border-emphasis",
  "border-inverse",
  "border-inverse-subtle",
  "border-inverse-muted",
  "border-inverse-emphasis",
] as const;
```

For the **brand** family, these slots become fully‑prefixed token keys:

```txt
brand-canvas
brand-canvas-subtle
brand-canvas-muted
brand-canvas-emphasis
brand-canvas-inverse
brand-canvas-inverse-subtle
brand-canvas-inverse-muted
brand-canvas-inverse-emphasis

brand-ink
brand-ink-subtle
brand-ink-muted
brand-ink-emphasis
brand-ink-inverse
brand-ink-inverse-subtle
brand-ink-inverse-muted
brand-ink-inverse-emphasis

brand-border
brand-border-subtle
brand-border-muted
brand-border-emphasis
brand-border-inverse
brand-border-inverse-subtle
brand-border-inverse-muted
brand-border-inverse-emphasis
```

Each of these keys maps to a `tokenObject`.

---

## How components should use brand color tokens

Components should **not** hard‑code primitives or scale steps. Instead, they lean on semantic tokens from the appropriate family, e.g.:

- button backgrounds → `brand-canvas`, `brand-canvas-emphasis`, `brand-canvas-subtle`
- button text → `brand-ink`
- button borders → `brand-border-muted` or `brand-border-emphasis`
- inverse buttons / dark sections → `brand-ink-inverse-*`, `brand-canvas-inverse-*`

Because the families all share the same structure, swapping palettes (e.g. using `accent-primary-*` instead of `brand-*`) should be possible without changing component logic—only token wiring.

---

## Adding new families

To add a new color family that follows the same structure:

1. Create a new folder under `src/tokens/colors` (e.g. `status-success` or `app`).
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
  - e.g. `app-canvas` → `brand-canvas-subtle`, `app-ink` → `neutral-ink-emphasis`
- **Status families** (`status-success-*`, `status-warning-*`, etc.):
  - follow the same `canvas` / `ink` / `border` + `inverse` + prominence pattern

The key idea is that we keep **one mental model**:

> family → role → variant → prominence

and reuse it everywhere, so the system remains predictable as it grows.