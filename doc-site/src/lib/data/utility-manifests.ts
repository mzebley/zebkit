import { compiledTokens } from './compiled-tokens';

// Utility manifests are the linted source of truth for the utility surface.
// Match generate:utilities' recursive src/tokens/**/*utilities.manifest.json
// discovery so adding a co-located token utility automatically adds its docs
// route and navigation entry as well.
const manifestModules = import.meta.glob('$core/**/*utilities.manifest.json', { eager: true });

// Minimal shape of the manifest fields we consume (mirrors expand.ts).
interface ManifestFamily {
  name: string;
  description: string;
  guidance?: string[];
  source: string | string[];
  properties: string[];
  a11y?: string;
  classes?: string[];
  rules?: UtilityRule[];
  statePattern?: {
    axes: Record<string, (string | null)[]>;
    projections: Array<{
      targets: Record<string, string | string[]>;
      axes?: Record<string, (string | null)[]>;
      class: string;
      var: string;
    }>;
    states: true | StateName[];
  };
  pattern?: {
    base: string;
    edges?: string[];
    edgeRequired?: boolean;
    values?: string[];
    negativeValues?: string[] | boolean;
    exclude?: string[];
    literals?: Record<string, string>;
    aliases?: Record<string, string>;
  };
  tokens?: { group: string; varPrefix: string; edgeInToken?: boolean; types?: string[] };
  modifiers?: { hover?: boolean; responsive?: string[] };
  generator?: {
    edgeProperties?: Record<string, string[]>;
    valueMap?: Record<string, string>;
    declarations?: Record<string, Record<string, string>>;
  };
}

interface UtilityRule {
  selector: string;
  declarations: Record<string, string>;
  nested?: UtilityRule[];
}

type StateName = 'base' | 'focus' | 'hover' | 'active' | 'disabled';

interface Manifest {
  name: string;
  key: string;
  description: string;
  families: ManifestFamily[];
}

const UTILITY_ORDER = [
  'margin',
  'padding',
  'page-section-spacing',
  'spacing',
  'layout',
  'flex',
  'grid',
  'typography',
  'text',
  'prose',
  'color',
  'border',
  'focus',
  'elevation',
  'opacity',
  'transition',
  'z-index',
  'object',
  'overflow',
  'pointer',
  'visibility'
] as const;

const orderByKey = new Map<string, number>(UTILITY_ORDER.map((key, index) => [key, index]));

const RAW = Object.entries(manifestModules)
  .sort(([pathA], [pathB]) => pathA.localeCompare(pathB))
  .map(([, module]) => (module as { default: Manifest }).default)
  .sort((a, b) => {
    const orderA = orderByKey.get(a.key) ?? Number.MAX_SAFE_INTEGER;
    const orderB = orderByKey.get(b.key) ?? Number.MAX_SAFE_INTEGER;
    return orderA - orderB || a.key.localeCompare(b.key);
  });

const duplicateKeys = RAW.map((manifest) => manifest.key).filter(
  (key, index, keys) => keys.indexOf(key) !== index
);
if (duplicateKeys.length) {
  throw new Error(`Duplicate utility manifest keys: ${[...new Set(duplicateKeys)].join(', ')}`);
}

type TokenEntry = { type: string };

/** Values derived from the family's bound token group, filtered by allowed types. */
function tokenGroupValues(family: ManifestFamily): string[] {
  if (!family.tokens) return [];
  const group = compiledTokens[`zbk-${family.tokens.group}`] as Record<string, TokenEntry> | undefined;
  if (!group) return [];
  let keys = Object.keys(group);
  const types = family.tokens.types;
  if (types && types.length) keys = keys.filter((k) => types.includes(group[k].type));
  return keys;
}

/** Positive value axis: explicit `pattern.values` or token-derived, minus `exclude`, plus literal keys. */
function positiveValues(family: ManifestFamily): string[] {
  const p = family.pattern;
  if (!p) return [];
  let values = p.values?.length ? [...p.values] : tokenGroupValues(family);
  if (p.exclude?.length) values = values.filter((v) => !p.exclude!.includes(v));
  if (p.literals) values.push(...Object.keys(p.literals));
  return values;
}

