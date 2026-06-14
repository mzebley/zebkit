---
title: Sample — Reference register
description: Proves a markdown page with layout reference renders in ReferenceLayout.
layout: reference
section: Tokens
status: draft
---

# Reference register

This page exists to prove the **content engine**: a `.md` file with `layout: reference`
in its frontmatter is wrapped by `ReferenceLayout` automatically — dense type, with the
inspector rail on the right.

## Token spans

Inline code carries the instrument signal: `--zbk-app-canvas`, `--zbk-spacing-3`, and
`--zbk-accent-primary-600` all read as data you can change.

## A token table

| Token | Value | Tier |
| --- | --- | --- |
| `--zbk-app-canvas` | warm off-white | alias |
| `--zbk-app-ink` | warm near-black | alias |
| `--zbk-accent-primary-600` | ember rust | alias |
| `--zbk-spacing-3` | `1rem` (a11y-scaled) | primitive |

## A code block

```css
.button {
  background: var(--zbk-accent-primary-600);
  padding: var(--zbk-spacing-2) var(--zbk-spacing-3);
}
```

Same HTML, same classes — only the tokens decide how it looks.
