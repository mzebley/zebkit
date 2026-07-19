import { z } from 'zod';
import { ZEBKIT_EXTENSION_KEY } from '@definitions/dtcg';

/**
 * Shared token typing used across Zebkit token builders and validators.
 * Token modules should default-export an object that matches {@link TokenInterface}.
 *
 * Entries use the DTCG field shape (`$value` / `$type` / `$description`), with
 * zebkit-specific metadata under `$extensions["dev.zebkit"]` (a11y modifier opt-in,
 * font-loading metadata). See plans/dtcg-alignment/plan.md.
 */
export const allowedTokenTypes = z.enum([
  'color',
  'fontFamily',
  'lineHeight',
  'fontWeight',
  'fontStyle',
  'textDecoration',
  'textTransform',
  'textAlignment',
  // The transition split (Phase 2c→2d, decision D5): the conflated `transition`
  // type fanned out. Durations are spec `duration` ({value, unit} ms/s), easing
  // curves are spec `cubicBezier` ([x1,y1,x2,y2]); the CSS-property list and the
  // `<easing-function>` keyword surface (`ease-out`, …) DTCG can't type are the
  // proprietary `transitionProperty` / `transitionTimingFunction`.
  'duration',
  'cubicBezier',
  'transitionProperty',
  'transitionTimingFunction',
  // The dimension family (Phase 2a step 4, decision D5): `dimension` is the
  // spec type for structured `{value, unit}` px/rem lengths; `cssDimension`
  // covers every other CSS length surface (%, ch, em, keywords, unitless 0,
  // calc()/clamp() expressions). The legacy names — spacing, sizing, rootSize,
  // borderWidth, borderRadius, fontSize, rootFontSize, letterSpacing — are gone.
  'dimension',
  'cssDimension',
  'display',
  // `borderColor` collapsed into `color` (Phase 2b, decision D5) — it never had
  // its own token entries; border color surfaces are plain `color` tokens.
  'borderStyle',
  'utility',
  'zIndex',
  'asset',
  'opacity',
  'content',
  'boolean',
  // The DTCG composite `shadow` type (Phase 2c, decision D5): a `$value` is one
  // shadow-layer object or an array of them; the empty array is `box-shadow:
  // none`. The legacy `boxShadow` name is gone.
  'shadow',
  'flex'
]);

export type AllowedTokenTypes = z.infer<typeof allowedTokenTypes>;

/**
 * DTCG dimension value: a structured `{value, unit}` pair, unit limited to
 * `px`/`rem` per the 2025.10 spec. px/rem length literals author this shape;
 * everything else a length slot accepts (`%`, `ch`, `em`, keywords, `calc()`)
 * is a `cssDimension`-typed string.
 */
export const DIMENSION_UNITS = ["px", "rem"] as const;
export const dimensionValueSchema = z.object({
  value: z.number(),
  unit: z.enum(DIMENSION_UNITS),
});
export type DimensionValue = z.infer<typeof dimensionValueSchema>;

/** True when `v` is a structured `{value, unit}` dimension value. */
export function isDimensionValue(v: unknown): v is DimensionValue {
  return (
    !!v &&
    typeof v === "object" &&
    typeof (v as { value?: unknown }).value === "number" &&
    ((v as { unit?: unknown }).unit === "px" || (v as { unit?: unknown }).unit === "rem")
  );
}

/**
 * Canonical CSS serialization for a structured dimension. Magnitudes below 1
 * drop the leading zero (`{-0.05, rem}` → `-.05rem`) — the corpus-audited
 * authored form (see plans/dtcg-alignment/phase-2a-worknote.md); changing this
 * rule changes emitted bytes and breaks the golden baseline.
 */
export function serializeDimensionValue(v: DimensionValue): string {
  return `${String(v.value).replace(/^(-?)0\./, "$1.")}${v.unit}`;
}

/**
 * DTCG color value (2025.10): a color space, its components, optional alpha
 * (default 1), and an optional `hex` fallback. Zebkit authors `hsl` (the
 * palette ramp) and `srgb` + `hex` (the globals); the full spec color-space
 * list is accepted for interchange.
 */
