import type { AllowedTokenTypes } from "@definitions/tokens";

/**
 * Central DTCG alignment definitions.
 *
 * Spec target: DTCG Design Tokens Format Module 2025.10 (the first stable release).
 * These are the locked decisions from plans/dtcg-alignment/plan.md (D3, D4, D5) as
 * data. Later migration phases import from here instead of re-deciding; changing a
 * mapping means changing the plan's decision table first.
 */

/**
 * The DTCG 2025.10 `$type` vocabulary: seven primitive types plus six composite
 * types. Anything not in this list that zebkit emits carries a proprietary type
 * from {@link ZEBKIT_PROPRIETARY_TYPES}.
 */
export const DTCG_TYPES = [
  // Primitive types
  "color",
  "dimension",
  "duration",
  "fontFamily",
  "fontWeight",
  "cubicBezier",
  "number",
  // Composite types
  "strokeStyle",
  "border",
  "transition",
  "shadow",
  "gradient",
  "typography",
] as const;

export type DtcgType = (typeof DTCG_TYPES)[number];

/**
 * Zebkit's proprietary `$type` registry (decision D4): CSS-surface tokens the DTCG
 * vocabulary cannot express. Kept minimal and documented; a strict-mode export
 * (decision D9) can drop these for tools that hard-fail on unknown `$type`.
 *
 * `cssDimension` covers CSS sizing values DTCG's `dimension` cannot represent:
 * `%`, `ch`, `em`, `calc()` expressions, the sizing keywords `auto`/`none`, and
 * unitless `0` (DTCG dimensions are `{value, unit}` with unit limited to
 * `px`/`rem`).
 */
export const ZEBKIT_PROPRIETARY_TYPES = [
  "display",
  "cursor",
  "textTransform",
  "textDecoration",
  "textAlignment",
  "fontStyle",
  "transform",
  "transitionProperty",
  // The CSS `<easing-function>` keyword surface (`ease-out`, `linear`, …) DTCG's
  // `cubicBezier` type (explicit `[x1,y1,x2,y2]` curves) cannot express.
  "transitionTimingFunction",
  "content",
  "flex",
  "utility",
  "asset",
  "boolean",
  "cssDimension",
] as const;

export type ZebkitProprietaryType = (typeof ZEBKIT_PROPRIETARY_TYPES)[number];

/** Every `$type` zebkit emits post-alignment: the spec set plus the proprietary registry. */
export type ZebkitDtcgType = DtcgType | ZebkitProprietaryType;

/** True when `type` is part of the DTCG 2025.10 spec vocabulary (vs. zebkit-proprietary). */
export function isDtcgSpecType(type: string): type is DtcgType {
  return (DTCG_TYPES as readonly string[]).includes(type);
}

/**
 * The single vendor namespace for everything zebkit-specific inside `$extensions`
 * (decision D3). Swap here — once — if the project ever settles on a different domain.
 */
export const ZEBKIT_EXTENSION_KEY = "dev.zebkit" as const;

/**
 * Sub-keys used under `$extensions["dev.zebkit"]`:
 * - `a11y`: runtime accessibility-modifier opt-in (`true` or a custom modifier var)
 * - `scale`: fluid-scale settings (viewport anchors, base/ratio, `max-scale`) and
 *   generated-scale step data (`index`, optional pinned value)
 * - `font`: font-loading metadata (`source`, `fallback`, `weights`, `styles`, `faces`, `display`)
 * - `layer`: cascade-layer assignment, only where it must ride inside JSON artifacts
 *   (e.g. defaults snapshots)
 */
export const ZEBKIT_EXTENSION_SUBKEYS = ["a11y", "scale", "font", "layer"] as const;

export type ZebkitExtensionSubkey = (typeof ZEBKIT_EXTENSION_SUBKEYS)[number];

