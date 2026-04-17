import path from 'path';
import type { TokenInterface } from '@definitions/tokens';
type ExtendedTokenBreakpoint =
  | 'tablet'
  | 'tablet-lg'
  | 'desktop'
  | 'desktop-lg'
  | 'widescreen';

const ZEBKIT_PREFIX = 'zbk';
const EXTENDED_TOKEN_BREAKPOINTS: ExtendedTokenBreakpoint[] = [
  'tablet',
  'tablet-lg',
  'desktop',
  'desktop-lg',
  'widescreen',
];

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

export function buildEnabledBreakpointsList(
  config: boolean | string[] | undefined
): ExtendedTokenBreakpoint[] | false | undefined {
  if (config === undefined || config === true) return undefined;
  if (config === false) return false;

  const invalidBreakpoints = config.filter(
    (breakpoint): breakpoint is string =>
      !EXTENDED_TOKEN_BREAKPOINTS.includes(
        breakpoint as ExtendedTokenBreakpoint
      )
  );

  if (invalidBreakpoints.length > 0) {
    throw new Error(
      `Invalid extendedTokens.breakpoints value(s): ${invalidBreakpoints.join(
        ', '
      )}. Expected one or more of: ${EXTENDED_TOKEN_BREAKPOINTS.join(', ')}.`
    );
  }

  return config as ExtendedTokenBreakpoint[];
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