export const DTCG_COLOR_SPACES = [
  "srgb",
  "srgb-linear",
  "hsl",
  "hwb",
  "lab",
  "lch",
  "oklab",
  "oklch",
  "display-p3",
  "a98-rgb",
  "prophoto-rgb",
  "rec2020",
  "xyz-d65",
  "xyz-d50",
] as const;
export const colorValueSchema = z.object({
  colorSpace: z.enum(DTCG_COLOR_SPACES),
  components: z.tuple([z.number(), z.number(), z.number()]),
  alpha: z.number().min(0).max(1).optional(),
  hex: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});
export type ColorValue = z.infer<typeof colorValueSchema>;

/** True when `v` is a structured DTCG color value. */
export function isColorValue(v: unknown): v is ColorValue {
  return (
    !!v &&
    typeof v === "object" &&
    typeof (v as { colorSpace?: unknown }).colorSpace === "string" &&
    Array.isArray((v as { components?: unknown }).components)
  );
}

/**
 * Canonical CSS serialization for a structured color. Byte-driven rules (the
 * palette SCSS and docs data must reproduce today's output exactly):
 * fully-transparent black is the `transparent` keyword (decision D8); a `hex`
 * fallback wins where present; `hsl` uses the legacy comma notation the
 * palette has always emitted; anything else falls back to CSS Color 4
 * `color()` / `rgb()` notation.
 */
export function serializeColorValue(v: ColorValue): string {
  const alpha = v.alpha ?? 1;
  const [c1, c2, c3] = v.components;
  if (alpha === 0 && c1 === 0 && c2 === 0 && c3 === 0) return "transparent";
  if (v.hex && alpha === 1) return v.hex;
  if (v.colorSpace === "hsl") {
    return alpha === 1
      ? `hsl(${c1}, ${c2}%, ${c3}%)`
      : `hsla(${c1}, ${c2}%, ${c3}%, ${alpha})`;
  }
  if (v.colorSpace === "srgb") {
    const to255 = (n: number) => Math.round(n * 255);
    return alpha === 1
      ? `rgb(${to255(c1)}, ${to255(c2)}, ${to255(c3)})`
      : `rgba(${to255(c1)}, ${to255(c2)}, ${to255(c3)}, ${alpha})`;
  }
  return `color(${v.colorSpace} ${c1} ${c2} ${c3}${alpha === 1 ? "" : ` / ${alpha}`})`;
}

/**
 * DTCG shadow value (2025.10): one shadow layer — a color, the four
 * offset/blur/spread dimensions, and an optional `inset` flag (default false).
 * A shadow token's `$value` is one of these objects or an array of them
 * (layered shadows); the empty array is zebkit's convention for
 * `box-shadow: none` (Phase 2c). Zebkit's elevation ramp authors srgb
 * black-with-alpha layers.
 */
export const shadowValueSchema = z.object({
  color: colorValueSchema,
  offsetX: dimensionValueSchema,
  offsetY: dimensionValueSchema,
  blur: dimensionValueSchema,
  spread: dimensionValueSchema,
  inset: z.boolean().optional(),
});
export type ShadowValue = z.infer<typeof shadowValueSchema>;

function isSingleShadow(v: unknown): boolean {
  return (
    !!v &&
    typeof v === "object" &&
    !Array.isArray(v) &&
    "offsetX" in v &&
    "color" in v
  );
}

/**
 * True when `v` is a single structured shadow or an array of them — including
 * the empty `none` array. A non-empty array of non-shadow entries (e.g. a
 * future `cubicBezier` number tuple) is not a shadow.
 */
export function isShadowValue(v: unknown): v is ShadowValue | ShadowValue[] {
  if (Array.isArray(v)) return v.length === 0 || v.every(isSingleShadow);
  return isSingleShadow(v);
}

/** Shadow offsets drop the unit at zero magnitude (`0`, not `0px`) — the authored CSS form. */
function serializeShadowDimension(d: DimensionValue): string {
  return d.value === 0 ? "0" : serializeDimensionValue(d);
}

