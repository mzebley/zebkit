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
  'fontSize',
  'rootFontSize',
  'lineHeight',
  'letterSpacing',
  'fontWeight',
  'fontStyle',
  'textDecoration',
  'textTransform',
  'textAlignment',
  'transition',
  'sizing',
  'spacing',
  'dimension',
  'cssDimension',
  'rootSize',
  'display',
  'borderRadius',
  'borderWidth',
  'borderColor',
  'borderStyle',
  'utility',
  'zIndex',
  'asset',
  'opacity',
  'content',
  'boolean',
  'boxShadow',
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

/** A token `$value` as its CSS string: structured dimensions serialize, the rest stringify. */
export function tokenValueToString(v: unknown): string {
  return isDimensionValue(v) ? serializeDimensionValue(v) : String(v);
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
  $value: z.union([z.string(), z.number(), dimensionValueSchema]),
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
 * controls at build time.
 */
export const rootFontSizeStepSchema = z.object({
  $value: z.union([z.string(), z.number(), dimensionValueSchema]).optional(),
  $type: z.literal('rootFontSize'),
  $description: z.string(),
  $extensions: tokenExtensionsSchema.optional(),
});

/**
 * Shape of a generated-scale step token.
 */
export interface RootFontSizeStepObject extends z.infer<typeof rootFontSizeStepSchema> {}

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
