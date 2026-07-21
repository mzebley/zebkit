import { z } from 'zod';
import { ALLOWED_TOKEN_TYPE_VALUES, ZEBKIT_EXTENSION_KEY } from '@definitions/dtcg';
import { LAYER_ORDER } from '@definitions/layers';

/**
 * Shared token typing used across Zebkit token builders and validators.
 * Token modules should default-export an object that matches {@link TokenInterface}.
 *
 * Entries use the DTCG field shape (`$value` / `$type` / `$description`), with
 * zebkit-specific metadata under `$extensions["dev.zebkit"]` (a11y modifier opt-in,
 * font-loading metadata). See plans/dtcg-alignment/plan.md.
 */
export const allowedTokenTypes = z.enum(ALLOWED_TOKEN_TYPE_VALUES);

export type AllowedTokenTypes = z.infer<typeof allowedTokenTypes>;

/**
 * DTCG dimension value: a structured `{value, unit}` pair, unit limited to
 * `px`/`rem` per the 2025.10 spec. px/rem length literals author this shape;
 * everything else a length slot accepts (`%`, `ch`, `em`, keywords, `calc()`)
 * is a `cssDimension`-typed string.
 */
export const DIMENSION_UNITS = ["px", "rem"] as const;
export const dimensionValueSchema = z.object({
  value: z.number().finite(),
  unit: z.enum(DIMENSION_UNITS),
}).strict();
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
  components: z.tuple([
    z.union([z.number().finite(), z.literal("none")]),
    z.union([z.number().finite(), z.literal("none")]),
    z.union([z.number().finite(), z.literal("none")]),
  ]),
  alpha: z.number().finite().min(0).max(1).optional(),
  hex: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
}).strict().superRefine((color, ctx) => {
  const ranges: Record<string, Array<[number, number] | null>> = {
    srgb: [[0, 1], [0, 1], [0, 1]],
    "srgb-linear": [[0, 1], [0, 1], [0, 1]],
    hsl: [[0, 360], [0, 100], [0, 100]],
    hwb: [[0, 360], [0, 100], [0, 100]],
    lab: [[0, 100], null, null],
    lch: [[0, 100], [0, Number.POSITIVE_INFINITY], [0, 360]],
    oklab: [[0, 1], null, null],
    oklch: [[0, 1], [0, Number.POSITIVE_INFINITY], [0, 360]],
    "display-p3": [[0, 1], [0, 1], [0, 1]],
    "a98-rgb": [[0, 1], [0, 1], [0, 1]],
    "prophoto-rgb": [[0, 1], [0, 1], [0, 1]],
    rec2020: [[0, 1], [0, 1], [0, 1]],
    "xyz-d65": [[0, 1], [0, 1], [0, 1]],
    "xyz-d50": [[0, 1], [0, 1], [0, 1]],
  };
  const colorRanges = ranges[color.colorSpace];
  color.components.forEach((component, index) => {
    if (component === "none" || !colorRanges[index]) return;
    const [min, max] = colorRanges[index]!;
    const upperExclusive = color.colorSpace === "hsl" || color.colorSpace === "hwb"
      ? index === 0
      : color.colorSpace === "lch" || color.colorSpace === "oklch"
        ? index === 2
        : false;
    if (component < min || component > max || (upperExclusive && component === max)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["components", index],
        message: `component ${index} is outside the ${color.colorSpace} range`,
      });
    }
  });
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

/** Parse Zebkit's supported DTCG curly-reference syntax, including terminal `$root`. */
export function parseWholeValueAlias(value: unknown): string | undefined {
  if (typeof value !== 'string' || !/^\{[^{}]+\}$/.test(value)) return undefined;
  const segments = value.slice(1, -1).split('.');
  if (
    segments.length < 2 ||
    !segments.every((segment, index) =>
      /^[A-Za-z0-9_-]+$/.test(segment) || (segment === '$root' && index === segments.length - 1)
    )
  ) {
    return undefined;
  }
  return segments.join('.');
}

