# `<zbk-textarea>` — Phase 1 handoff prompt

Status: READY · Build order: 1 · Depends on: nothing
Read first: `plans/components/00-conventions.md`, `GRAMMAR.md`. Precedence: GRAMMAR.md > this file > conventions.

## 1. Pattern definition

The zebkit multi-line text field: a light-DOM element wrapping a real `<textarea>` inside its own `<label>`. It is `<zbk-input>` for multi-line text. It is **not** a rich-text editor, and it has no masking.

## 2. Mirror & references

Mirror `src/components/input/` file-for-file. Reuse input's structure for: label wrapper, `__label`/`__field` parts, native forwarding with `?? nothing`, `hasAccessibleName` override, the no-accessible-name warning, variant plumbing, styles.scss organization, test organization. Everything below describes only where textarea differs from input.

## 3. Authored markup

```html
<zbk-textarea name="notes" rows="4" placeholder="Anything else we should know?">
  Additional notes
</zbk-textarea>
```

## 4. Rendered skeleton

```html
<zbk-textarea name="notes" rows="4">
  <label class="zbk-textarea">
    <span class="zbk-textarea__label">Additional notes</span>
    <span class="zbk-textarea__field">
      <textarea class="zbk-textarea__textarea" name="notes" rows="4"></textarea>
    </span>
  </label>
</zbk-textarea>
```

Label span renders only when default children exist (same rule as input).

## 5. Attributes & properties

`variant` per GRAMMAR. Forwarded verbatim to the internal `<textarea>` (same JSDoc style as input):

| Attribute | Type | Default | Notes |
|---|---|---|---|
| `value` | string | `''` | Current value; synced from the native `input` event |
| `placeholder` | string | — | A placeholder is not a label |
| `disabled` / `readonly` / `required` | boolean | false | Native semantics |
| `name` / `form` / `autocomplete` | string | — | Native form participation |
| `minlength` / `maxlength` | number | — | Native constraint validation |
| `rows` | number | — | Native initial visible rows (browser default applies when unset) |
| `wrap` | string | — | Native `soft`/`hard` |

No `mask`, no `rawValue`, no `type`, no `inputmode`, no `min`/`max`/`step`/`pattern` (they are input-only or meaningless on textarea).

## 6. Content model

Default children: the visible label (accessible name via the wrapping label). **No `prefix`/`suffix` slots** — affixes don't compose with a multi-line scrolling box (see §15).

## 7. Behavior

- `@input` handler syncs `this.value` from the native textarea (input's non-mask path). No composition handling needed since there is no reformatting.
- Resizability is a token (`resize`, §9), not an attribute: consumers re-theme it like any visual property.

## 8. ARIA & announcements

Nothing beyond base-class mechanics (ARIA relocation to the `<textarea>`, focus forwarding). Native `input`/`change` events bubble; no custom events.

## 9. Token surface

Copy input's token list (`src/components/input/tokens/tokens.ts`) with these changes — same values, same descriptions adapted to "textarea", key `textarea`:

- **Drop**: `affix-ink`, `affix-ink-disabled`, `icon-size`, `gap` (no affixes); `group-gap`, `group-direction` (no group pattern yet — see §15).
- **Add**:

| Token | Default value | Type | Description |
|---|---|---|---|
| `resize` | `vertical` | `utility` | CSS resize behavior of the field (`vertical`, `horizontal`, `both`, `none`) |
| `min-block-size` | `44px` | `sizing` | Minimum field height; replaces input's `min-height` semantics for a multi-line box |
| `field-line-height` | `{line-height.2}` | `lineHeight` | Line height of the entered multi-line text |

- Keep `min-height` out (superseded by `min-block-size`); keep every state-suffixed canvas/ink/border token including `-readonly` and `-invalid`.
- In styles.scss, `resize` and scrolling apply to the `__textarea` element itself; the `__field` box carries border/canvas/padding exactly like input, and `:focus-within` drives the field's focus visuals the same way input's styles do.

## 10. Variants

`sm` and `lg`, mirroring `src/components/input/variants/` (same axis `size`, same overridden keys where they still exist, same 44px-floor comment).

## 11. Custom events

None.

## 12. Dev-mode warnings

Same single warning as input: no accessible name → "No accessible name. Provide label text as children, or aria-label / aria-labelledby — a placeholder is not a label."

## 13. Tests

Port input's suites that still apply (skeleton, label adoption, forwarding, value sync, variants, warning) and add: `rows`/`wrap` forwarding; `readonly` blocks editing but stays focusable; no affix markup renders even if an author passes `slot="prefix"` content (it should be ignored — assert it is not rendered into the field box).

## 14. Docs

Per conventions. Live examples: basic, `rows="6"`, readonly, disabled, `sm`/`lg`. Cross-link input ("for single-line text, use `<zbk-input>`") and from input's page back to textarea.

## 15. Out of scope (do not build)

- Autosize/grow-with-content (revisit on demand; would be an attribute, not default behavior)
- prefix/suffix affixes; character counter; `zbk-textarea-group` grouping pattern
- Masking of any kind

## 16. Acceptance checklist

Conventions "Definition of done", plus: rendered skeleton matches §4 exactly; token keys match §9 exactly (schema in sync); resize is themable via `--zbk-textarea-resize` with no code change.

## 17. Revision notes

(Empty at handoff. Fold anything written here into its home section above, then delete it.)
