import path from 'path';
import { isDeepStrictEqual } from 'node:util';
import chalk from 'chalk';
import { z, ZodSchema } from 'zod';
import type {
  AllowedTokenTypes,
  TokenGroupExtensions,
  TokenInterface,
  TokenObject,
} from '@definitions/tokens';
import {
  groupScale,
  tokenGroupExtensionsSchema,
  tokenObjectSchema,
  isWholeValueAlias,
} from '@definitions/tokens';
import { ZEBKIT_EXTENSION_KEY } from '@definitions/dtcg';
import { areTokensTypesCompatible } from '@definitions/token-maps';
import { ZEBKIT_PREFIX } from '@config';
import { assertRawTokenValueNormalizable } from './dtcg-document';

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
    throw new Error(
      `Invalid group $extensions for '${moduleKey}':\n${parsed.error.issues
        .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
        .join('\n')}`
    );
  }
  const existing = groupExtensions[moduleKey] ?? {};
  const existingVendor = existing[ZEBKIT_EXTENSION_KEY] ?? {};
  const overrideVendor = parsed.data[ZEBKIT_EXTENSION_KEY] ?? {};
  const overrideScale = groupScale(parsed.data);
  const existingScale = groupScale(existing);
  const mergedVendor = { ...existingVendor, ...overrideVendor };

  if (existingScale || overrideScale) {
    mergedVendor.scale = { ...existingScale, ...overrideScale };
  }

  groupExtensions[moduleKey] = {
    ...existing,
    ...parsed.data,
    [ZEBKIT_EXTENSION_KEY]: mergedVendor,
  };

  if (touched) {
    const keyTouched = (touched[moduleKey] ??= new Set<string>());
    for (const control of Object.keys(overrideScale ?? {})) keyTouched.add(control);
  }
}