/** Negative axis: explicit list, or `true` → mirror positives that have a matching `neg-<v>` token. */
function negativeValues(family: ManifestFamily, positives: string[]): string[] {
  const p = family.pattern;
  if (!p?.negativeValues) return [];
  if (Array.isArray(p.negativeValues)) return p.negativeValues;
  const group = (family.tokens && compiledTokens[`zbk-${family.tokens.group}`]) || {};
  return positives.filter((v) => `neg-${v}` in group);
}

// --- Declaration derivation -------------------------------------------------
// Mirrors generate.ts so each class's emitted CSS can be shown in the inspector
// without parsing the generated SCSS. Kept in lockstep with the generator's
// patternEntries / resolveValue / resolveProperties; the `#{prefix.$cssVar}`
// interpolation resolves to `--zbk-`, so token values are emitted as
// `var(--zbk-…)` here directly.

/** A single CSS declaration a class applies, plus any tokens it references. */
export interface Declaration {
  property: string;
  value: string;
  /** CSS custom properties referenced by `value` (for live resolution). */
  vars: string[];
}

interface PatternEntry {
  className: string;
  edge: string | null;
  value: string;
  negative: boolean;
}

const VAR_RE = /var\((--[\w-]+)\)/g;

function cssVarsIn(value: string): string[] {
  return [...value.matchAll(VAR_RE)].map((m) => m[1]);
}

/** Pattern grammar → concrete (class, edge, value) entries, matching generate.ts. */
function patternEntries(family: ManifestFamily): PatternEntry[] {
  const p = family.pattern;
  if (!p) return [];

  const edges: Array<string | null> = p.edgeRequired ? [] : [null];
  for (const e of p.edges ?? []) edges.push(e);

  const positives = positiveValues(family);
  const negatives = negativeValues(family, positives);

  const entries: PatternEntry[] = [];
  const byClass = new Map<string, PatternEntry>();

  for (const edge of edges) {
    const stem = edge ? `${p.base}-${edge}` : p.base;
    for (const v of positives) {
      const entry = { className: `${stem}-${v}`, edge, value: v, negative: false };
      entries.push(entry);
      byClass.set(entry.className, entry);
    }
    for (const v of negatives) {
      const entry = { className: `${stem}-neg-${v}`, edge, value: v, negative: true };
      entries.push(entry);
      byClass.set(entry.className, entry);
    }
  }

  for (const [alias, target] of Object.entries(p.aliases ?? {})) {
    const entry = byClass.get(target);
    if (entry) entries.push({ ...entry, className: alias });
  }

  return entries;
}

/** Final CSS value for an entry: valueMap/literal verbatim, else a token var, else raw. */
function resolveValue(family: ManifestFamily, entry: PatternEntry): string {
  const valueMap = family.generator?.valueMap;
  const mapped =
    valueMap?.[entry.className] ??
    (entry.negative ? valueMap?.[`neg-${entry.value}`] : undefined) ??
    valueMap?.[entry.value] ??
    family.pattern?.literals?.[entry.value];
  if (mapped !== undefined) return mapped;

  if (family.tokens) {
    const edgeSegment = family.tokens.edgeInToken && entry.edge ? `-${entry.edge}` : '';
    const tokenName = entry.negative
      ? `${family.tokens.varPrefix}${edgeSegment}-neg-${entry.value}`
      : `${family.tokens.varPrefix}${edgeSegment}-${entry.value}`;
    return `var(--zbk-${tokenName})`;
  }

  return entry.negative ? `-${entry.value}` : entry.value;
}

function resolveProperties(family: ManifestFamily, edge: string | null): string[] {
  const edgeProperties = family.generator?.edgeProperties;
  if (!edgeProperties) return family.properties;
  return edgeProperties[edge ?? ''] ?? [];
}

function instantiateTemplate(template: string, values: Record<string, string | null>): string {
  return template.replace(/\{(-?)([a-zA-Z-]+)\}/g, (_, dash: string, axis: string) => {
    const value = values[axis] ?? null;
    if (value === null) return '';
    return dash ? `-${value}` : value;
  });
}

function cartesian<T>(arrays: T[][]): T[][] {
  return arrays.reduce<T[][]>(
    (combinations, values) =>
      combinations.flatMap((combination) => values.map((value) => [...combination, value])),
    [[]]
  );
}