/** True for the supported whole-value alias form. Literal validation is deferred to the collection. */
export function isWholeValueAlias(value: unknown): value is string {
  return parseWholeValueAlias(value) !== undefined;
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
  const allNumeric = v.components.every((component): component is number => typeof component === "number");
  const percent = (component: number | "none") => component === "none" ? "none" : `${component}%`;
  if (allNumeric && alpha === 0 && c1 === 0 && c2 === 0 && c3 === 0) return "transparent";
  if (allNumeric && v.hex && alpha === 1) return v.hex;
  const suffix = alpha === 1 ? "" : ` / ${alpha}`;
  if (v.colorSpace === "hsl") {
    return allNumeric
      ? alpha === 1
        ? `hsl(${c1}, ${c2}%, ${c3}%)`
        : `hsla(${c1}, ${c2}%, ${c3}%, ${alpha})`
      : `hsl(${c1} ${percent(c2)} ${percent(c3)}${suffix})`;
  }
  if (v.colorSpace === "hwb") {
    return `hwb(${c1} ${percent(c2)} ${percent(c3)}${suffix})`;
  }
  if (v.colorSpace === "lab") {
    return `lab(${percent(c1)} ${c2} ${c3}${suffix})`;
  }
  if (v.colorSpace === "lch") {
    return `lch(${percent(c1)} ${c2} ${c3}${suffix})`;
  }
  if (v.colorSpace === "oklab") {
    return `oklab(${c1} ${c2} ${c3}${suffix})`;
  }
  if (v.colorSpace === "oklch") {
    return `oklch(${c1} ${c2} ${c3}${suffix})`;
  }
  if (v.colorSpace === "srgb" && allNumeric) {
    const [r, g, b] = v.components as [number, number, number];
    const to255 = (n: number) => Math.round(n * 255);
    return alpha === 1
      ? `rgb(${to255(r)}, ${to255(g)}, ${to255(b)})`
      : `rgba(${to255(r)}, ${to255(g)}, ${to255(b)}, ${alpha})`;
  }
  const colorSpace = v.colorSpace === "rec2020" ? "rec2020" : v.colorSpace;
  return `color(${colorSpace} ${c1} ${c2} ${c3}${suffix})`;
}

/**
 * DTCG shadow value (2025.10): one shadow layer — a color, the four
 * offset/blur/spread dimensions, and an optional `inset` flag (default false).
 * A shadow token's `$value` is one of these objects or an array of them
 * (layered shadows); the empty array is zebkit's convention for
 * `box-shadow: none` (Phase 2c). Zebkit's elevation ramp authors srgb
 * black-with-alpha layers.
 */
const tokenReferenceValueSchema = z.string().refine(isWholeValueAlias, 'invalid token reference');

export const shadowValueSchema = z.object({
  // DTCG composite sub-values may be explicit values or references to a token
  // of the matching type (Format Module 2025.10 §9.6).
  color: z.union([colorValueSchema, tokenReferenceValueSchema]),
  offsetX: z.union([dimensionValueSchema, tokenReferenceValueSchema]),
  offsetY: z.union([dimensionValueSchema, tokenReferenceValueSchema]),
  blur: z.union([
    dimensionValueSchema.refine((dimension) => dimension.value >= 0, 'shadow blur must not be negative'),
    tokenReferenceValueSchema,
  ]),
  spread: z.union([dimensionValueSchema, tokenReferenceValueSchema]),
  inset: z.boolean().optional(),
}).strict();
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
export function isShadowValue(v: unknown): v is ShadowTokenValue {
  if (Array.isArray(v)) {
    return v.length === 0 || v.every((layer) => isSingleShadow(layer) || isWholeValueAlias(layer));
  }
  return isSingleShadow(v);
}

/** Shadow offsets drop the unit at zero magnitude (`0`, not `0px`) — the authored CSS form. */
export type ShadowReferenceResolver = (
  reference: string,
  expectedType: 'shadow' | 'color' | 'dimension'
) => string;

function serializeShadowReference(
  value: string,
  expectedType: 'shadow' | 'color' | 'dimension',
  resolveReference: ShadowReferenceResolver | undefined
): string {
  const reference = parseWholeValueAlias(value);
  if (!reference) return value;
  if (!resolveReference) {
    throw new Error(
      `Cannot serialize shadow reference '{${reference}}' without a token collection resolver.`
    );
  }
  return resolveReference(reference, expectedType);
}

