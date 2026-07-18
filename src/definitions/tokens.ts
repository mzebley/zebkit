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
  'flex',
  'setting'
]);

export type AllowedTokenTypes = z.infer<typeof allowedTokenTypes>;

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
 * Everything zebkit-specific a token entry can carry, namespaced under the
 * `dev.zebkit` vendor key inside `$extensions`.
 * `a11y: true` opts into the default runtime modifier for the token's type;
 * a string names a custom modifier CSS variable.
 */
export const zebkitExtensionSchema = z.object({
  a11y: z.union([z.boolean(), z.string()]).optional(),
  font: zebkitFontExtensionSchema.optional(),
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
  $value: z.union([z.string(), z.number()]),
  $type: allowedTokenTypes,
  $description: z.string(),
  $extensions: tokenExtensionsSchema.optional(),
});

/**
 * Shape of an individual token entry.
 */
export interface TokenObject extends z.infer<typeof tokenObjectSchema> {}

/**
 * Build-time generator input (e.g. the fluid type-scale controls). Carries a value,
 * type, and description like any token, but is consumed during compilation and is
 * NOT emitted as a CSS custom property.
 */
export const settingTokenSchema = z.object({
  $value: z.union([z.string(), z.number()]),
  $type: z.literal('setting'),
  $description: z.string(),
});

/**
 * Shape of a build-time setting token.
 */
export interface SettingTokenObject extends z.infer<typeof settingTokenSchema> {}

/**
 * A named step in a generated scale (e.g. font sizes). `index` positions the step in
 * the fluid scale (base = 0); `$value` is present ONLY when a step is pinned to a static
 * literal (static mode or a per-step override). Fluid steps omit `$value` and are derived
 * from the scale's control settings at build time.
 */
export const rootFontSizeStepSchema = z.object({
  index: z.number().int(),
  $value: z.union([z.string(), z.number()]).optional(),
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
