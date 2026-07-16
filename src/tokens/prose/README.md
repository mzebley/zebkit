# Prose utilities

Zebkit prose treatments are token-driven classes for semantic document content.
Apply `.prose` to a content container, then use the element or treatment class
that matches the content's meaning.

## Lede

Use `.lede` for the short introductory paragraph that summarizes or frames a
page, article, or section. The class is intentionally semantic: all visual
choices are exposed as `--zbk-lede-*` tokens so themes can adjust the treatment
without changing markup.

```html
<article class="prose">
  <h1>Design tokens that travel with your markup</h1>
  <p class="lede">
    Zebkit keeps introductory copy readable, themeable, and aligned with the
    same token pipeline that powers the rest of the prose system.
  </p>
  <p>Continue with standard prose after the lede.</p>
</article>
```

Compiled CSS targets `.prose > .lede` and `.lede.prose`, with flow spacing
handled by `.prose>*+.lede` and `.prose>.lede+*, .lede.prose+*`.