function serializeShadowDimension(
  d: DimensionValue | string,
  resolveReference: ShadowReferenceResolver | undefined
): string {
  if (typeof d === "string") return serializeShadowReference(d, 'dimension', resolveReference);
  return d.value === 0 ? "0" : serializeDimensionValue(d);
}

/** Shadow colors render in CSS Color 4 space notation (srgb → `rgb(r g b[ / a])`). */
function serializeShadowColor(
  c: ColorValue | string,
  resolveReference: ShadowReferenceResolver | undefined
): string {
  if (typeof c === "string") return serializeShadowReference(c, 'color', resolveReference);
  const alpha = c.alpha ?? 1;
  const allNumeric = c.components.every((component): component is number => typeof component === "number");
  if (c.colorSpace === "srgb" && allNumeric) {
    const to255 = (n: number) => Math.round(n * 255);
    const [r, g, b] = c.components as [number, number, number];
    const rgb = `${to255(r)} ${to255(g)} ${to255(b)}`;
    return alpha === 1 ? `rgb(${rgb})` : `rgb(${rgb} / ${alpha})`;
  }
  return serializeColorValue(c);
}

function serializeShadowLayer(
  s: ShadowValue,
  resolveReference: ShadowReferenceResolver | undefined
): string {
  const body = [
    serializeShadowDimension(s.offsetX, resolveReference),
    serializeShadowDimension(s.offsetY, resolveReference),
    serializeShadowDimension(s.blur, resolveReference),
    serializeShadowDimension(s.spread, resolveReference),
    serializeShadowColor(s.color, resolveReference),
  ].join(" ");
  return s.inset ? `inset ${body}` : body;
}

/**
 * Canonical CSS serialization for a shadow value. Byte-driven (must reproduce
 * the elevation ramp's authored strings exactly): each layer is
 * `[inset ]<offsetX> <offsetY> <blur> <spread> <color>`, layers join with
 * `, `, and the empty array is `none`.
 */
export type ShadowTokenValue = ShadowValue | Array<ShadowValue | string>;

export function serializeShadowValue(
  v: ShadowTokenValue,
  resolveReference?: ShadowReferenceResolver
): string {
  const layers = Array.isArray(v) ? v : [v];
  if (layers.length === 0) return "none";
  return layers
    .map((layer) => typeof layer === "string"
      ? serializeShadowReference(layer, 'shadow', resolveReference)
      : serializeShadowLayer(layer, resolveReference))
    .join(", ");
}

/**
 * DTCG duration value (2025.10): a `{value, unit}` pair with unit limited to
 * `ms`/`s`. Zebkit authors `ms`. A zero-magnitude duration serializes to the
 * bare `0` the CSS surface uses (`transition-delay: 0`), not `0ms`.
 */
export const DURATION_UNITS = ["ms", "s"] as const;
export const durationValueSchema = z.object({
  value: z.number().finite().nonnegative(),
  unit: z.enum(DURATION_UNITS),
}).strict();
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
  z.number().finite().min(0).max(1),
  z.number().finite(),
  z.number().finite().min(0).max(1),
  z.number().finite(),
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
  index: z.number().finite().int(),
  /** Export provenance retained only in literal DTCG reads. */
  valueSource: z.enum(["generated", "pinned"]).optional(),
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
  /** Authoring-only empty semantic color placeholder, materialized at export. */
  emptyColorPlaceholder: z.literal(true).optional(),
  /** Original raw theme CSS value restored when an exported DTCG document is re-ingested. */
  rawCssValue: z.string().optional(),
  /** Original type when an export uses a DTCG interchange type for a raw CSS value. */
  originalType: allowedTokenTypes.optional(),
}).passthrough();
export type ZebkitExtension = z.infer<typeof zebkitExtensionSchema>;

/** `$extensions` validates Zebkit's namespace and preserves unknown vendor namespaces. */
export const tokenExtensionsSchema = z.object({
  [ZEBKIT_EXTENSION_KEY]: zebkitExtensionSchema.optional(),
}).passthrough();
export type TokenExtensions = z.infer<typeof tokenExtensionsSchema>;

const stringTokenValueSchema = z.string();
const booleanTokenValueSchema = z.boolean();
const numberTokenValueSchema = z.number().finite();

