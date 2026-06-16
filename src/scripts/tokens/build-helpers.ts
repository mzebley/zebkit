import path from 'path';
import type { TokenInterface } from '@definitions/tokens';
import {
  EXTENDED_TOKEN_BREAKPOINTS,
  type ExtendedTokenBreakpoint,
} from '../config';

const ZEBKIT_PREFIX = 'zbk';

export function extractReferencedColorFamilies(
  tokens: Record<string, TokenInterface>
): Set<string> {
  const families = new Set<string>();
  const pattern = /\{color\.([a-z]+)-\d+\}/g;
  for (const tokenGroup of Object.values(tokens)) {
    if (!tokenGroup) continue;
    for (const token of Object.values(tokenGroup as Record<string, unknown>)) {
      const value = typeof (token as any)?.value === 'string' ? (token as any).value : '';
      for (const match of value.matchAll(pattern)) {
        families.add(match[1]);
      }
    }
  }
  return families;
}

/**
 * Normalize the `extendedTokens.breakpoints` config into the per-build selection.
 * Returns `undefined` for "all enabled", `false` for "none", or the validated
 * subset. `enabledKeys` is the set of breakpoints actually enabled in the token
 * module (token-disabled breakpoints are excluded), so naming one of them — or any
 * unknown key — is rejected. Defaults to the full shipped set for unit testing.
 */
export function buildEnabledBreakpointsList(
  config: boolean | string[] | undefined,
  enabledKeys: readonly string[] = EXTENDED_TOKEN_BREAKPOINTS
): string[] | false | undefined {
  if (config === undefined || config === true) return undefined;
  if (config === false) return false;

  const invalidBreakpoints = config.filter(
    (breakpoint): breakpoint is string => !enabledKeys.includes(breakpoint)
  );

  if (invalidBreakpoints.length > 0) {
    throw new Error(
      `Invalid extendedTokens.breakpoints value(s): ${invalidBreakpoints.join(
        ', '
      )}. Expected one or more of: ${enabledKeys.join(', ')}.`
    );
  }

  return config;
}

/**
 * Read the enabled breakpoints from the built token map, in token order.
 * A breakpoint whose `value` is `null` is disabled and excluded.
 */
export function readEnabledBreakpoints(
  tokens: Record<string, TokenInterface>
): Array<{ key: string; width: string }> {
  const group = tokens[`${ZEBKIT_PREFIX}-breakpoint`];
  if (!group) return [];
  const enabled: Array<{ key: string; width: string }> = [];
  for (const [key, entry] of Object.entries(group)) {
    const value = (entry as { value?: unknown })?.value;
    if (value == null) continue;
    enabled.push({ key, width: String(value) });
  }
  return enabled;
}

/**
 * Resolve the active breakpoint `key -> width` map for a build: the token-enabled
 * set, narrowed by the `extendedTokens.breakpoints` config filter, preserving token
 * order. An empty map means no responsive utilities compile. This map is injected
 * into SCSS as `$active-breakpoints`.
 */
export function resolveActiveBreakpointMap(
  tokens: Record<string, TokenInterface>,
  config: boolean | string[] | undefined
): Record<string, string> {
  const enabled = readEnabledBreakpoints(tokens);
  const enabledKeys = enabled.map((b) => b.key);
  const selection = buildEnabledBreakpointsList(config, enabledKeys);

  const activeKeys =
    selection === false
      ? []
      : selection === undefined
        ? enabledKeys
        : enabledKeys.filter((key) => selection.includes(key));

  const widthByKey = new Map(enabled.map((b) => [b.key, b.width]));
  const map: Record<string, string> = {};
  for (const key of activeKeys) {
    const width = widthByKey.get(key);
    if (width !== undefined) map[key] = width;
  }
  return map;
}

export function resolveLookupOutputPath(
  configuredPath: string | undefined,
  destinationPath: string
): string {
  if (configuredPath) {
    return path.isAbsolute(configuredPath)
      ? configuredPath
      : path.resolve(process.cwd(), configuredPath);
  }
  return path.join(destinationPath, 'token-lookup.json');
}

export function buildTokenLookup(
  tokens: Record<string, TokenInterface>
): Record<string, string> {
  const lookup: Record<string, string> = {};
  const prefix = `${ZEBKIT_PREFIX}-`;

  for (const [tokenKey, tokenProperties] of Object.entries(tokens)) {
    const moduleName = tokenKey.startsWith(prefix)
      ? tokenKey.slice(prefix.length)
      : tokenKey;

    if (!tokenProperties) continue;

    for (const propertyKey of Object.keys(tokenProperties)) {
      const cssVar = `--${[tokenKey, propertyKey].filter(Boolean).join('-')}`;
      const reference = `${moduleName}.${propertyKey}`;
      lookup[reference] = cssVar;
      lookup[`{${reference}}`] = cssVar;
    }
  }

  return lookup;
}

export function slugifyFileSegment(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/-+/g, '-');
}