function classesInSelector(selector: string): string[] {
  const classes: string[] = [];
  const classToken = /\.((?:[a-zA-Z]|\\:)(?:[a-zA-Z0-9_-]|\\:)*)/g;
  const attributeToken = /\[class~=["']([^"']+)["']\]/g;
  for (const match of selector.matchAll(classToken)) classes.push(match[1].replace(/\\:/g, ':'));
  for (const match of selector.matchAll(attributeToken)) classes.push(match[1]);
  return classes;
}

function classesFromRules(rules: UtilityRule[]): string[] {
  return rules.flatMap((rule) => [
    ...classesInSelector(rule.selector),
    ...classesFromRules(rule.nested ?? [])
  ]);
}

function statePatternEntries(family: ManifestFamily): Array<{
  className: string;
  properties: string[];
  value: string;
}> {
  const pattern = family.statePattern;
  if (!pattern) return [];

  const states: StateName[] =
    pattern.states === true
      ? ['base', 'focus', 'hover', 'active', 'disabled']
      : pattern.states;
  const entries: Array<{ className: string; properties: string[]; value: string }> = [];

  for (const projection of pattern.projections) {
    const axes = { ...pattern.axes, ...(projection.axes ?? {}) };
    const axisNames = Object.keys(axes);
    const combinations = cartesian(axisNames.map((name) => axes[name]));
    for (const [target, rawProperties] of Object.entries(projection.targets)) {
      const properties = Array.isArray(rawProperties) ? rawProperties : [rawProperties];
      for (const combination of combinations) {
        const bindings: Record<string, string | null> = { target };
        axisNames.forEach((name, index) => (bindings[name] = combination[index]));
        const baseClass = instantiateTemplate(projection.class, bindings);
        const value = `var(${instantiateTemplate(projection.var, bindings)})`;
        for (const state of states) {
          entries.push({
            className: state === 'base' ? baseClass : `${state}:${baseClass}`,
            properties,
            value
          });
        }
      }
    }
  }

  return entries;
}

function pushDeclarations(
  out: Record<string, Declaration[]>,
  className: string,
  declarations: Record<string, string>
) {
  const current = out[className] ?? [];
  for (const [property, value] of Object.entries(declarations)) {
    if (
      current.some(
        (declaration) => declaration.property === property && declaration.value === value
      )
    ) {
      continue;
    }
    current.push({ property, value, vars: cssVarsIn(value) });
  }
  out[className] = current;
}

function addRuleDeclarations(out: Record<string, Declaration[]>, rules: UtilityRule[]) {
  for (const rule of rules) {
    for (const className of classesInSelector(rule.selector)) {
      pushDeclarations(out, className, rule.declarations);
    }
    addRuleDeclarations(out, rule.nested ?? []);
  }
}

/** Build the class → declarations map for a family. */
function familyDeclarations(family: ManifestFamily): Record<string, Declaration[]> {
  const out: Record<string, Declaration[]> = {};

  if (family.statePattern) {
    for (const entry of statePatternEntries(family)) {
      pushDeclarations(
        out,
        entry.className,
        Object.fromEntries(entry.properties.map((property) => [property, entry.value]))
      );
    }
    return out;
  }

  if (family.classes) {
    for (const cls of family.classes) {
      const decls = family.generator?.declarations?.[cls];
      if (!decls) continue;
      out[cls] = Object.entries(decls).map(([property, value]) => ({
        property,
        value,
        vars: cssVarsIn(value)
      }));
    }
    return out;
  }

  if (family.rules) {
    addRuleDeclarations(out, family.rules);
    return out;
  }

  for (const entry of patternEntries(family)) {
    const properties = resolveProperties(family, entry.edge);
    if (!properties.length) continue;
    const value = resolveValue(family, entry);
    out[entry.className] = properties.map((property) => ({
      property,
      value,
      vars: cssVarsIn(value)
    }));
  }

  return out;
}

export interface UtilityFamilyDoc {
  name: string;
  description: string;
  properties: string[];
  guidance: string[];
  a11y?: string;
  source: string[];
  tokenGroup?: string;
  /** Vocabulary: every base class the family claims (hover variants included, breakpoint prefixes excluded). */
  baseClasses: string[];
  /** Responsive breakpoint prefixes available on every base class. */
  responsive: string[];
  hover: boolean;
  /** Base class → the CSS declarations it applies (derived from the manifest). */
  declarations: Record<string, Declaration[]>;
}

