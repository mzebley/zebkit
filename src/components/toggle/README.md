# `<zbk-toggle>`

A light-DOM custom element wrapping a real `<input type="checkbox" role="switch">` inside its own `<label>` — the APG switch pattern on a fully native input. Deliberately a separate component from [`<zbk-checkbox>`](../checkbox/README.md): a switch is a track with a traveling thumb, announces as on/off, and represents an immediate state change rather than a form selection, so it carries its own token surface (track and thumb each get per-state tokens) instead of contorting the checkbox's.

Contract details (naming, states, ARIA relocation, content model) live in [GRAMMAR.md](../../../foundations/GRAMMAR.md).

## Usage

```html
<zbk-toggle name="notifications" checked>Email me about updates</zbk-toggle>
```

Renders (light DOM, inspectable):

```html
<zbk-toggle name="notifications" checked>
  <label class="zbk-toggle">
    <input type="checkbox" role="switch" class="zbk-toggle__input" name="notifications" />
    <span class="zbk-toggle__track" aria-hidden="true"></span>
    <span class="zbk-toggle__label">Email me about updates</span>
  </label>
</zbk-toggle>
```

The thumb is the track's `::before` — fully token-driven, no extra markup.

Register once at bootstrap:

```ts
import { defineZbkToggle } from "zebkit/components/toggle";
defineZbkToggle(); // no-ops if already registered
```

## Attributes

| Attribute | Type | Default | Notes |
|---|---|---|---|
| `variant` | string | — | Space-separated registered variant names, e.g. `"sm"`. Unknown names warn with the registered vocabulary. |
| `checked` | boolean | `false` | Whether the toggle is on. Syncs from user interaction. |
| `disabled` | boolean | `false` | Native disabled: out of tab order, blocks interaction. |
| `required` | boolean | `false` | Forwarded for native constraint validation. |
| `name`, `value` | string | `value` defaults to `on` | Forwarded for native form participation. |
| `aria-*`, `role` | — | — | Write them on `<zbk-toggle>` as if it were the input; they relocate to the inner `<input>` automatically. |

## Events

None custom. The native `change`/`input` bubble out of the light DOM on their own — listen for `change` on `<zbk-toggle>` like any element.

## Shipped variants

| Variant | Axis | Remaps |
|---|---|---|
| `sm` | size | Smaller track and label type. |
| `lg` | size | Larger track and label type. |

The thumb (`thumb-size`) and pill radius (`border-radius`) default to `{toggle.track-height}`, so size variants only remap the track and everything else follows. The tap target stays generous at any size — the invisible native input covers the whole label.

## Grouping

Wrap related toggles in `.zbk-toggle-group` (flex, driven by the `group-gap` and `group-direction` tokens; default column).

## Accessible naming

Label text (default children) is the accessible name via the wrapping `<label>`. Text-free toggles must provide `aria-label` (or `aria-labelledby`) — a nameless toggle warns in dev with the fix.

## Styling

Track and thumb are separate token surfaces: per-state track canvas/border/shadow, thumb canvas/border/shadow, and `thumb-transform` per state so lift/press physics (thumb raising on hover, pressing down on `:active`) are pure token edits. Thumb travel animates structurally from the geometry tokens (`track-width`, `thumb-size`, `thumb-inset` — negative inset rides the thumb over the border). Motion uses the playful-fx transition tokens with reduced-motion handling. See `tokens/tokens.ts` for the full annotated surface. The `.zbk-toggle` classes also work standalone on a native `label > input + span + span` structure — the element form is the documented entry point.
