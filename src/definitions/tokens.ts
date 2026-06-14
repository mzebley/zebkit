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
 * Zod schema describing special Google font import tokens.
 */
export const googleFontTokenObjectSchema = z.object({
  value: z.union([z.string(), z.number()]),
  description: z.string(),
  variable: z.boolean(),
  weights: z.string().optional(),
  type: z.literal("googleFont")
});

/**
 * Shape of an individual token entry.
 */
export interface GoogleFontTokenObject extends z.infer<typeof googleFontTokenObjectSchema> {}

/**
 * Map of token keys to token entries.
 */
export interface GoogleFontTokenInterface {
  [key: string]: GoogleFontTokenObject;
}

export type GoogleFontTokenMap = Record<string, GoogleFontTokenInterface>;