# Semantic Tokens

Semantic tokens provide human‑readable, project‑level meanings on top of Zebkit’s primitive token scales.  
They do **not** define new primitives. They are *aliases* — curated, named shortcuts that point to existing design decisions.

This allows teams to express intent (“use card spacing”, “use compact padding”, “use desktop layout spacing”) without worrying about whether that corresponds to spacing `105` or `240` underneath.

Zebkit’s compiler merges semantic tokens into the same logical module as their corresponding primitives.  
For example:

- `src/core/spacing/tokens.ts` → primitives for spacing  
- `src/core/semantic/spacing/tokens.ts` → semantic aliases for spacing  
- Both merge into the single token module: `zbk-spacing`

This makes semantic token usage identical to primitive usage — the consuming code doesn’t care which file defined which key.

---

## Why Semantics?

Semantics answer a different question than primitives:

- **Primitive token:** “What is the exact value or scale step?”  
  → (`--zbk-spacing-105` = 1.5rem)

- **Semantic token:** “What is this *for* in the UI?”  
  → (`--zbk-spacing-card` = the vertical rhythm standard for card layouts)

Semantics help Zebkit scale across:
- multiple applications,
- multiple themes,
- different teams,
- and rapid iteration.

---

## Folder Structure

```
src/
  core/
    spacing/
      tokens.ts                # primitive spacing values
    semantic/
      spacing/
        tokens.ts              # semantic spacing aliases
      borders/
        tokens.ts              # semantic border aliases (future)
    ...
```

This structure keeps semantics grouped logically but still clearly separate from primitives.

---

## How the Compiler Treats Semantic Tokens

The build pipeline:

1. Discovers both primitive and semantic `tokens.ts` files.
2. Reads their exported `key` (example: `"spacing"`).
3. Merges all modules with the same `key` into the same token map.  
   - If both define `"card"` or `"5"`, the later one overwrites the earlier one with a warning.
4. Emits CSS variables as usual:

```
--zbk-spacing-card
--zbk-spacing-desktop
--zbk-spacing-page
--zbk-spacing-105
--zbk-spacing-neg-10
```

No special syntax. No special loader. Semantics “just work”.

---

## Writing Semantic Tokens

Semantic tokens follow the same schema as primitives:

```ts
export const key = "spacing";

export default {
  card: {
    value: "{spacing.15}",
    type: "rootSize",
    description: "Standard spacing used to create consistent vertical rhythm in card‑based layouts."
  },
  sm: {
    value: "{spacing.1}",
    type: "rootSize",
    description: "Tighter spacing for dense UI regions where preserving space matters."
  },
  desktop: {
    value: "{spacing.80}",
    type: "rootSize",
    description: "Recommended spacing for desktop layout gutters and macro‑spacing patterns."
  }
};
```

A semantic token must:
- use a `value` referencing a primitive token via dot notation (`{spacing.1}`)
- use the correct `type` 
- have a clear semantic description (“what this is for”)

---

## When to Create a Semantic Token

Create a semantic token when:

- Designers or developers repeatedly reach for a named concept (“page gutter”, “card width)
- A value needs to stay consistent across layouts and components
- A large app needs a shared vocabulary for space, color, type, or border roles
- A project theme wants to override intentions without touching primitives

Avoid semantic tokens when:

- It’s a one‑off style
- It’s a very component‑specific tweak (that belongs inside that component’s token file)
- It duplicates a primitive token name or muddy intent

---

## Using Semantic Tokens in CSS or Components

Once compiled, semantics behave exactly like primitives:

```css
.card-stack {
  gap: var(--zbk-spacing-card);
}

.section {
  padding-block: var(--zbk-spacing-page-padding);
}

.drawer {
  padding: var(--zbk-spacing-sm);
}
```

In themed builds, the underlying primitive may change — but your semantic API stays stable.

---

## Future Semantic Modules

This folder is intended to grow.

Planned semantic modules include:

- `semantic/borders` → border roles (hairline, control, container, emphasis)
- `semantic/typography` → type roles (title, body, eyebrow, mini)
- `semantic/color` → functional color roles (success, danger, brand, accent)
- `semantic/layout` → grid + page structure roles