function expandFamily(family: ManifestFamily): UtilityFamilyDoc {
  const core = new Set<string>();
  const p = family.pattern;

  if (family.statePattern) {
    for (const entry of statePatternEntries(family)) core.add(entry.className);
  } else if (family.classes) {
    for (const c of family.classes) core.add(c);
  } else if (family.rules) {
    for (const c of classesFromRules(family.rules)) core.add(c);
  } else if (p) {
    const edges: Array<string | null> = p.edgeRequired ? [] : [null];
    for (const e of p.edges ?? []) edges.push(e);

    const positives = positiveValues(family);
    const negatives = negativeValues(family, positives);

    for (const edge of edges) {
      const stem = edge ? `${p.base}-${edge}` : p.base;
      for (const v of positives) core.add(`${stem}-${v}`);
      for (const v of negatives) core.add(`${stem}-neg-${v}`);
    }
    for (const [alias, target] of Object.entries(p.aliases ?? {})) {
      if (core.has(target)) core.add(alias);
    }
  }

  const base = new Set(core);
  if (family.modifiers?.hover) for (const c of core) base.add(`hover:${c}`);

  return {
    name: family.name,
    description: family.description,
    properties: family.properties,
    guidance: family.guidance ?? [],
    a11y: family.a11y,
    source: Array.isArray(family.source) ? family.source : [family.source],
    tokenGroup: family.tokens?.group,
    baseClasses: [...base].sort(),
    responsive: family.modifiers?.responsive ?? [],
    hover: Boolean(family.modifiers?.hover),
    declarations: familyDeclarations(family)
  };
}

export interface UtilityManifestDoc {
  key: string;
  name: string;
  description: string;
  families: UtilityFamilyDoc[];
}

export const utilityManifests: UtilityManifestDoc[] = RAW.map((m) => ({
  key: m.key,
  name: m.name,
  description: m.description,
  families: m.families.map(expandFamily)
}));

export const utilitySlugs = utilityManifests.map((m) => m.key);

export function getUtilityManifest(slug: string): UtilityManifestDoc | undefined {
  return utilityManifests.find((m) => m.key === slug);
}

// --- Class inspector lookup -------------------------------------------------
// Flat registry of every base utility class → its declarations and the manifest
// family it belongs to. Powers the inspector's class mode.

export interface ClassInfo {
  /** The base class name (no breakpoint / hover prefix). */
  baseClass: string;
  /** Owning manifest family + manifest slug, for attribution and linking. */
  family: string;
  manifestKey: string;
  declarations: Declaration[];
  /** Breakpoint prefixes the class also accepts. */
  responsive: string[];
  /** Whether the class also has a `hover:` variant. */
  hover: boolean;
}

const classRegistry: Record<string, ClassInfo> = {};
for (const manifest of utilityManifests) {
  for (const family of manifest.families) {
    for (const [baseClass, declarations] of Object.entries(family.declarations)) {
      // First family to claim a class wins (matches generator source order).
      if (baseClass in classRegistry) continue;
      classRegistry[baseClass] = {
        baseClass,
        family: family.name,
        manifestKey: manifest.key,
        declarations,
        responsive: family.responsive,
        hover: family.hover
      };
    }
  }
}

/** Every base class name with derivable declarations (no prefixes). */
export const utilityClassSet = new Set(Object.keys(classRegistry));

export interface ResolvedClass extends ClassInfo {
  /** The breakpoint prefix on the looked-up name, if any (e.g. `tablet`). */
  responsivePrefix: string | null;
  /** Whether the looked-up name carried a `hover:` prefix. */
  hoverPrefix: boolean;
}

/**
 * Look up a class name's declarations, tolerating `bp:` and `hover:` prefixes
 * (e.g. `tablet:hover:flex-row` resolves to the `flex-row` base entry).
 * Returns null for unknown classes.
 */
export function getClassDeclaration(raw: string): ResolvedClass | null {
  const parts = raw.trim().split(':');
  const baseClass = parts.pop() ?? '';
  let responsivePrefix: string | null = null;
  let hoverPrefix = false;
  for (const prefix of parts) {
    if (prefix === 'hover') hoverPrefix = true;
    else responsivePrefix = prefix;
  }
  const info = classRegistry[baseClass];
  if (!info) return null;
  return { ...info, responsivePrefix, hoverPrefix };
}
