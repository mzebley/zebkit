# `<zbk-slider>` — Phase 2 plan (deferred)

Status: DEFERRED — high-level plan, not yet a handoff prompt. Promote using the Phase 1 section skeleton once §7 is satisfied.

## 1. Pattern definition

A bounded numeric input on a track, built on native `<input type="range">` inside input's label spelling. The platform gives keyboard, AT semantics, and form participation for free; the work is entirely in the token surface, because styling a native range is vendor-pseudo-element hostile.

## 2. Why deferred

- Zero behavioral urgency (native range works today, unstyled).
- The token surface question is the whole component: track/fill/thumb across `::-webkit-slider-runnable-track`, `::-webkit-slider-thumb`, `::-moz-range-track`, `::-moz-range-progress`, `::-moz-range-thumb` — and WebKit has no native "filled portion" pseudo-element, so the fill needs a CSS gradient driven by a `--zbk-slider-progress` variable the component updates on input. That JS-writes-a-CSS-var pattern needs a principled ruling against "never hand-bind CSS variables" (it's the component binding, not the developer — but write the argument down).

## 3. Anticipated anatomy (sketch)

`<zbk-slider>` → `label.zbk-slider` → label span + `input[type=range].zbk-slider__input`. Value display (current value text) probably a `value-text` render option or consumer-owned. `min`/`max`/`step`/`value`/`name`/`disabled` forwarded verbatim; `list`/datalist tick marks pass through.

## 4. Key decisions to resolve

1. The WebKit fill approach (gradient + component-maintained progress var) — accept, or ship without fill styling on WebKit.
2. Visible current-value output: built-in `<output>` wired via `for`, or docs-pattern only (leaning: built-in, it's the accessible pairing authors always skip).
3. Tick marks/datalist styling in scope?
4. Range pairs (two thumbs, min+max) — separate future component (leaning: yes, out of scope here; native has no dual-thumb).
5. Vertical orientation (`writing-mode` based) in scope?

## 5. Prior art to reuse

Input's label/field spelling, forwarding table, and warning; progress's vendor-pseudo-element styles.scss discipline (separate rules per vendor, exact selectors written into the plan).

## 6. Risks

Cross-engine pseudo-element drift; thumb focus indication vs the outline-token pattern (thumb focus ring is drawn per-engine); 44px target floor vs slim visual thumb.

## 7. Promotion checklist

- [ ] §4 decisions recorded (especially 1 and 2)
- [ ] A spike branch confirming the WebKit fill technique under the token build
- [ ] Full prompt written with the complete per-engine selector table (progress's §9 as the template)

## 8. Revision notes

(Working notes welcome here while the component is deferred.)
