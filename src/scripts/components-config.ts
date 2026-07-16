// Resolves the top-level `components` config block into the filter the build
// pipeline consumes. Component vocabulary discovery lives in
// known-components.ts (it needs import.meta; this module stays jest-friendly).
//
// The filter applies at gather time — excluded components' styles, token
// modules, and variants never enter the compile. `tokens.prune` is the
// evidence-based counterpart that runs after; it can only ever remove more.

import chalk from 'chalk';
import type { ComponentsConfig } from './config';

export interface ComponentsFilter {
  /** Component names excluded from the build entirely. */
  excluded: ReadonlySet<string>;
  /**
   * Per-component shipped-variant allowlists (lowercased names). A component
   * absent from the map keeps all its shipped variants. Custom (consumer)
   * variants are never filtered by the allowlist.
   */
  variantAllowlists: ReadonlyMap<string, ReadonlySet<string>>;
}

/** The no-op filter: everything ships. */
export function includeAllComponents(): ComponentsFilter {
  return { excluded: new Set(), variantAllowlists: new Map() };
}

/** Resolves the config block into the sets/maps the pipeline consumes. */
export function resolveComponentsFilter(components?: ComponentsConfig): ComponentsFilter {
  const excluded = new Set<string>();
  const variantAllowlists = new Map<string, ReadonlySet<string>>();

  for (const [name, entry] of Object.entries(components ?? {})) {
    const component = name.trim().toLowerCase();
    if (!component) continue;
    if (entry === false) {
      excluded.add(component);
    } else if (entry !== true && Array.isArray(entry.variants)) {
      variantAllowlists.set(
        component,
        new Set(entry.variants.map((variant) => variant.trim().toLowerCase()))
      );
    }
  }

  return { excluded, variantAllowlists };
}

/**
 * Warns (never throws) for config entries naming components that don't exist,
 * listing the valid vocabulary — the config may predate or outlive a component.
 */
export function warnUnknownComponents(
  components: ComponentsConfig | undefined,
  knownComponents: string[]
): void {
  if (!components) return;
  const known = new Set(knownComponents.map((name) => name.toLowerCase()));
  for (const name of Object.keys(components)) {
    if (!known.has(name.trim().toLowerCase())) {
      console.warn(
        chalk.yellow(
          `components config names unknown component "${name}". Known components: ${knownComponents.join(
            ', '
          )}.`
        )
      );
    }
  }
}