/** The exact named aliases defined by DTCG Format Module 2025.10 §8.4. */
export const DTCG_2025_10_WEIGHT_ALIASES = [
  "thin",
  "hairline",
  "extra-light",
  "ultra-light",
  "light",
  "normal",
  "regular",
  "book",
  "medium",
  "semi-bold",
  "demi-bold",
  "bold",
  "extra-bold",
  "ultra-bold",
  "black",
  "heavy",
  "extra-black",
  "ultra-black",
] as const;

export const fontWeightValueSchema = z.union([
  z.number().finite().min(1).max(1000),
  z.enum(DTCG_2025_10_WEIGHT_ALIASES),
]);

export const strokeStyleKeywordSchema = z.enum([
  "solid",
  "dashed",
  "dotted",
  "double",
  "groove",
  "ridge",
  "outset",
  "inset",
]);

// Zebkit's border-style surface uses the DTCG keyword form. The structured
// SVG dash form is not authorable until it has a corresponding CSS target.
export const strokeStyleValueSchema = strokeStyleKeywordSchema;
export type StrokeStyleValue = z.infer<typeof strokeStyleValueSchema>;

/**
 * One conformance registry for authored and exported token values. Whole-value
 * aliases are intentionally accepted for every type here; the collection
 * validator resolves their target and checks type compatibility.
 */
export function tokenValueSchemaForType(type: AllowedTokenTypes): z.ZodTypeAny {
  switch (type) {
    case "number":
      return numberTokenValueSchema;
    case "color":
      return colorValueSchema;
    case "dimension":
      return dimensionValueSchema;
    case "duration":
      return durationValueSchema;
    case "cubicBezier":
      return cubicBezierValueSchema;
    case "shadow":
      return z.union([shadowValueSchema, z.array(z.union([shadowValueSchema, tokenReferenceValueSchema]))]);
    case "fontFamily":
      return z.union([z.string(), z.array(z.string())]);
    case "fontWeight":
      return fontWeightValueSchema;
    case "boolean":
      return booleanTokenValueSchema;
    case "flex":
    case "cssDimension":
    case "display":
    case "cursor":
    case "fontStyle":
    case "textDecoration":
    case "textTransform":
    case "textAlignment":
    case "transitionProperty":
    case "transitionTimingFunction":
    case "transform":
    case "utility":
    case "asset":
    case "content":
      return stringTokenValueSchema;
    case "strokeStyle":
      return strokeStyleValueSchema;
  }
}

/** Check a literal against the registry, leaving whole-value aliases to reference validation. */
export function validateTokenValue(
  type: AllowedTokenTypes,
  value: unknown,
  options: { allowAuthoringPlaceholders?: boolean; emptyColorPlaceholder?: boolean } = {}
): z.SafeParseReturnType<unknown, unknown> {
  if (isWholeValueAlias(value)) return { success: true, data: value };
  if (
    options.allowAuthoringPlaceholders &&
    options.emptyColorPlaceholder &&
    type === "color" &&
    value === ""
  ) {
    return { success: true, data: value };
  }
  return tokenValueSchemaForType(type).safeParse(value);
}

/**
 * Zod schema describing a single token entry.
 */
export const tokenObjectSchema = z.object({
  $value: z.unknown(),
  $type: allowedTokenTypes,
  $description: z.string(),
  $extensions: tokenExtensionsSchema.optional(),
  $deprecated: z.union([z.boolean(), z.string()]).optional(),
}).superRefine((entry, ctx) => {
  if (entry.$value === undefined) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["$value"], message: "$value is required" });
    return;
  }
  const result = validateTokenValue(entry.$type, entry.$value, {
    allowAuthoringPlaceholders: true,
    emptyColorPlaceholder: zbkExtension(entry)?.emptyColorPlaceholder === true,
  });
  if (!result.success) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["$value"],
      message: `value does not match $type '${entry.$type}'`,
    });
  }
});

/**
 * Shape of an individual token entry.
 */
export type TokenValue =
  | string
  | number
  | boolean
  | DimensionValue
  | DurationValue
  | ColorValue
  | CubicBezierValue
  | ShadowTokenValue
  | StrokeStyleValue
  | string[];