/** Shadow colors render in CSS Color 4 space notation (srgb → `rgb(r g b[ / a])`). */
function serializeShadowColor(c: ColorValue): string {
  const alpha = c.alpha ?? 1;
  if (c.colorSpace === "srgb") {
    const to255 = (n: number) => Math.round(n * 255);
    const [r, g, b] = c.components;
    const rgb = `${to255(r)} ${to255(g)} ${to255(b)}`;
    return alpha === 1 ? `rgb(${rgb})` : `rgb(${rgb} / ${alpha})`;
  }
  return serializeColorValue(c);
}

function serializeShadowLayer(s: ShadowValue): string {
  const body = [
    serializeShadowDimension(s.offsetX),
    serializeShadowDimension(s.offsetY),
    serializeShadowDimension(s.blur),
    serializeShadowDimension(s.spread),
    serializeShadowColor(s.color),
  ].join(" ");
  return s.inset ? `inset ${body}` : body;
}

/**
 * Canonical CSS serialization for a shadow value. Byte-driven (must reproduce
 * the elevation ramp's authored strings exactly): each layer is
 * `[inset ]<offsetX> <offsetY> <blur> <spread> <color>`, layers join with
 * `, `, and the empty array is `none`.
 */
export function serializeShadowValue(v: ShadowValue | ShadowValue[]): string {
  const layers = Array.isArray(v) ? v : [v];
  if (layers.length === 0) return "none";
  return layers.map(serializeShadowLayer).join(", ");
}

/**
 * DTCG duration value (2025.10): a `{value, unit}` pair with unit limited to
 * `ms`/`s`. Zebkit authors `ms`. A zero-magnitude duration serializes to the
 * bare `0` the CSS surface uses (`transition-delay: 0`), not `0ms`.
 */
export const DURATION_UNITS = ["ms", "s"] as const;
export const durationValueSchema = z.object({
  value: z.number(),
  unit: z.enum(DURATION_UNITS),
});
export type DurationValue = z.infer<typeof durationValueSchema>;

/** True when `v` is a structured `{value, unit}` duration (ms/s). */
export function isDurationValue(v: unknown): v is DurationValue {
  return (
    !!v &&
    typeof v === "object" &&
    typeof (v as { value?: unknown }).value === "number" &&
    ((v as { unit?: unknown }).unit === "ms" || (v as { unit?: unknown }).unit === "s")
  );
}

/** Canonical CSS serialization for a duration; zero drops its unit (`0`, not `0ms`). */
export function serializeDurationValue(v: DurationValue): string {
  return v.value === 0 ? "0" : `${v.value}${v.unit}`;
}

/**
 * DTCG cubic-bezier value (2025.10): the four control-point coordinates
 * `[x1, y1, x2, y2]`. Zebkit's easing curves author two-decimal coordinates
 * (`1.00`, `0.90`); the serializer pins that precision so the emitted
 * `cubic-bezier(...)` string is byte-identical (module-level self-checks guard
 * it). Keyword easings (`ease-out`) are `transitionTimingFunction`, not this.
 */
export const cubicBezierValueSchema = z.tuple([
  z.number(),
  z.number(),
  z.number(),
  z.number(),
]);
export type CubicBezierValue = z.infer<typeof cubicBezierValueSchema>;

/** True when `v` is a 4-number cubic-bezier coordinate tuple. */
export function isCubicBezierValue(v: unknown): v is CubicBezierValue {
  return Array.isArray(v) && v.length === 4 && v.every((n) => typeof n === "number");
}

/** Canonical CSS serialization: `cubic-bezier(x1, y1, x2, y2)` at two decimals. */
export function serializeCubicBezierValue(v: CubicBezierValue): string {
  return `cubic-bezier(${v.map((n) => n.toFixed(2)).join(", ")})`;
}

/** A token `$value` as its CSS string: structured dimensions/durations/colors/beziers/shadows serialize, the rest stringify. */
export function tokenValueToString(v: unknown): string {
  if (isDimensionValue(v)) return serializeDimensionValue(v);
  if (isDurationValue(v)) return serializeDurationValue(v);
  if (isColorValue(v)) return serializeColorValue(v);
  if (isCubicBezierValue(v)) return serializeCubicBezierValue(v);
  if (isShadowValue(v)) return serializeShadowValue(v);
  return String(v);
}

/**
 * Where a font family is loaded from. `system` (default) emits a plain CSS variable; `google`
 * emits a Google Fonts request (via the configured strategy); `local` emits `@font-face` rules
 * from the token's `faces`.
 */