/**
 * How one legacy zebkit token type migrates to the DTCG shape (decision D5).
 *
 * - `spec`: every value of this legacy type becomes this single `$type`.
 * - `valueDependent`: the target `$type` depends on the individual value (px/rem
 *   lengths → `dimension`; `%`/`ch`/`em`/`calc()` → `cssDimension`).
 * - `split`: one legacy type fans out into several `$type`s (transition →
 *   duration / cubicBezier / transitionProperty).
 * - `extension`: not a token post-alignment; the data moves under
 *   `$extensions["dev.zebkit"]` on the owning group (build-time settings).
 */
export type LegacyTypeMigration =
  | { kind: "spec"; type: ZebkitDtcgType }
  | { kind: "valueDependent"; types: readonly ZebkitDtcgType[] }
  | { kind: "split"; types: readonly ZebkitDtcgType[] }
  | { kind: "extension"; subkey: ZebkitExtensionSubkey };

/**
 * The spec-type mapping table (decision D5): every legacy `AllowedTokenTypes`
 * member and where its tokens land post-alignment. Phase 2 consumes this family
 * by family; Phase 4's provenance-marked `allowed-token-types.json` derives from
 * the end state.
 *
 * The dimension family collapsed in Phase 2a step 4: `spacing`, `sizing`,
 * `rootSize`, `borderWidth`, `borderRadius`, `fontSize`, `rootFontSize`, and
 * `letterSpacing` no longer exist — px/rem values are `dimension`, everything
 * else a length slot accepts is `cssDimension`.
 */
export const LEGACY_TYPE_MIGRATION: Record<AllowedTokenTypes, LegacyTypeMigration> = {
  // Colors (`borderColor` collapsed into `color` in Phase 2b — it had no entries)
  color: { kind: "spec", type: "color" },
  // The dimension family is final (Phase 2a step 4)
  dimension: { kind: "spec", type: "dimension" },
  cssDimension: { kind: "spec", type: "cssDimension" },
  // Shadows are final (Phase 2c): structured shadow-layer arrays, `none` = `[]`
  shadow: { kind: "spec", type: "shadow" },
  // The transition conflation is final (Phase 2d): durations → spec `duration`,
  // easing curves → spec `cubicBezier`, the property list and keyword-easing
  // surfaces → proprietary `transitionProperty` / `transitionTimingFunction`.
  duration: { kind: "spec", type: "duration" },
  cubicBezier: { kind: "spec", type: "cubicBezier" },
  transitionProperty: { kind: "spec", type: "transitionProperty" },
  transitionTimingFunction: { kind: "spec", type: "transitionTimingFunction" },
  // Numbers (Phase 2e): opacity, zIndex, and lineHeight collapsed into the spec
  // `number` type (line-heights re-authored unitless). A `z-index: auto` keyword
  // is the one non-numeric value the family held — it lands in `cssDimension`
  // (D4), the same home as the % / keyword length surfaces.
  number: { kind: "spec", type: "number" },
  // Typography
  fontWeight: { kind: "spec", type: "fontWeight" },
  fontFamily: { kind: "spec", type: "fontFamily" },
  // Border style (Phase 2e): the DTCG composite `strokeStyle` replaced the legacy
  // `borderStyle` type; zebkit authors the keyword form (`solid`).
  strokeStyle: { kind: "spec", type: "strokeStyle" },
  // Build-time settings stopped being pseudo-tokens in Phase 2a: the former
  // `setting` type is gone; scale controls live in group-level
  // `$extensions["dev.zebkit"].scale` (see TokenGroupExtensions).
  // Proprietary registry (no DTCG equivalent; type name is already final)
  display: { kind: "spec", type: "display" },
  fontStyle: { kind: "spec", type: "fontStyle" },
  textDecoration: { kind: "spec", type: "textDecoration" },
  textTransform: { kind: "spec", type: "textTransform" },
  textAlignment: { kind: "spec", type: "textAlignment" },
  utility: { kind: "spec", type: "utility" },
  asset: { kind: "spec", type: "asset" },
  content: { kind: "spec", type: "content" },
  boolean: { kind: "spec", type: "boolean" },
  flex: { kind: "spec", type: "flex" },
};
