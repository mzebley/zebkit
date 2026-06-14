import { compiledTokens } from './compiled-tokens';

// Utility manifests are the linted source of truth for the utility surface
// (src/core/styles/utility-classes/*.utilities.manifest.json). We import them
// directly and expand each family's grammar into its class vocabulary, deriving
// token-bound values from the same compiled token set the generator uses — so
// these pages are generated from source and cannot silently drift.
import flexManifest from '$core/styles/utility-classes/flex.utilities.manifest.json';
import gridManifest from '$core/styles/utility-classes/grid.utilities.manifest.json';
import layoutManifest from '$core/styles/utility-classes/layout.utilities.manifest.json';
import marginManifest from '$core/styles/utility-classes/margin.utilities.manifest.json';
import objectManifest from '$core/styles/utility-classes/object.utilities.manifest.json';
import overflowManifest from '$core/styles/utility-classes/overflow.utilities.manifest.json';
import paddingManifest from '$core/styles/utility-classes/padding.utilities.manifest.json';
import pointerManifest from '$core/styles/utility-classes/pointer.utilities.manifest.json';
import textManifest from '$core/styles/utility-classes/text.utilities.manifest.json';
import visibilityManifest from '$core/styles/utility-classes/visibility.utilities.manifest.json';

// Minimal shape of the manifest fields we consume (mirrors expand.ts).
interface ManifestFamily {
  name: string;
  description: string;
  guidance?: string[];
  source: string | string[];
  properties: string[];
  a11y?: string;
  classes?: string[];
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
  tokens?: { group: string; varPrefix: string; types?: string[] };
  modifiers?: { hover?: boolean; responsive?: string[] };
}
interface Manifest {
  name: string;
  key: string;
  description: string;
  families: ManifestFamily[];
}

const RAW: Manifest[] = [
  marginManifest,
  paddingManifest,
  layoutManifest,
  flexManifest,
  gridManifest,
  textManifest,
  objectManifest,
  overflowManifest,
  pointerManifest,
  visibilityManifest
] as unknown as Manifest[];

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
}

function expandFamily(family: ManifestFamily): UtilityFamilyDoc {
  const core = new Set<string>();
  const p = family.pattern;

  if (family.classes) {
    for (const c of family.classes) core.add(c);
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
    hover: Boolean(family.modifiers?.hover)
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
