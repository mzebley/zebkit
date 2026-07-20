import path from 'path';
import chalk from 'chalk';
import { z, ZodSchema } from 'zod';
import type { TokenGroupExtensions, TokenInterface, ZebkitExtension } from '@definitions/tokens';
import {
  groupScale,
  tokenFontMeta,
  tokenGroupExtensionsSchema,
  tokenObjectSchema,
  zbkExtension,
} from '@definitions/tokens';
import { ZEBKIT_EXTENSION_KEY } from '@definitions/dtcg';
import { ZEBKIT_PREFIX } from '@config';

export { isVariantOverrideFile } from './compile-variant-helpers';

const CANONICAL_TOKEN_OVERRIDE_FILE = /^(zbk-[a-z0-9-]+)\.tokens\.json$/;

export function validateTokenExport(tokenExport: unknown, schema: ZodSchema): string[] {
  try {
    schema.parse(tokenExport);
    return [];
  } catch (error) {
    if (error instanceof z.ZodError) {
      return error.issues.map((issue) => `${issue.path.join('.') || '(root)'} → ${issue.message}`);
    }
    return [`(root) → ${error instanceof Error ? error.message : String(error)}`];
  }
}

export function inferTokenKeyFromFilename(filePath: string): string | undefined {
  return path.basename(filePath).match(CANONICAL_TOKEN_OVERRIDE_FILE)?.[1];
}

export function isCanonicalTokenOverrideFile(filePath: string): boolean {
  return CANONICAL_TOKEN_OVERRIDE_FILE.test(path.basename(filePath));
}

/**
 * Merges a group-level `$extensions` block (module `extensions` export, snapshot
 * JSON member, or override document member) into the collected map. Scale
 * controls merge key-by-key; overridden control names are recorded into
 * `touched` so the overlay emission closure treats them as consumed build-time
 * controls and re-emits the modules they shape.
 */
export function mergeGroupExtensions(
  moduleKey: string,
  extensions: unknown,
  groupExtensions: Record<string, TokenGroupExtensions>,
  touched?: Record<string, Set<string>>
): void {
  const parsed = tokenGroupExtensionsSchema.safeParse(extensions);
  if (!parsed.success) {
    console.warn(
      chalk.yellow(`Group $extensions for '${moduleKey}' are invalid. Ignoring.`)
    );
    return;
  }
  const overrideScale = groupScale(parsed.data);
  if (!overrideScale || Object.keys(overrideScale).length === 0) return;

  const existingScale = groupScale(groupExtensions[moduleKey]) ?? {};
  groupExtensions[moduleKey] = {
    [ZEBKIT_EXTENSION_KEY]: {
      ...groupExtensions[moduleKey]?.[ZEBKIT_EXTENSION_KEY],
      scale: { ...existingScale, ...overrideScale },
    },
  };

  if (touched) {
    const keyTouched = (touched[moduleKey] ??= new Set<string>());
    for (const control of Object.keys(overrideScale)) keyTouched.add(control);
  }
}

export function mergeOverrideObject(
  overrideData: Record<string, any>,
  tokens: Record<string, TokenInterface>,
  tokenSchemas: Record<string, ZodSchema>,
  touched?: Record<string, Set<string>>,
  /** Module keys (e.g. `zbk-accordion`) removed by the components config. */
  excludedModuleKeys?: ReadonlySet<string>
) {
  const validKeys = Object.keys(tokens);
  for (const key of Object.keys(overrideData)) {
    if (!validKeys.includes(key)) {
      if (excludedModuleKeys?.has(key)) {
        console.warn(
          `Custom tokens target '${key}', which is excluded by the components config. ` +
            `Remove the override or re-include the component.`
        );
      } else {
        console.warn(`Custom tokens contain an unrecognized key '${key}'. Skipping.`);
      }
      continue;
    }

    const tokenSchema = tokenSchemas[key];
    const keyTouched = touched ? (touched[key] ??= new Set<string>()) : undefined;

    try {
      const mergedTokens = mergeTokens(tokens[key], overrideData[key], tokenSchema, key, keyTouched);
      tokens[key] = mergedTokens;
    } catch {
      console.warn(`Custom tokens for '${key}' are invalid. Using default tokens.`);
    }
  }
}

