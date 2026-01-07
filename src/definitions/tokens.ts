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