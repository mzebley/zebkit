# Typography: Font Family Tokens

The Zebkit font-family token module supports two flavors of tokens:

1) **Google Font tokens** (`type: "googleFont"`):  
   - Shape: `{ value, description, variable: boolean, weights?: string, type: "googleFont" }`  
   - `value` is the font family name (e.g., `"Open Sans", sans-serif`).  
   - `variable: true` signals a variable font; `weights` are parsed into a range (e.g., `wght@300..700`).  
   - `variable: false` treats `weights` as a list (e.g., `wght@300;400;700`).  
   - During the token → CSS conversion, Zebkit emits a Google Fonts `@import` at the very top of the compiled CSS for each unique family, and still emits a CSS variable for the token value.

2) **Regular font-family tokens** (`type: "fontFamily"`):  
   - Use this when you rely on system fonts or self-hosted fonts already available in your project.  
   - The `value` is applied directly as the CSS `font-family` value, and no external import is generated.

## Examples

```ts
// Google font token
{
  value: `"Inter", sans-serif`,
  description: "Primary UI font",
  variable: true,
  weights: "300,700",
  type: "googleFont",
}

// Regular font-family token
{
  value: `"Helvetica Neue", Arial, sans-serif`,
  description: "System font stack",
  type: "fontFamily",
}
```

## How imports are generated
- Google font tokens are collected during token conversion and produce a single `@import url('https://fonts.googleapis.com/css2?...')` per unique family/weights block at the **top** of the bundled CSS.
- Regular `fontFamily` tokens do not trigger imports; you are responsible for ensuring the font files are available (system or self-hosted).

## Usage guidance
- Prefer `googleFont` when you want Zebkit to manage fetching from Google Fonts automatically.
- Prefer `fontFamily` when:
  - You want to use system stacks,
  - You already bundle/self-host fonts,
  - You need full control over loading strategy (e.g., `@font-face` elsewhere).

Both token types end up as CSS custom properties (e.g., `--zbk-font-family-primary`) that you can reference in your components or themes. Keep `token-schema.ts` and `tokens.ts` in sync to ensure validation passes.