export interface TokenObject {
  $value?: TokenValue;
  $type: AllowedTokenTypes;
  $description: string;
  $extensions?: TokenExtensions;
  $deprecated?: boolean | string;
  [key: string]: unknown;
}

/**
 * Generic authoring schema for a token module's default export: a record of
 * leaf token entries (Phase 3). Replaces the ~46 hand-listed per-module
 * `token-schema.ts` files whose only job was to `z.object` the entry keys — the
 * golden baseline and component lint catch a dropped/mistyped entry the exact-
 * key form used to. Modules with real structural constraints (breakpoint
 * ordering, generated-scale steps, font-family loading metadata) keep a bespoke
 * schema. Group-level metadata rides a separate `extensions` export, not this map.
 */
export const tokenModuleSchema = z.record(tokenObjectSchema);

/**
 * Build-time generator controls (the fluid type-scale anchors/ratios, spacing
 * `max-scale`) live at the GROUP level, under `$extensions["dev.zebkit"].scale`
 * on the owning token module — they are not tokens and are never emitted as CSS
 * custom properties. Token modules author them via a named `extensions` export;
 * override documents author them via a top-level `$extensions` member.
 */
const scaleLengthSchema = z.union([
  dimensionValueSchema,
  z.string().regex(/^-?(?:\d+(?:\.\d+)?|\.\d+)(?:px|rem)$/),
]);
const positiveFiniteSchema = z.number().finite().positive();

export const typeScaleControlsSchema = z.object({
  'min-viewport': scaleLengthSchema.optional(),
  'max-viewport': scaleLengthSchema.optional(),
  'min-base': scaleLengthSchema.optional(),
  'max-base': scaleLengthSchema.optional(),
  'min-ratio': positiveFiniteSchema.optional(),
  'max-ratio': positiveFiniteSchema.optional(),
}).strict().superRefine((controls, ctx) => {
  const lengthToPx = (value: string | DimensionValue | undefined): number | undefined => {
    if (value === undefined) return undefined;
    if (typeof value === 'string') {
      const amount = Number.parseFloat(value);
      return value.endsWith('rem') ? amount * 16 : amount;
    }
    return value.unit === 'rem' ? value.value * 16 : value.value;
  };
  const minViewport = lengthToPx(controls['min-viewport']);
  const maxViewport = lengthToPx(controls['max-viewport']);
  if (minViewport !== undefined && maxViewport !== undefined && maxViewport <= minViewport) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['max-viewport'],
      message: 'max-viewport must be greater than min-viewport',
    });
  }
});

export const spaceScaleControlsSchema = z.object({
  'max-scale': positiveFiniteSchema.optional(),
}).strict();

export const tokenGroupScaleSchema = z.union([typeScaleControlsSchema, spaceScaleControlsSchema]);
export interface TokenGroupScale {
  'min-viewport'?: string | DimensionValue;
  'max-viewport'?: string | DimensionValue;
  'min-base'?: string | DimensionValue;
  'max-base'?: string | DimensionValue;
  'min-ratio'?: number;
  'max-ratio'?: number;
  'max-scale'?: number;
}

export const tokenGroupExtensionsSchema = z.object({
  [ZEBKIT_EXTENSION_KEY]: z
    .object({
      scale: tokenGroupScaleSchema.optional(),
      // A module's cascade layer and emission mode ride here in exported DTCG
      // documents. This replaced the historical `_layer` / `_cssEmission`
      // snapshot sidecars; authoring TS modules still declare these via `layer` /
      // `cssEmission` exports; the exporter folds them into this group block.
      layer: z.enum(LAYER_ORDER as [string, ...string[]]).optional(),
      cssEmission: z.literal('external').optional(),
    }).passthrough()
    .optional(),
}).passthrough();
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
 *
 * Per DTCG 2025.10 a `fontFamily` `$value` is a single family name or an ordered
 * array of them (Phase 2e). Zebkit authors single strings today (the converter
 * appends the fallback stack from `$extensions`); the array form is accepted for
 * interchange.
 */
export const fontFamilyTokenObjectSchema = z.object({
  $value: z.union([z.string(), z.array(z.string())]),
  $type: z.literal("fontFamily"),
  $description: z.string(),
  $extensions: tokenExtensionsSchema.optional(),
  $deprecated: z.union([z.boolean(), z.string()]).optional(),
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
