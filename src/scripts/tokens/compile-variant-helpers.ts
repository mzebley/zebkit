import path from 'path';
import type { TokenInterface } from '@definitions/tokens';
import type { VariantConfig } from '@definitions/token-variants';
import type { ComponentsFilter } from '../components-config';
import { ZEBKIT_PREFIX } from '@config';

export interface VariantRuntimeEntryLike {
  component: string;
  name: string;
  className: string;
  overrides: Record<string, string>;
  /** Advisory composition axis (e.g. "style", "size"). */
  axis?: string;
  /** One-line summary surfaced in the registry, docs, and agent context. */
  description?: string;
  /**
   * Consumer-only escape hatch: extra CSS declarations / stylesheets attached
   * to the variant class. These bypass the token and a11y guarantees — the
   * build says so. Zebkit-shipped variants must be token-only (lint-enforced).
   */
  styles?: {
    inline?: string | string[];
    stylesheetPaths?: string[];
  };
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
  return /-variants$/i.test(baseName) || /\.variants?\./i.test(path.basename(filePath));
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

  const normalized: VariantRuntimeEntryLike = {
    component,
    name,
    className,
    overrides,
  };

  if (typeof entry.axis === 'string' && entry.axis.trim()) {
    normalized.axis = entry.axis.trim();
  }
  if (typeof entry.description === 'string' && entry.description.trim()) {
    normalized.description = entry.description.trim();
  }

  if (entry.styles && typeof entry.styles === 'object') {
    const inline =
      typeof entry.styles.inline === 'string' || Array.isArray(entry.styles.inline)
        ? entry.styles.inline
        : undefined;
    const stylesheetPaths = Array.isArray(entry.styles.stylesheetPaths)
      ? entry.styles.stylesheetPaths.filter((p: unknown) => typeof p === 'string')
      : undefined;
    if (inline || stylesheetPaths?.length) {
      normalized.styles = {
        ...(inline ? { inline } : {}),
        ...(stylesheetPaths?.length ? { stylesheetPaths } : {}),
      };
    }
  }

  return normalized;
}

export function mergeVariantOverrideEntry(
  entry: VariantRuntimeEntryLike,
  registry: VariantRegistryLike,
  tokens: Record<string, TokenInterface>,
  variantMetadata: Map<string, VariantMetadataEntry>,
  sourceLabel: string,
  /** Directory consumer stylesheetPaths resolve against (the override file's dir). */
  stylesheetBaseDir?: string
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
    ...(entry.axis ?? existing?.axis
      ? { axis: entry.axis ?? existing?.axis }
      : {}),
    ...(entry.description ?? existing?.description
      ? { description: entry.description ?? existing?.description }
      : {}),
  };

  // Consumer escape hatch: honored, but announced — these declarations leave
  // the token and a11y guarantees.
  const inlineStyles = entry.styles?.inline
    ? (Array.isArray(entry.styles.inline)
        ? entry.styles.inline
        : [entry.styles.inline]
      )
        .map((line) => line.trim())
        .filter(Boolean)
    : [];
  const stylesheetPaths = (entry.styles?.stylesheetPaths ?? []).map((sheet) =>
    path.isAbsolute(sheet)
      ? sheet
      : path.resolve(stylesheetBaseDir ?? process.cwd(), sheet)
  );

  if (inlineStyles.length > 0 || stylesheetPaths.length > 0) {
    console.warn(
      `Variant "${entry.component}.${entry.name}" uses the styles escape hatch — these declarations bypass zebkit's token and accessibility guarantees. Prefer token overrides; if the token surface can't express this, report the gap. Source: ${sourceLabel}`
    );
  }

  const metaKey = buildVariantMetaKey(entry.component, entry.name);
  const existingMeta = variantMetadata.get(metaKey);
  variantMetadata.set(metaKey, {
    component: entry.component,
    name: entry.name,
    className,
    inlineStyles: [...(existingMeta?.inlineStyles ?? []), ...inlineStyles],
    stylesheetPaths: [...(existingMeta?.stylesheetPaths ?? []), ...stylesheetPaths],
  });
}

export function buildVariantMetaKey(component: string, name: string): string {
  return `${component}::${name}`;
}

/**
 * Applies the `components` config to the shipped variant configs. Excluded
 * components drop silently (the config asked for the whole component to go);
 * allowlist misses are collected so consumer overrides that patch them can
 * warn with the fix. Allowlist names matching no shipped variant warn with the
 * shipped vocabulary — a typo would otherwise silently drop every variant.
 */
export function filterShippedVariants(
  configs: VariantConfig[],
  filter?: ComponentsFilter
): {
  activeConfigs: VariantConfig[];
  excludedShippedVariants: Map<string, Set<string>>;
} {
  const excludedShippedVariants = new Map<string, Set<string>>();
  if (!filter) return { activeConfigs: configs, excludedShippedVariants };

  const shippedNamesByComponent = new Map<string, string[]>();
  for (const config of configs) {
    if (!config.component || !config.name) continue;
    const component = config.component.toLowerCase();
    const names = shippedNamesByComponent.get(component) ?? [];
    names.push(config.name);
    shippedNamesByComponent.set(component, names);
  }

  for (const [component, allowlist] of filter.variantAllowlists) {
    const shipped = shippedNamesByComponent.get(component) ?? [];
    const shippedLower = new Set(shipped.map((name) => name.toLowerCase()));
    for (const allowed of allowlist) {
      if (!shippedLower.has(allowed)) {
        console.warn(
          `components.${component}.variants names unknown shipped variant "${allowed}". ` +
            `Shipped variants: ${shipped.length > 0 ? shipped.join(', ') : '(none)'}.`
        );
      }
    }
  }

  const activeConfigs = configs.filter((config) => {
    if (!config.component || !config.name) return true; // registerVariant warns
    const component = config.component.toLowerCase();
    const name = config.name.toLowerCase();
    if (filter.excluded.has(component)) return false;
    const allowlist = filter.variantAllowlists.get(component);
    if (allowlist && !allowlist.has(name)) {
      const dropped = excludedShippedVariants.get(component) ?? new Set<string>();
      dropped.add(name);
      excludedShippedVariants.set(component, dropped);
      return false;
    }
    return true;
  });

  return { activeConfigs, excludedShippedVariants };
}

/**
 * Build-failing lint: zebkit's own variants must be pure token remaps
 * (GRAMMAR.md §6). The styles escape hatch exists for consumers (variant JSON
 * overlays); a shipped variant that needs a CSS declaration is a component
 * token-surface gap.
 */
export function assertShippedVariantsAreTokenOnly(
  configs: Array<{
    component: string;
    name: string;
    overrides?: Partial<Record<string, string>>;
    styles?: { inline?: string | string[]; stylesheetPaths?: string[] };
  }>
): void {
  const violations = configs.filter((variant) => {
    const inline = variant.styles?.inline;
    const hasInline = Array.isArray(inline) ? inline.length > 0 : Boolean(inline);
    return hasInline || (variant.styles?.stylesheetPaths?.length ?? 0) > 0;
  });

  if (violations.length === 0) return;

  throw new Error(
    `Zebkit-shipped variants must be token-only (GRAMMAR.md §6) — a shipped variant that needs a CSS declaration is a component token-surface gap. Fix the token surface instead:\n${violations
      .map(
        (variant) =>
          `  - ${variant.component}.${variant.name} uses styles.${
            variant.styles?.inline ? 'inline' : 'stylesheetPaths'
          }`
      )
      .join('\n')}`
  );
}