export function mergeTokens(
  defaultTokens: TokenInterface,
  customTokens: Record<string, any>,
  schema: ZodSchema | undefined,
  keyPath: string,
  touched?: Set<string>
): TokenInterface {
  const merged: TokenInterface = { ...defaultTokens };

  for (const key in customTokens) {
    if (!Object.prototype.hasOwnProperty.call(customTokens, key)) continue;

    if (!defaultTokens.hasOwnProperty(key)) {
      console.warn(`Extra key '${keyPath}.${key}' not found in default tokens. Ignoring.`);
      continue;
    }

    const customValue = customTokens[key];
    // Exact-key rejection only applies to modules with a bespoke ZodObject
    // schema (breakpoint, type-scale, font-family); the generic record schema
    // and the entry-must-exist-in-defaults check above are the closed-world
    // guards for every other module (Phase 3 schema consolidation).
    const subSchema = schema instanceof z.ZodObject ? schema.shape[key] : undefined;
    if (schema instanceof z.ZodObject && !subSchema) {
      console.warn(`Invalid key '${keyPath}.${key}' not defined in schema. Ignoring.`);
      continue;
    }

    try {
      // Bare-`$value` shorthand: an override entry may be the value itself
      // (`"key": "1rem"`) or a full entry object (`"key": { "$value": … }`).
      // The value may be any DTCG shape — a string/number, a structured
      // dimension/color/shadow/duration/bezier object, or a shadow array.
      const overrideValue =
        typeof customValue === 'object' &&
        customValue !== null &&
        !Array.isArray(customValue) &&
        '$value' in customValue
          ? (customValue as Record<string, any>).$value
          : customValue;

      const nextToken = {
        ...defaultTokens[key],
        $value: overrideValue,
      };

      // Allow overrides to carry font metadata (`$extensions["dev.zebkit"].font`). A theme may
      // swap to a family whose loading differs from the base font's (a different `source`,
      // weight axis, fallback category, or self-hosted `faces`), and the emitted
      // import/@font-face must follow the override, not the base. Field-level merge into the
      // base metadata; `$type` and `a11y` stay base-controlled. The schema parse below
      // validates the result.
      const overrideFont = tokenFontMeta(customValue);
      if (overrideFont) {
        const baseExtension: ZebkitExtension = zbkExtension(defaultTokens[key]) ?? {};
        (nextToken as Record<string, unknown>).$extensions = {
          [ZEBKIT_EXTENSION_KEY]: {
            ...baseExtension,
            font: { ...baseExtension.font, ...overrideFont },
          },
        };
      }

      // Validate the merged entry: the module's bespoke subschema when it has
      // one, otherwise the generic DTCG entry schema (which accepts every
      // structured `$value`). A parse failure falls through to the default below.
      (subSchema ?? tokenObjectSchema).parse(nextToken);
      merged[key] = nextToken;
      touched?.add(key);
    } catch {
      console.warn(`Invalid value for '${keyPath}.${key}'. Using default value.`);
      merged[key] = defaultTokens[key];
    }
  }

  return merged;
}

export function buildFilePayload(
  format: string,
  basePath: string,
  payload: unknown
): { filePath: string; fileContent: string } {
  switch (format) {
    case 'json':
      return {
        filePath: `${basePath}.json`,
        fileContent: JSON.stringify(payload, null, 2),
      };
    case 'typescript':
      return {
        filePath: `${basePath}.ts`,
        fileContent: `export default ${JSON.stringify(payload, null, 2)};\n`,
      };
    case 'javascript':
      return {
        filePath: `${basePath}.js`,
        fileContent: `module.exports = ${JSON.stringify(payload, null, 2)};\n`,
      };
    default:
      throw new Error(`Unsupported format: ${format}`);
  }
}
