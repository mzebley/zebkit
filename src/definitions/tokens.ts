import { z } from 'zod';

/**
 * Shared token typing used across Zebkit token builders and validators.
 * Token modules should default-export an object that matches {@link TokenInterface}.
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
 * Zod schema describing a single token entry.
 */
export const tokenObjectSchema = z.object({
  value: z.union([z.string(), z.number()]),
  type: allowedTokenTypes,
  description: z.string(),
  a11y: z.union([z.boolean(), z.string()]).optional(),
  additional: z.union([z.string(), z.number(), z.boolean()]).optional()
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
  value: z.union([z.string(), z.number()]),
  type: z.literal('setting'),
  description: z.string(),
});

/**
 * Shape of a build-time setting token.
 */
export interface SettingTokenObject extends z.infer<typeof settingTokenSchema> {}

/**
 * A named step in a generated scale (e.g. font sizes). `index` positions the step in
 * the fluid scale (base = 0); `value` is present ONLY when a step is pinned to a static
 * literal (static mode or a per-step override). Fluid steps omit `value` and are derived
 * from the scale's control settings at build time.
 */
export const rootFontSizeStepSchema = z.object({
  index: z.number().int(),
  value: z.union([z.string(), z.number()]).optional(),
  type: z.literal('rootFontSize'),
  description: z.string(),
  a11y: z.union([z.boolean(), z.string()]).optional(),
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
 * Unified font-family token. One `type` (`"fontFamily"`) for every font token, discriminated
 * by `source`. `weights` is an array for a static list (`[400, 700]`) or a range string for a
 * variable font (`"200..800"`); `styles` opts into italic. `faces` is used only by local fonts.
 */
export const fontFamilyTokenObjectSchema = z.object({
  value: z.union([z.string(), z.number()]),
  type: z.literal("fontFamily"),
  description: z.string(),
  source: fontSourceSchema.optional(),
  fallback: fontFallbackSchema.optional(),
  weights: z.union([z.string(), z.array(z.union([z.string(), z.number()]))]).optional(),
  styles: z.array(z.enum(["normal", "italic"])).optional(),
  faces: z.array(fontFaceSchema).optional(),
  display: z.enum(["auto", "block", "swap", "fallback", "optional"]).optional(),
  a11y: z.union([z.boolean(), z.string()]).optional(),
});
export type FontFamilyTokenObject = z.infer<typeof fontFamilyTokenObjectSchema>;