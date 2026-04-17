import path from 'path';
import type { TokenInterface } from '@definitions/tokens';
import { ZEBKIT_PREFIX } from '@config';

export interface VariantRuntimeEntryLike {
  component: string;
  name: string;
  className: string;
  overrides: Record<string, string>;
}

export interface VariantRegistryLike {
  [component: string]: {
    [variantName: string]: VariantRuntimeEntryLike;
  };
}

export interface VariantMetadataEntry {
  component: string;
  name: string;
  className: string;
  inlineStyles: string[];
  stylesheetPaths: string[];
}

export function isVariantOverrideFile(filePath: string): boolean {
  const baseName = path.basename(filePath, path.extname(filePath));
  return /-variants$/i.test(baseName) || /\.variant\./i.test(path.basename(filePath));
}

export function extractVariantOverrideEntries(data: any): VariantRuntimeEntryLike[] {
  if (!data) return [];

  if (Array.isArray(data)) {
    return data
      .map((entry) => normalizeVariantOverrideEntry(entry))
      .filter(Boolean) as VariantRuntimeEntryLike[];
  }

  if (typeof data === 'object') {
    if ('component' in data && 'name' in data) {
      const entry = normalizeVariantOverrideEntry(data);
      return entry ? [entry] : [];
    }

    const entries: VariantRuntimeEntryLike[] = [];
    for (const [componentKey, variants] of Object.entries(data)) {
      if (!variants || typeof variants !== 'object') continue;

      if (Array.isArray(variants)) {
        for (const variant of variants) {
          const normalized = normalizeVariantOverrideEntry(variant, componentKey);
          if (normalized) entries.push(normalized);
        }
      } else {
        for (const [variantName, variantData] of Object.entries(variants as Record<string, any>)) {
          const normalized = normalizeVariantOverrideEntry(variantData, componentKey, variantName);
          if (normalized) entries.push(normalized);
        }
      }
    }
    return entries;
  }

  return [];
}

export function normalizeVariantOverrideEntry(
  entry: any,
  fallbackComponent?: string,
  fallbackName?: string
): VariantRuntimeEntryLike | undefined {
  if (!entry || typeof entry !== 'object') return undefined;

  const component =
    typeof entry.component === 'string' && entry.component.trim().length > 0
      ? entry.component.trim()
      : fallbackComponent;

  const name =
    typeof entry.name === 'string' && entry.name.trim().length > 0
      ? entry.name.trim()
      : fallbackName;

  if (!component || !name) return undefined;

  const overridesInput =
    entry.overrides && typeof entry.overrides === 'object' ? entry.overrides : {};

  const overrides: Record<string, string> = {};
  for (const [key, value] of Object.entries(overridesInput)) {
    if (typeof value === 'string') {
      overrides[key] = value;
    }
  }

  const className =
    typeof entry.className === 'string' && entry.className.trim().length > 0
      ? entry.className.trim()
      : `${ZEBKIT_PREFIX}-${component}--${name}`;

  return {
    component,
    name,
    className,
    overrides,
  };
}

export function mergeVariantOverrideEntry(
  entry: VariantRuntimeEntryLike,
  registry: VariantRegistryLike,
  tokens: Record<string, TokenInterface>,
  variantMetadata: Map<string, VariantMetadataEntry>,
  sourceLabel: string
) {
  const tokenKey = `${ZEBKIT_PREFIX}-${entry.component}`;
  const sourceTokens = tokens[tokenKey];
  if (!sourceTokens) {
    console.warn(
      `Variant override '${entry.component}.${entry.name}' references unknown component tokens. Source: ${sourceLabel}`
    );
    return;
  }

  const sanitizedOverrides: Record<string, string> = {};
  for (const [key, value] of Object.entries(entry.overrides || {})) {
    if (!Object.prototype.hasOwnProperty.call(sourceTokens, key)) {
      console.warn(
        `Variant override '${entry.component}.${entry.name}' references unknown token '${key}'. Source: ${sourceLabel}`
      );
      continue;
    }
    sanitizedOverrides[key] = value;
  }

  const componentRegistry = registry[entry.component] ?? {};
  const existing = componentRegistry[entry.name];

  const className =
    entry.className ||
    existing?.className ||
    `${ZEBKIT_PREFIX}-${entry.component}--${entry.name}`;

  registry[entry.component] = componentRegistry;
  componentRegistry[entry.name] = {
    component: entry.component,
    name: entry.name,
    className,
    overrides: {
      ...(existing?.overrides ?? {}),
      ...sanitizedOverrides,
    },
  };

  const metaKey = buildVariantMetaKey(entry.component, entry.name);
  const existingMeta = variantMetadata.get(metaKey);
  variantMetadata.set(metaKey, {
    component: entry.component,
    name: entry.name,
    className,
    inlineStyles: existingMeta?.inlineStyles ?? [],
    stylesheetPaths: existingMeta?.stylesheetPaths ?? [],
  });
}

export function buildVariantMetaKey(component: string, name: string): string {
  return `${component}::${name}`;
}
