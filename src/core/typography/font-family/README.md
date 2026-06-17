# Typography: Font Family Tokens

Every font token uses `type: "fontFamily"`, discriminated by a `source`. The full guide lives
on the doc site (Typography → Fonts); this is the in-repo summary.

## Two tiers

- **Source families** name a concrete font + how it loads: `primary`, `alt`, `monospace`, and
  the built-in `system-sans` / `system-serif` / `system-mono` stacks.
- **Role aliases** reference a source family: `interface`, `heading`, `body`, `code`.

## The `source` field

- `system` (default) — plain CSS variable, no network. Uses the platform font.
- `google` — emits a Google Fonts request (per the configured strategy).
- `local` — emits `@font-face` rules from the token's `faces`.

## Fallbacks

Set `fallback: "sans" | "serif" | "mono"` to append a full industry-standard stack after the
family (see `src/definitions/font-fallbacks.ts` — the single source of truth, also used by the
`system-*` tokens). Author the bare family name; the build pads it. Aliases (`{...}` references)
never get a fallback appended.

## Examples

```ts
// Google — variable font (weight RANGE) with italics
primary: {
  value: '"Inter"',
  type: "fontFamily",
  source: "google",
  fallback: "sans",
  weights: "200..800",
  styles: ["normal", "italic"],
  description: "Primary UI font",
}

// Google — static font (discrete weight LIST)
mono: {
  value: '"Fira Code"',
  type: "fontFamily",
  source: "google",
  fallback: "mono",
  weights: [400, 500, 700],
  description: "Code font",
}

// Self-hosted
brand: {
  value: '"Brand Sans"',
  type: "fontFamily",
  source: "local",
  fallback: "sans",
  display: "swap",
  faces: [{ src: "BrandSans-var.woff2", weight: "100 900", style: "normal" }],
  description: "Brand font",
}

// System stack — zero network
sans: { value: "{font-family.system-sans}", type: "fontFamily", description: "..." }
```

- **`weights`**: array = static list; range string (`"200..800"`) = variable font.
- **`faces[]`** (local only): `{ src, weight?, style?, display?, format?, unicodeRange? }`. Bare
  `src` resolves against `assetFilePath` (default `/assets/`); `/`, `http(s)://`, `//`, `.` are
  verbatim. `format()` is inferred from the extension.

## Loading strategy (Google Fonts)

Set in your zebkit config: `tokens.fonts.strategy`.

- `import` (default) — render-blocking `@import` at the top of the CSS. No HTML changes, but the
  slowest option.
- `link` / `preload` — no `@import`; writes a sidecar `zbk-<theme>.fonts.html` with
  `preconnect` + stylesheet (and preload) tags to paste into `<head>`. **Prefer for production.**
- `manual` — emits nothing remote.

Local `@font-face` rules are emitted regardless of strategy.

Keep `token-schema.ts` and `tokens.ts` in sync.