export const fontSourceSchema = z.enum(["system", "google", "local"]);
export type FontSource = z.infer<typeof fontSourceSchema>;

/**
 * Generic fallback category. When set, the converter appends a full, industry-standard
 * fallback stack (see `@definitions/font-fallbacks`) after the authored family.
 */
export const fontFallbackSchema = z.enum(["sans", "serif", "mono"]);
export type FontFallback = z.infer<typeof fontFallbackSchema>;

/**
 * A single `@font-face` source descriptor for a self-hosted (`source: "local"`) family.
 * `src` resolves against the build's `assetFilePath` unless it begins with `/`, `http`, or `.`
 * (used verbatim). `format` is inferred from the file extension when omitted.
 */
export const fontFaceSchema = z.object({
  src: z.string(),
  weight: z.union([z.string(), z.number()]).optional(),
  style: z.enum(["normal", "italic", "oblique"]).optional(),
  display: z.enum(["auto", "block", "swap", "fallback", "optional"]).optional(),
  format: z.string().optional(),
  unicodeRange: z.string().optional(),
});
export type FontFaceObject = z.infer<typeof fontFaceSchema>;

/**
 * Font-loading metadata carried under `$extensions["dev.zebkit"].font` on
 * `fontFamily` tokens. `weights` is an array for a static list (`[400, 700]`) or a
 * range string for a variable font (`"200..800"`); `styles` opts into italic;
 * `faces` is used only by local fonts.
 */
export const zebkitFontExtensionSchema = z.object({
  source: fontSourceSchema.optional(),
  fallback: fontFallbackSchema.optional(),
  weights: z.union([z.string(), z.array(z.union([z.string(), z.number()]))]).optional(),
  styles: z.array(z.enum(["normal", "italic"])).optional(),
  faces: z.array(fontFaceSchema).optional(),
  display: z.enum(["auto", "block", "swap", "fallback", "optional"]).optional(),
});
export type ZebkitFontExtension = z.infer<typeof zebkitFontExtensionSchema>;

/**
 * Generated-scale metadata carried under `$extensions["dev.zebkit"].scale` on a
 * scale-step entry: `index` positions the step in the fluid scale (base = 0).
 */
export const zebkitScaleStepSchema = z.object({
  index: z.number().int(),
});
export type ZebkitScaleStep = z.infer<typeof zebkitScaleStepSchema>;

/**
 * Everything zebkit-specific a token entry can carry, namespaced under the
 * `dev.zebkit` vendor key inside `$extensions`.
 * `a11y: true` opts into the default runtime modifier for the token's type;
 * a string names a custom modifier CSS variable. `scale` positions a
 * generated-scale step (rootFontSize entries).
 */
export const zebkitExtensionSchema = z.object({
  a11y: z.union([z.boolean(), z.string()]).optional(),
  font: zebkitFontExtensionSchema.optional(),
  scale: zebkitScaleStepSchema.optional(),
});
export type ZebkitExtension = z.infer<typeof zebkitExtensionSchema>;

/** The `$extensions` member: zebkit's vendor namespace (other vendors rejected pre-Phase 3). */
export const tokenExtensionsSchema = z.object({
  [ZEBKIT_EXTENSION_KEY]: zebkitExtensionSchema.optional(),
});
export type TokenExtensions = z.infer<typeof tokenExtensionsSchema>;

/**
 * Zod schema describing a single token entry.
 */
export const tokenObjectSchema = z.object({
  $value: z.union([
    z.string(),
    z.number(),
    dimensionValueSchema,
    durationValueSchema,
    colorValueSchema,
    cubicBezierValueSchema,
    shadowValueSchema,
    z.array(shadowValueSchema),
  ]),
  $type: allowedTokenTypes,
  $description: z.string(),
  $extensions: tokenExtensionsSchema.optional(),
});

/**
 * Shape of an individual token entry.
 */
export interface TokenObject extends z.infer<typeof tokenObjectSchema> {}