export function mergeOverrideObject(
  overrideData: Record<string, any>,
  tokens: Record<string, TokenInterface>,
  tokenSchemas: Record<string, ZodSchema>,
  touched?: Record<string, Set<string>>,
  /** Module keys (e.g. `zbk-accordion`) removed by the components config. */
  excludedModuleKeys?: ReadonlySet<string>,
  /** External snapshots use this to avoid re-emitting unchanged generated palette entries. */
  touchOnlyChanged = false
) {
  const validKeys = Object.keys(tokens);
  const errors: string[] = [];
  for (const key of Object.keys(overrideData)) {
    if (!validKeys.includes(key)) {
      if (excludedModuleKeys?.has(key)) {
        console.warn(
          `Custom tokens target '${key}', which is excluded by the components config. ` +
            `Remove the override or re-include the component.`
        );
      } else {
        errors.push(`Custom tokens contain an unrecognized module '${key}'.`);
      }
      continue;
    }

    const tokenSchema = tokenSchemas[key];
    const keyTouched = touched ? (touched[key] ??= new Set<string>()) : undefined;

    try {
      const mergedTokens = mergeTokens(
        tokens[key],
        overrideData[key],
        tokenSchema,
        key,
        keyTouched,
        touchOnlyChanged
      );
      tokens[key] = mergedTokens;
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  if (errors.length > 0) {
    throw new Error(`Invalid token overrides:\n${errors.map((error) => `  - ${error}`).join('\n')}`);
  }
}

function isRecord(value: unknown): value is Record<string, any> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function mergeObjectFields(
  base: Record<string, unknown> | undefined,
  override: Record<string, unknown> | undefined
): Record<string, unknown> | undefined {
  if (!base && !override) return undefined;
  return { ...base, ...override };
}

/**
 * Merge token metadata while removing runtime/export provenance that no longer
 * describes a newly-authored value. Unknown vendor namespaces are retained.
 */
function mergeTokenExtensions(
  baseToken: Record<string, any>,
  overrideToken: Record<string, any> | undefined,
  overrideValue: unknown
): Record<string, unknown> | undefined {
  const baseExtensions = isRecord(baseToken.$extensions) ? baseToken.$extensions : undefined;
  const overrideExtensions = isRecord(overrideToken?.$extensions)
    ? overrideToken.$extensions
    : undefined;
  if (!baseExtensions && !overrideExtensions && overrideValue !== '') return undefined;

  const merged: Record<string, unknown> = { ...baseExtensions, ...overrideExtensions };
  const baseVendor = isRecord(baseExtensions?.[ZEBKIT_EXTENSION_KEY])
    ? { ...baseExtensions[ZEBKIT_EXTENSION_KEY] }
    : {};
  const overrideVendor = isRecord(overrideExtensions?.[ZEBKIT_EXTENSION_KEY])
    ? overrideExtensions[ZEBKIT_EXTENSION_KEY]
    : {};

  delete baseVendor.emptyColorPlaceholder;
  delete baseVendor.rawCssValue;
  delete baseVendor.originalType;
  if (isRecord(baseVendor.scale)) {
    const { valueSource: _valueSource, ...scale } = baseVendor.scale;
    baseVendor.scale = scale;
  }

  const vendor: Record<string, unknown> = { ...baseVendor, ...overrideVendor };
  for (const key of ['font', 'scale']) {
    const value = mergeObjectFields(
      isRecord(baseVendor[key]) ? baseVendor[key] : undefined,
      isRecord(overrideVendor[key]) ? overrideVendor[key] : undefined
    );
    if (value) vendor[key] = value;
  }
  if (overrideVendor.a11y === true && typeof baseVendor.a11y === 'string') {
    vendor.a11y = baseVendor.a11y;
  }

  // An empty semantic color is the only value for which this marker is valid.
  // Conversely, an explicit empty override must carry the marker so the normal
  // color registry cannot mistake an arbitrary empty string for a color.
  if (baseToken.$type === 'color' && overrideValue === '') vendor.emptyColorPlaceholder = true;
  else delete vendor.emptyColorPlaceholder;

  if (Object.keys(vendor).length > 0) merged[ZEBKIT_EXTENSION_KEY] = vendor;
  else delete merged[ZEBKIT_EXTENSION_KEY];
  return Object.keys(merged).length > 0 ? merged : undefined;
}

function validateMergedToken(
  token: Record<string, any>,
  schema: ZodSchema
): void {
  const rawDtcgTypes = new Set(['color', 'dimension', 'duration', 'cubicBezier', 'shadow']);
  if (
    rawDtcgTypes.has(token.$type) &&
    typeof token.$value === 'string' &&
    !isWholeValueAlias(token.$value)
  ) {
    // Raw authoring is allowed only when the canonical DTCG exporter knows how
    // to normalize this token type. Unsupported raw values fail here rather
    // than being warned away and replaced with a default.
    const normalized = assertRawTokenValueNormalizable(
      token as TokenObject,
      'override value'
    );
    if (schema.safeParse(token).success) return;
    // Validate the merged metadata and module-specific constraints with the
    // canonical structured value substituted for the legacy raw string.
    // A legacy dimension that cannot be represented by the spec (`em`, `%`,
    // `none`, `calc()`) exports as Zebkit's `cssDimension` extension type. Its
    // base module schema necessarily still expects `dimension`, so validate the
    // complete normalized token against the shared registry in that case.
    if (normalized.$type !== token.$type) tokenObjectSchema.parse(normalized);
    else schema.parse(normalized);
    return;
  }
  schema.parse(token);
}

export function mergeTokens(
  defaultTokens: TokenInterface,
  customTokens: Record<string, any>,
  schema: ZodSchema | undefined,
  keyPath: string,
  touched?: Set<string>,
  touchOnlyChanged = false
): TokenInterface {
  const merged: TokenInterface = { ...defaultTokens };
  const errors: string[] = [];

  for (const key in customTokens) {
    if (!Object.prototype.hasOwnProperty.call(customTokens, key)) continue;

    if (!defaultTokens.hasOwnProperty(key)) {
      errors.push(`Extra token '${keyPath}.${key}' is not defined by the base module.`);
      continue;
    }

    const customValue = customTokens[key];
    // Exact-key rejection only applies to modules with a bespoke ZodObject
    // schema (breakpoint, type-scale, font-family); the generic record schema
    // and the entry-must-exist-in-defaults check above are the closed-world
    // guards for every other module (Phase 3 schema consolidation).
    const subSchema = schema instanceof z.ZodObject ? schema.shape[key] : undefined;
    if (schema instanceof z.ZodObject && !subSchema) {
      errors.push(`Token '${keyPath}.${key}' is not defined by the module schema.`);
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

      const overrideToken = isRecord(customValue) && '$value' in customValue
        ? customValue
        : undefined;
      const baseToken = defaultTokens[key] as Record<string, any>;
      const explicitType = overrideToken?.$type;
      if (
        explicitType !== undefined &&
        (typeof explicitType !== 'string' ||
          !areTokensTypesCompatible(
            baseToken.$type as AllowedTokenTypes,
            explicitType as AllowedTokenTypes
          ))
      ) {
        throw new Error(
          `explicit $type '${String(explicitType)}' is incompatible with base type '${baseToken.$type}'`
        );
      }

      const nextToken: Record<string, any> = {
        ...baseToken,
        $value: overrideValue,
        $type: baseToken.$type,
      };

      if (overrideToken && Object.prototype.hasOwnProperty.call(overrideToken, '$description')) {
        nextToken.$description = overrideToken.$description;
      }
      if (overrideToken && Object.prototype.hasOwnProperty.call(overrideToken, '$deprecated')) {
        nextToken.$deprecated = overrideToken.$deprecated;
      }
      nextToken.$extensions = mergeTokenExtensions(baseToken, overrideToken, overrideValue);
      if (!nextToken.$extensions) delete nextToken.$extensions;

      validateMergedToken(nextToken, subSchema ?? tokenObjectSchema);
      merged[key] = nextToken as TokenInterface[string];
      if (!touchOnlyChanged || !isDeepStrictEqual(nextToken, baseToken)) touched?.add(key);
    } catch (error) {
      errors.push(
        `${keyPath}.${key}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  if (errors.length > 0) throw new Error(errors.join('\n'));

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
