import {
  allowedTokenTypes,
  isShadowValue,
  parseWholeValueAlias,
  serializeShadowValue,
  tokenValueToString,
} from '@definitions/tokens';
import type { AllowedTokenTypes, TokenInterface, TokenObject } from '@definitions/tokens';
import { areTokensTypesCompatible } from '@definitions/token-maps';

const ALLOWED_TYPES = new Set<string>(allowedTokenTypes.options);

export interface TokenReferenceTarget {
  target: string;
  expectedType: AllowedTokenTypes;
  /** Composite member containing the reference, absent for a whole-value alias. */
  member?: 'color' | 'offsetX' | 'offsetY' | 'blur' | 'spread';
  /** True when the alias occupies one slot in a DTCG shadow array. */
  arrayElement?: boolean;
}

/** Parse a DTCG whole-value alias without imposing a legacy segment limit. */
export function parseTokenReference(value: unknown): string | undefined {
  return parseWholeValueAlias(value);
}

const CSS_SAFE_TOKEN_SEGMENT = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function suggestedCssSafeSegment(segment: string): string {
  const suggestion = segment
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return suggestion || 'token-name';
}

export function tokenReferenceToCssVariable(reference: string, prefix: string): string {
  const segments = reference.split('.').map((segment) => segment === '$root' ? 'root' : segment);
  const unsafe = segments.find((segment) => !CSS_SAFE_TOKEN_SEGMENT.test(segment));
  if (unsafe) {
    throw new Error(
      `Token reference '{${reference}}' is valid DTCG, but segment '${unsafe}' cannot be ` +
        `projected to a Zebkit CSS custom property. Use lowercase kebab-case such as ` +
        `'${suggestedCssSafeSegment(unsafe)}'.`
    );
  }
  return `--${prefix}-${segments.join('-')}`;
}

/** Canonical flat collection key used by Zebkit's internal token maps. */
export function tokenReferenceToLookupId(reference: string, moduleId?: string): string | undefined {
  const segments = reference.split('.');
  if (segments.length === 1) {
    if (!moduleId) return undefined;
    const name = segments[0] === '$root' ? 'root' : segments[0];
    return `${moduleId}.${name}`;
  }
  const [rootModuleId, ...entryPath] = segments;
  if (!rootModuleId || entryPath.length === 0) return undefined;
  return `${rootModuleId}.${entryPath.map((segment) => segment === '$root' ? 'root' : segment).join('-')}`;
}

/**
 * Resolve aliases using DTCG document-root precedence. A dotted alias whose
 * first segment names a known module is global; otherwise it is a nested path
 * in the current module. One-segment aliases are always local.
 */
export function resolveTokenReferenceLookupId(
  reference: string,
  lookup: ReadonlyMap<string, unknown>,
  moduleId?: string
): string | undefined {
  const segments = reference.split('.');
  if (segments.length > 1) {
    const globalId = tokenReferenceToLookupId(reference);
    const [rootSegment] = segments;
    const knownGlobalModule = [...lookup.keys()].some((id) => id.startsWith(`${rootSegment}.`));
    if (globalId && knownGlobalModule) return globalId;
  }
  if (moduleId) {
    const localName = segments
      .map((segment) => segment === '$root' ? 'root' : segment)
      .join('-');
    const localId = `${moduleId}.${localName}`;
    if (lookup.has(localId)) return localId;
  }
  return tokenReferenceToLookupId(reference, moduleId);
}

/** Convert a public DTCG id to the flat internal `zbk-<module>.<entry>` id. */
export function tokenReferenceToInternalId(reference: string, prefix = 'zbk'): string | undefined {
  const lookupId = tokenReferenceToLookupId(reference);
  if (!lookupId) return undefined;
  const separator = lookupId.indexOf('.');
  return `${prefix}-${lookupId.slice(0, separator)}.${lookupId.slice(separator + 1)}`;
}

/** Build an exact lookup from authored reference IDs to their concrete token entries. */
export function buildTokenReferenceLookup(tokens: Record<string, TokenInterface>) {
  const lookup = new Map<string, { entry: TokenInterface[string]; moduleKey: string; name: string }>();
  const modulePrefix = 'zbk-';
  for (const [moduleKey, entries] of Object.entries(tokens)) {
    const moduleId = moduleKey.startsWith(modulePrefix) ? moduleKey.slice(modulePrefix.length) : moduleKey;
    for (const [name, entry] of Object.entries(entries)) {
      lookup.set(`${moduleId}.${name}`, { entry, moduleKey, name });
    }
  }
  return lookup;
}

/**
 * Exact CSS custom-property lookup. This avoids guessing the module boundary in
 * names such as `--zbk-accent-primary-canvas`.
 */
export function buildCssVariableReferenceLookup(
  tokens: Record<string, TokenInterface>,
  prefix = 'zbk'
): Map<string, string> {
  const lookup = new Map<string, string>();
  for (const reference of buildTokenReferenceLookup(tokens).keys()) {
    const variable = tokenReferenceToCssVariable(reference, prefix);
    const existing = lookup.get(variable);
    if (existing && existing !== reference) {
      throw new Error(
        `CSS variable '${variable}' is ambiguous between token references '${existing}' and '${reference}'.`
      );
    }
    lookup.set(variable, reference);
  }
  return lookup;
}

