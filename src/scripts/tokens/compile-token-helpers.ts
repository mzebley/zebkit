import path from 'path';
import { z, ZodSchema } from 'zod';
import type { TokenInterface } from '@definitions/tokens';
import { ZEBKIT_PREFIX } from '@config';

export function inferTokenKeyFromFilename(filePath: string): string | undefined {
  const baseName = path.basename(filePath, path.extname(filePath));
  if (!baseName) return undefined;

  const knownSuffixes = ['.tokens'];
  let normalized = baseName;

  for (const suffix of knownSuffixes) {
    if (normalized.endsWith(suffix)) {
      normalized = normalized.slice(0, -suffix.length);
      break;
    }
  }

  if (!normalized) return undefined;

  return normalized.startsWith(`${ZEBKIT_PREFIX}-`)
    ? normalized
    : `${ZEBKIT_PREFIX}-${normalized}`;
}

export function isVariantOverrideFile(filePath: string): boolean {
  const baseName = path.basename(filePath, path.extname(filePath));
  return /-variants$/i.test(baseName) || /\.variant\./i.test(path.basename(filePath));
}

export function mergeOverrideObject(
  overrideData: Record<string, any>,
  tokens: Record<string, TokenInterface>,
  tokenSchemas: Record<string, ZodSchema>
) {
  const validKeys = Object.keys(tokens);
  for (const key of Object.keys(overrideData)) {
    if (!validKeys.includes(key)) {
      console.warn(`Custom tokens contain an unrecognized key '${key}'. Skipping.`);
      continue;
    }

    const tokenSchema = tokenSchemas[key];

    try {
      const mergedTokens = mergeTokens(tokens[key], overrideData[key], tokenSchema, key);
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
  keyPath: string
): TokenInterface {
  const merged: TokenInterface = { ...defaultTokens };

  for (const key in customTokens) {
    if (!Object.prototype.hasOwnProperty.call(customTokens, key)) continue;

    if (!defaultTokens.hasOwnProperty(key)) {
      console.warn(`Extra key '${keyPath}.${key}' not found in default tokens. Ignoring.`);
      continue;
    }

    const customValue = customTokens[key];
    const subSchema = schema instanceof z.ZodObject ? schema.shape[key] : undefined;
    if (schema && !subSchema) {
      console.warn(`Invalid key '${keyPath}.${key}' not defined in schema. Ignoring.`);
      continue;
    }

    try {
      const overrideValue =
        typeof customValue === 'object' &&
        customValue !== null &&
        !Array.isArray(customValue) &&
        'value' in customValue
          ? (customValue as Record<string, any>).value
          : customValue;

      if (typeof overrideValue !== 'string' && typeof overrideValue !== 'number') {
        console.warn(
          `Custom token for '${keyPath}.${key}' does not contain a valid 'value'. Using default token.`
        );
        continue;
      }

      const nextToken = {
        ...defaultTokens[key],
        value: overrideValue,
      };

      // Allow overrides to carry font metadata. A theme may swap to a family whose loading
      // differs from the base font's (a different `source`, weight axis, fallback category, or
      // self-hosted `faces`), and the emitted import/@font-face must follow the override, not the
      // base. Type and a11y stay base-controlled. The schema parse below validates the result.
      if (
        typeof customValue === 'object' &&
        customValue !== null &&
        !Array.isArray(customValue)
      ) {
        const meta = customValue as Record<string, unknown>;
        for (const field of ['source', 'fallback', 'weights', 'styles', 'faces', 'display']) {
          if (field in meta) (nextToken as Record<string, unknown>)[field] = meta[field];
        }
      }

      if (subSchema) {
        (subSchema as ZodSchema).parse(nextToken);
      }
      merged[key] = nextToken;
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
