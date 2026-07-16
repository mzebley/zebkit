# `<zbk-alert>` — Phase 1 handoff prompt

Status: READY · Build order: 5 · Depends on: nothing (tag's dismiss pattern is precedent if 04 lands first)
Read first: `plans/components/00-conventions.md`, `GRAMMAR.md`. Precedence: GRAMMAR.md > this file > conventions.

## 1. Pattern definition

An inline status message: a visually distinct block that reports a condition (info, success, warning, error) in place. It is **not** a toast (transient, stacked, self-positioning — Phase 2) and it is **not itself a live region**: per GRAMMAR.md §8 announcements go through the shared announcer, which this component calls when asked (§7). An alert present in initial markup is just read in document order.

## 2. Mirror & references

Shell composition mirrors badge/tag (icon + content + optional dismiss). Dismiss behavior and `zbk-dismiss` event are identical to `04-zbk-tag.md` §7/§11 — same spelling, same non-cancelable contract, same consumer-owns-removal rule. Announcements: `src/components/base/announce.ts`.

## 3. Authored markup

```html
<zbk-alert variant="critical" announce urgency="assertive" dismissible>
  <svg slot="icon" viewBox="0 0 24 24">…</svg>
  <strong>Payment failed.</strong> Your card was declined — no charge was made.
</zbk-alert>
```

## 4. Rendered skeleton

```html
<zbk-alert variant="critical">
  <div class="zbk-alert">
    <span class="zbk-alert__icon" aria-hidden="true"><svg>…</svg></span>
    <div class="zbk-alert__content"><strong>Payment failed.</strong> …</div>
    <button type="button" class="zbk-alert__dismiss" aria-label="Dismiss">
      <span class="zbk-alert__dismiss-glyph" aria-hidden="true">×</span>
    </button>
  </div>
</zbk-alert>
```

Icon and dismiss render conditionally (slotted icon; `dismissible` attribute).

## 5. Attributes & properties

| Attribute | Type | Default | Notes |
|---|---|---|---|
| `variant` | string | — | Status variants carry the visual severity (§10) |
| `announce` | boolean | false | When present, the alert's text content is sent through the shared announcer on first render and whenever the content changes |
| `urgency` | string | `polite` | `polite` or `assertive`; forwarded to `announce()`. Only meaningful with `announce` |
| `dismissible` | boolean | false | Renders the dismiss button |
| `dismiss-label` | string | `Dismiss` | Accessible name for the dismiss button |

## 6. Content model

Default children: the message (any markup — links and `<strong>` are expected). `icon` slot per shared vocabulary (aria-hidden). `dismiss-glyph` slot exactly as specified in `04-zbk-tag.md` §6.

## 7. Behavior

- With `announce`: on first render, and on subsequent content mutation (watch adopted content via `updated`), call `announce(textContent.trim(), { urgency })`. Never create a live region or `role="alert"`/`role="status"` — the announcer is the one spelling.
- Dismiss: identical contract to tag — dispatch `zbk-dismiss`, never self-remove.
- Severity must not live only in color: docs guidance (§14) requires the message text to carry the severity ("Payment failed", not just red styling). Dev warning enforces the icon side of this (§12).

## 8. ARIA & announcements

No role on any rendered element. Author-written `aria-*` relocates to the inner `div.zbk-alert` (base mechanics). Announcements only via §7.

## 9. Token surface

Key `alert`, layer `base`.

| Token | Default | Type |
|---|---|---|
| `display` | `block` | `display` |
| `canvas` | `{app.canvas-subtle}` | `color` |
| `ink` | `{app.ink}` | `color` |
| `border-color` | `{app.border}` | `color` |
| `border-width` | `{border.width-sm}` | `borderWidth` |
| `border-style` | `{border.style}` | `borderStyle` |
| `border-radius` | `{border.radius-md}` | `borderRadius` |
| `accent-color` | `{app.border-emphasis}` | `color` (drives the inline-start accent bar) |
| `accent-width` | `0` | `borderWidth` (0 = no bar by default; themes/variants can enable) |
| `padding-inline` / `padding-block` | `{spacing.md}` / `{spacing.sm}` | `spacing` |
| `gap` | `{spacing.sm}` | `spacing` |
| `icon-size` | `1.25em` | `sizing` |
| `icon-ink` | `currentColor` | `color` |
| `font-family` / `font-size` / `font-weight` / `line-height` / `letter-spacing` | interface / md / normal / `{line-height.2}` / normal aliases (mirror input) | — |
| `max-width` | `100%` | `sizing` |
| dismiss-* block | copy `04-zbk-tag.md` §9 dismiss tokens verbatim (sizes, inks, hover states, focus trio) | — |
| transition block | calm defaults, `transition-property: background-color, border-color`, duration `a11y: true` | `transition` |

## 10. Variants

Axis `status` (same four names as badge — the shared status vocabulary):

| Name | canvas | ink | border-color | accent-color |
|---|---|---|---|---|
| `info` | `{info.canvas-subtle}` | `{info.ink}` | `{info.border}` | `{info.border-emphasis}` |
| `positive` | `{positive.canvas-subtle}` | `{positive.ink}` | `{positive.border}` | `{positive.border-emphasis}` |
| `caution` | `{caution.canvas-subtle}` | `{caution.ink}` | `{caution.border}` | `{caution.border-emphasis}` |
| `critical` | `{critical.canvas-subtle}` | `{critical.ink}` | `{critical.border}` | `{critical.border-emphasis}` |

## 11. Custom events

`zbk-dismiss`, identical contract to `04-zbk-tag.md` §11 (`detail: { text }` = the alert's text content).

## 12. Dev-mode warnings

- Empty alert: "Empty alert. Provide message children."
- Status variant with an icon slot but no text severity cue is not detectable — instead warn when `urgency="assertive"` is set without `announce`: "urgency has no effect without the announce attribute. Add announce, or remove urgency."

## 13. Tests

Skeleton, conditional icon/dismiss; `announce` triggers the shared announcer on first render (spy on the live region or import-mock `announce`) with the right urgency; content change re-announces; no announcement without the attribute; dismiss event contract (bubbles, non-cancelable, no self-removal); status variants; both warnings.

## 14. Docs

Per conventions. Live examples: all four statuses, dismissible with working removal + focus handling, dynamically inserted alert using `announce`. Guidance: severity in text not just color; alert vs (future) toast boundary; when to prefer `announce()` directly.

## 15. Out of scope (do not build)

- Auto-dismiss timers, stacking, portal positioning (toast, Phase 2)
- Built-in default icons per status (authors slot icons; a default icon set is a separate decision)
- Collapsing/expanding long alerts

## 16. Acceptance checklist

Conventions "Definition of done", plus: zero `role`/`aria-live` attributes in rendered output; announcer called exactly once per content change; dismiss contract byte-compatible with tag's (same event name, same shape).

## 17. Revision notes

(Empty at handoff. Fold anything written here into its home section above, then delete it.)