/**
 * Build-time generator controls (the fluid type-scale anchors/ratios, spacing
 * `max-scale`) live at the GROUP level, under `$extensions["dev.zebkit"].scale`
 * on the owning token module — they are not tokens and are never emitted as CSS
 * custom properties. Token modules author them via a named `extensions` export;
 * override documents author them via a top-level `$extensions` member.
 */
export const tokenGroupScaleSchema = z.record(
  z.union([z.string(), z.number(), dimensionValueSchema])
);
export type TokenGroupScale = z.infer<typeof tokenGroupScaleSchema>;

export const tokenGroupExtensionsSchema = z.object({
  [ZEBKIT_EXTENSION_KEY]: z
    .object({
      scale: tokenGroupScaleSchema.optional(),
    })
    .optional(),
});
export type TokenGroupExtensions = z.infer<typeof tokenGroupExtensionsSchema>;

/**
 * A named step in a generated scale (e.g. font sizes). The step's `index`
 * (base = 0) lives under `$extensions["dev.zebkit"].scale`; `$value` is present
 * ONLY when a step is pinned to a static literal (static mode or a per-step
 * override). Fluid steps omit `$value` and are derived from the group's scale
 * controls at build time. Steps are `cssDimension`-typed: they resolve to
 * fluid `clamp()` / a11y `calc()` expressions the spec `dimension` type cannot
 * represent.
 */
export const fontSizeStepSchema = z.object({
  $value: z.union([z.string(), z.number(), dimensionValueSchema]).optional(),
  $type: z.literal('cssDimension'),
  $description: z.string(),
  $extensions: tokenExtensionsSchema.optional(),
});

/**
 * Shape of a generated-scale step token.
 */
export interface FontSizeStepObject extends z.infer<typeof fontSizeStepSchema> {}

/**
 * Map of token keys to token entries.
 */
export interface TokenInterface {
  [key: string]: TokenObject;
}

export type TokenMap = Record<string, TokenInterface>;

/**
 * Unified font-family token. One `$type` (`"fontFamily"`) for every font token; loading
 * metadata (source/fallback/weights/styles/faces/display) lives under
 * `$extensions["dev.zebkit"].font`. Aliases are the same shape with a `{...}` reference value.
 */
export const fontFamilyTokenObjectSchema = z.object({
  $value: z.union([z.string(), z.number()]),
  $type: z.literal("fontFamily"),
  $description: z.string(),
  $extensions: tokenExtensionsSchema.optional(),
});
export type FontFamilyTokenObject = z.infer<typeof fontFamilyTokenObjectSchema>;

/**
 * Reads the `dev.zebkit` vendor block from any entry-shaped object.
 * Tolerant of unknown shapes so pipeline code can call it on unvalidated data.
 */
export function zbkExtension(entry: unknown): ZebkitExtension | undefined {
  if (!entry || typeof entry !== 'object') return undefined;
  const extensions = (entry as { $extensions?: unknown }).$extensions;
  if (!extensions || typeof extensions !== 'object') return undefined;
  const vendor = (extensions as Record<string, unknown>)[ZEBKIT_EXTENSION_KEY];
  if (!vendor || typeof vendor !== 'object') return undefined;
  return vendor as ZebkitExtension;
}

/** The entry's a11y-modifier opt-in (`true` or a custom modifier var), if any. */
export function tokenA11y(entry: unknown): boolean | string | undefined {
  return zbkExtension(entry)?.a11y;
}

/** The entry's font-loading metadata, if any (fontFamily tokens). */
export function tokenFontMeta(entry: unknown): ZebkitFontExtension | undefined {
  return zbkExtension(entry)?.font;
}

/** The entry's generated-scale step index, if any (rootFontSize steps). */
export function tokenScaleIndex(entry: unknown): number | undefined {
  return zbkExtension(entry)?.scale?.index;
}

/** The group-level scale controls from a module's `$extensions`, if any. */
export function groupScale(extensions: unknown): TokenGroupScale | undefined {
  if (!extensions || typeof extensions !== 'object') return undefined;
  const vendor = (extensions as Record<string, unknown>)[ZEBKIT_EXTENSION_KEY];
  if (!vendor || typeof vendor !== 'object') return undefined;
  const scale = (vendor as { scale?: unknown }).scale;
  return scale && typeof scale === 'object' ? (scale as TokenGroupScale) : undefined;
}