export function parseCssVariableReference(
  value: unknown,
  lookup: ReadonlyMap<string, string>
): string | undefined {
  if (typeof value !== 'string') return undefined;
  const match = value.match(/^var\((--[A-Za-z0-9_-]+)\)$/);
  return match ? lookup.get(match[1]) : undefined;
}

/** Enumerate whole-value and DTCG shadow composite references. */
export function enumerateTokenReferences(
  value: unknown,
  type: AllowedTokenTypes
): TokenReferenceTarget[] {
  const direct = parseTokenReference(value);
  if (direct) return [{ target: direct, expectedType: type }];
  if (type !== 'shadow' || value == null || typeof value !== 'object') return [];

  const layers = Array.isArray(value) ? value : [value];
  const references: TokenReferenceTarget[] = [];
  for (const layer of layers) {
    const layerReference = parseTokenReference(layer);
    if (layerReference) {
      references.push({ target: layerReference, expectedType: 'shadow', arrayElement: true });
      continue;
    }
    if (!layer || typeof layer !== 'object' || Array.isArray(layer)) continue;
    const record = layer as Record<string, unknown>;
    for (const [member, expectedType] of [
      ['color', 'color'],
      ['offsetX', 'dimension'],
      ['offsetY', 'dimension'],
      ['blur', 'dimension'],
      ['spread', 'dimension'],
    ] as const) {
      const target = parseTokenReference(record[member]);
      if (target) references.push({ target, expectedType, member });
    }
  }
  return references;
}

export interface TokenReferenceEntry {
  entry: TokenObject;
  moduleKey: string;
  name: string;
}

export function buildTokenReferenceGraph(
  tokens: Record<string, TokenInterface>
): Map<string, string[]> {
  const graph = new Map<string, string[]>();
  const lookup = buildTokenReferenceLookup(tokens);
  for (const [id, target] of lookup) {
    const moduleId = id.slice(0, id.indexOf('.'));
    graph.set(
      id,
      enumerateTokenReferences(target.entry.$value, target.entry.$type)
        .map((reference) => resolveTokenReferenceLookupId(reference.target, lookup, moduleId))
        .filter((reference): reference is string => reference !== undefined)
        .sort()
    );
  }
  return graph;
}

function canonicalCycle(cycle: string[]): string[] {
  const body = cycle.slice(0, -1);
  let best = body;
  for (let index = 1; index < body.length; index += 1) {
    const rotated = [...body.slice(index), ...body.slice(0, index)];
    if (rotated.join('\0') < best.join('\0')) best = rotated;
  }
  return [...best, best[0]];
}

/** Return each directed reference cycle once, in deterministic order. */
export function findTokenReferenceCycles(graph: ReadonlyMap<string, readonly string[]>): string[][] {
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const stack: string[] = [];
  const cycles = new Map<string, string[]>();

  const visit = (id: string) => {
    if (visiting.has(id)) {
      const start = stack.indexOf(id);
      const cycle = canonicalCycle([...stack.slice(start), id]);
      cycles.set(cycle.join(' -> '), cycle);
      return;
    }
    if (visited.has(id)) return;
    visiting.add(id);
    stack.push(id);
    for (const target of [...(graph.get(id) ?? [])].sort()) {
      if (graph.has(target)) visit(target);
    }
    stack.pop();
    visiting.delete(id);
    visited.add(id);
  };

  for (const id of [...graph.keys()].sort()) visit(id);
  return [...cycles.values()].sort((a, b) => a.join('\0').localeCompare(b.join('\0')));
}

export function isCompatibleReference(
  expected: AllowedTokenTypes | string,
  target: AllowedTokenTypes | string
): boolean {
  if (!ALLOWED_TYPES.has(expected) || !ALLOWED_TYPES.has(target)) return false;
  return areTokensTypesCompatible(expected as AllowedTokenTypes, target as AllowedTokenTypes);
}

export interface ReferenceSerializationOptions {
  referenceLookup: ReturnType<typeof buildTokenReferenceLookup>;
  /** Current document module for legal one-segment aliases such as `{base}`. */
  moduleId?: string;
  prefix?: string;
  errors?: string[];
}

/** Serialize a token value while resolving composite aliases against an exact collection lookup. */
export function serializeTokenValueWithReferences(
  value: unknown,
  type: AllowedTokenTypes,
  options: ReferenceSerializationOptions
): string {
  if (type !== 'shadow' || !isShadowValue(value)) return tokenValueToString(value, type);
  const prefix = options.prefix ?? 'zbk';
  return serializeShadowValue(value, (reference, expectedType) => {
    const lookupId = resolveTokenReferenceLookupId(reference, options.referenceLookup, options.moduleId);
    const target = lookupId ? options.referenceLookup.get(lookupId) : undefined;
    let message: string | undefined;
    if (!target) {
      message = `Invalid token reference: {${reference}}. Ensure the target token exists.`;
    } else if (!isCompatibleReference(expectedType, target.entry.$type)) {
      message =
        `Invalid token reference: {${reference}} ` +
        `(type '${expectedType}' cannot reference '${target.entry.$type}').`;
    }
    if (message) {
      options.errors?.push(message);
      return 'undefined';
    }
    return `var(${tokenReferenceToCssVariable(lookupId!, prefix)})`;
  });
}
