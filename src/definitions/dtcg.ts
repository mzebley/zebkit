/**
 * Central DTCG alignment definitions.
 *
 * Spec target: DTCG Design Tokens Format Module 2025.10 (the first stable release).
 * These are the locked decisions from plans/dtcg-alignment/plan.md (D3, D4, D5)
 * expressed as the live registry used by validation, export, and tooling.
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
 * DTCG types for which Zebkit implements value validation, CSS serialization,
 * and strict export. The remaining normative types stay in {@link DTCG_TYPES}
 * so the format vocabulary is represented truthfully, but are not authorable
 * until their complete runtime behavior exists.
 */
export const ZEBKIT_SUPPORTED_SPEC_TYPES = [
  "color",
  "dimension",
  "duration",
  "fontFamily",
  "fontWeight",
  "cubicBezier",
  "number",
  "strokeStyle",
  "shadow",
] as const satisfies readonly DtcgType[];

export type ZebkitSupportedSpecType = (typeof ZEBKIT_SUPPORTED_SPEC_TYPES)[number];

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

/** Every `$type` Zebkit can author and emit. */
export const ALLOWED_TOKEN_TYPE_VALUES = [
  ...ZEBKIT_SUPPORTED_SPEC_TYPES,
  ...ZEBKIT_PROPRIETARY_TYPES,
] as const;

export type ZebkitDtcgType = (typeof ALLOWED_TOKEN_TYPE_VALUES)[number];

/** True when `type` is part of the DTCG 2025.10 spec vocabulary (vs. zebkit-proprietary). */
export function isDtcgSpecType(type: string): type is DtcgType {
  return (DTCG_TYPES as readonly string[]).includes(type);
}

/** True when the type is both normative DTCG and fully implemented by Zebkit. */
export function isZebkitSupportedSpecType(type: string): type is ZebkitSupportedSpecType {
  return (ZEBKIT_SUPPORTED_SPEC_TYPES as readonly string[]).includes(type);
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
 * - `cssEmission`: external CSS ownership for the primitive palette
 * - `emptyColorPlaceholder`, `rawCssValue`, `originalType`: transient authoring/export provenance
 */
export const ZEBKIT_EXTENSION_SUBKEYS = [
  "a11y",
  "scale",
  "font",
  "layer",
  "cssEmission",
  "emptyColorPlaceholder",
  "rawCssValue",
  "originalType",
] as const;

export type ZebkitExtensionSubkey = (typeof ZEBKIT_EXTENSION_SUBKEYS)[number];
