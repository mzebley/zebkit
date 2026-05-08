import { AllowedTokenTypes, TokenInterface } from '@definitions/tokens';
import { LayerName } from '@definitions/layers';
import {
  DtcgRoot,
  DtcgGroup,
  DtcgTokenType,
  DtcgTokenValue,
  DtcgMetadata,
} from '../types.js';

// ─── Type mapping ─────────────────────────────────────────────────────────────

const ZEBKIT_TO_DTCG: Partial<Record<AllowedTokenTypes, DtcgTokenType>> = {
  color: 'color',
  borderColor: 'color',
  spacing: 'dimension',
  sizing: 'dimension',
  dimension: 'dimension',
  rootSize: 'dimension',
  rootFontSize: 'dimension',
  fontSize: 'dimension',
  lineHeight: 'dimension',
  letterSpacing: 'dimension',
  borderRadius: 'dimension',
  borderWidth: 'strokeWidth',
  fontWeight: 'fontWeight',
  fontFamily: 'fontFamily',
  opacity: 'opacity',
  boxShadow: 'shadow',
  zIndex: 'number',
  fontStyle: 'string',
  textDecoration: 'string',
  textTransform: 'string',
  textAlignment: 'string',
  display: 'string',
  content: 'string',
  flex: 'string',
  borderStyle: 'string',
  transition: 'string',
  boolean: 'string',
  // skip: utility, setting, googleFont, asset
};

const SKIP_TYPES = new Set<AllowedTokenTypes>(['utility', 'setting', 'asset']);

// ─── Dependency ordering ──────────────────────────────────────────────────────

/**
 * Returns an ordered list of module keys so that a module's dependencies
 * (modules it references with {module.key} syntax) always appear before it.
 * Modules with no outgoing references are placed first.
 */
function topoSort(tokens: Record<string, TokenInterface>): string[] {
  const moduleKeys = Object.keys(tokens);

  // Build an adjacency set: for each module, which other modules does it reference?
  const deps = new Map<string, Set<string>>();
  for (const [moduleKey, tokenMap] of Object.entries(tokens)) {
    const bare = stripPrefix(moduleKey);
    const referenced = new Set<string>();
    for (const token of Object.values(tokenMap)) {
      if (typeof token.value === 'string') {
        // Match {module.key} patterns; module part is everything before the first dot
        for (const m of token.value.matchAll(/\{([^.}]+)\.[^}]+\}/g)) {
          const ref = m[1];
          // Only add references to modules that actually exist in our set
          if (ref !== bare && moduleKeys.some((k) => stripPrefix(k) === ref)) {
            referenced.add(ref);
          }
        }
      }
    }
    deps.set(bare, referenced);
  }

  const visited = new Set<string>();
  const order: string[] = [];

  function visit(key: string) {
    if (visited.has(key)) return;
    visited.add(key);
    for (const dep of deps.get(key) ?? []) {
      visit(dep);
    }
    order.push(key);
  }

  for (const moduleKey of moduleKeys) {
    visit(stripPrefix(moduleKey));
  }

  return order;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Strip the "zbk-" prefix from a module key. */
function stripPrefix(key: string): string {
  return key.startsWith('zbk-') ? key.slice(4) : key;
}

/**
 * Converts a single Zebkit token to a DTCG token object.
 * Returns undefined for types that should be skipped.
 */
function convertToken(
  key: string,
  token: { value: string | number; type: string; description: string; a11y?: boolean | string },
  extraSkipTypes?: Set<string>
): DtcgTokenValue | undefined {
  const type = token.type as AllowedTokenTypes;

  if (SKIP_TYPES.has(type) || extraSkipTypes?.has(type)) return undefined;

  const dtcgType = ZEBKIT_TO_DTCG[type];
  if (!dtcgType) return undefined;

  const result: DtcgTokenValue = {
    $value: token.value,
    $type: dtcgType,
  };

  if (token.description) result.$description = token.description;

  // Store the original Zebkit type and a11y flag in $extensions so pull can
  // reconstruct the exact Zebkit type (e.g., distinguish rootSize from dimension).
  const ext: { type: string; a11y?: boolean | string } = { type };
  if (token.a11y !== undefined) ext.a11y = token.a11y;
  result.$extensions = { zebkit: ext };

  return result;
}

// ─── Main transform ───────────────────────────────────────────────────────────

export interface ZebkitToDtcgOptions {
  /** Additional Zebkit token types to skip beyond the built-in skip list. */
  skipTypes?: string[];
}

/**
 * Converts a compiled Zebkit token map to a W3C DTCG JSON document.
 *
 * Module keys are stripped of the "zbk-" prefix so that existing alias
 * references like `{color.butterfield-50}` remain valid in the DTCG output
 * without any string transformation.
 *
 * Groups are ordered via topological sort so that referenced modules appear
 * before the modules that depend on them, satisfying Penpot's resolution order.
 */
export function zebkitToDtcg(
  tokens: Record<string, TokenInterface>,
  _layers: Record<string, LayerName>,
  options: ZebkitToDtcgOptions = {}
): DtcgRoot {
  const extraSkip = new Set<string>(options.skipTypes ?? []);
  const sortedKeys = topoSort(tokens);

  const groups: Record<string, DtcgGroup> = {};

  for (const bareKey of sortedKeys) {
    const moduleKey = Object.keys(tokens).find((k) => stripPrefix(k) === bareKey);
    if (!moduleKey) continue;

    const tokenMap = tokens[moduleKey];
    const group: DtcgGroup = {};

    for (const [tokenKey, token] of Object.entries(tokenMap)) {
      const dtcg = convertToken(tokenKey, token, extraSkip);
      if (dtcg) {
        group[tokenKey] = dtcg;
      }
    }

    if (Object.keys(group).length > 0) {
      groups[bareKey] = group;
    }
  }

  const metadata: DtcgMetadata = {
    tokenSetOrder: Object.keys(groups),
  };

  return {
    $metadata: metadata,
    ...groups,
  };
}

export { stripPrefix, totalTokensCount };

function totalTokensCount(dtcg: DtcgRoot): number {
  let count = 0;
  for (const [key, value] of Object.entries(dtcg)) {
    if (key === '$metadata') continue;
    count += countInGroup(value as DtcgGroup);
  }
  return count;
}

function countInGroup(group: DtcgGroup): number {
  let count = 0;
  for (const value of Object.values(group)) {
    if ('$value' in value) {
      count++;
    } else {
      count += countInGroup(value as DtcgGroup);
    }
  }
  return count;
}
