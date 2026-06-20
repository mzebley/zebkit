import { compiledTokens } from './compiled-tokens';

export interface ColorStep {
  /** Scale step, e.g. `50`, `500`, `950`. */
  step: string;
  /** Full CSS custom property, e.g. `--zbk-accent-primary-500`. */
  cssVar: string;
  /** Source reference value, e.g. `{color.ember-500}`. */
  value: string;
  description: string;
  /** Heuristic legible text color on this swatch (light steps → dark ink, dark steps → light ink). */
  onColor: 'light' | 'dark';
}

export interface ColorFamilyData {
  /** Route slug + identity, e.g. `accent-primary`. */
  family: string;
  /** Compiled group key, e.g. `zbk-accent-primary`. */
  key: string;
  steps: ColorStep[];
}

const ZBK = 'zbk-';
const STEP_RE = /^\d+$/;

/** A group is a color ramp when all its entries are numeric scale steps of type `color`. */
function isColorRamp(entries: Record<string, { type: string }>): boolean {
  const keys = Object.keys(entries);
  return keys.length > 0 && keys.every((k) => STEP_RE.test(k) && entries[k].type === 'color');
}

function buildSteps(key: string, entries: Record<string, { value: string | number; description: string }>): ColorStep[] {
  return Object.entries(entries)
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([step, token]) => ({
      step,
      cssVar: `--${key}-${step}`,
      value: String(token.value),
      description: token.description,
      onColor: Number(step) >= 500 ? 'light' : 'dark'
    }));
}

/** All semantic color ramp families, generated from the compiled token groups. */
export const colorFamilies: ColorFamilyData[] = Object.keys(compiledTokens)
  .filter((key) => isColorRamp(compiledTokens[key] as Record<string, { type: string }>))
  .map((key) => ({
    family: key.startsWith(ZBK) ? key.slice(ZBK.length) : key,
    key,
    steps: buildSteps(key, compiledTokens[key] as Record<string, { value: string | number; description: string }>)
  }))
  .sort((a, b) => a.family.localeCompare(b.family));

export const colorFamilySlugs = colorFamilies.map((f) => f.family);

export function getColorFamily(slug: string): ColorFamilyData | undefined {
  return colorFamilies.find((f) => f.family === slug);
}

/* ------------------------------------------------------------------ *
 * Semantic color families (canvas / ink / border roles)
 * ------------------------------------------------------------------ */

export type ColorRole = 'canvas' | 'ink' | 'border';
export type ColorVariant = 'base' | 'inverse';
export type ColorIntensity = 'base' | 'soft' | 'muted' | 'strong';

export interface SemanticSwatch {
  /** Slot name, e.g. `canvas-inverse-soft`. */
  slot: string;
  /** Full CSS custom property, e.g. `--zbk-action-canvas-inverse-soft`. */
  cssVar: string;
  /** Source reference value, e.g. `{color.blue-50}`, or `''` when unset. */
  value: string;
  description: string;
  variant: ColorVariant;
  intensity: ColorIntensity;
  /** Whether the underlying token has a value (unset slots render as a gap). */
  filled: boolean;
}

export interface SemanticRoleGroup {
  role: ColorRole;
  swatches: SemanticSwatch[];
}

export interface SemanticColorFamilyData {
  /** Route slug + identity, e.g. `action`. */
  family: string;
  /** Compiled group key, e.g. `zbk-action`. */
  key: string;
  roles: SemanticRoleGroup[];
}

/** `canvas` | `canvas-soft` | `canvas-inverse` | `canvas-inverse-strong` … */
const ROLE_SLOT_RE = /^(canvas|ink|border)(?:-(inverse))?(?:-(soft|muted|strong))?$/;
const ROLE_ORDER: ColorRole[] = ['canvas', 'ink', 'border'];

/** A group is a semantic color family when every entry is a color keyed by a role slot. */
function isSemanticColorFamily(entries: Record<string, { type: string }>): boolean {
  const keys = Object.keys(entries);
  return keys.length > 0 && keys.every((k) => entries[k].type === 'color' && ROLE_SLOT_RE.test(k));
}

function parseSlot(slot: string): { role: ColorRole; variant: ColorVariant; intensity: ColorIntensity } {
  const m = ROLE_SLOT_RE.exec(slot);
  if (!m) throw new Error(`Unparseable color slot: ${slot}`);
  return {
    role: m[1] as ColorRole,
    variant: m[2] === 'inverse' ? 'inverse' : 'base',
    intensity: (m[3] as ColorIntensity) ?? 'base'
  };
}

function buildRoles(
  key: string,
  entries: Record<string, { value: string | number; description: string }>
): SemanticRoleGroup[] {
  const groups = new Map<ColorRole, SemanticSwatch[]>();

  for (const [slot, token] of Object.entries(entries)) {
    const { role, variant, intensity } = parseSlot(slot);
    const value = String(token.value ?? '');
    const swatch: SemanticSwatch = {
      slot,
      cssVar: `--${key}-${slot}`,
      value,
      description: token.description,
      variant,
      intensity,
      filled: value.trim() !== ''
    };
    if (!groups.has(role)) groups.set(role, []);
    groups.get(role)!.push(swatch);
  }

  return ROLE_ORDER.filter((role) => groups.has(role)).map((role) => ({
    role,
    swatches: groups.get(role)!
  }));
}

/** All semantic color families (app, action, caution, critical, disabled, info, positive). */
export const semanticColorFamilies: SemanticColorFamilyData[] = Object.keys(compiledTokens)
  .filter((key) => isSemanticColorFamily(compiledTokens[key] as Record<string, { type: string }>))
  .map((key) => ({
    family: key.startsWith(ZBK) ? key.slice(ZBK.length) : key,
    key,
    roles: buildRoles(key, compiledTokens[key] as Record<string, { value: string | number; description: string }>)
  }))
  .sort((a, b) => a.family.localeCompare(b.family));

export const semanticColorFamilySlugs = semanticColorFamilies.map((f) => f.family);

export function getSemanticColorFamily(slug: string): SemanticColorFamilyData | undefined {
  return semanticColorFamilies.find((f) => f.family === slug);
}

/* ------------------------------------------------------------------ *
 * Unified routing across both kinds
 * ------------------------------------------------------------------ */

export type ColorPage =
  | { kind: 'ramp'; family: ColorFamilyData }
  | { kind: 'semantic'; family: SemanticColorFamilyData };

/** Every routable color-family slug, ramps first then semantic, each alphabetical. */
export const allColorFamilySlugs = [...colorFamilySlugs, ...semanticColorFamilySlugs];

export function getColorPage(slug: string): ColorPage | undefined {
  const ramp = getColorFamily(slug);
  if (ramp) return { kind: 'ramp', family: ramp };
  const semantic = getSemanticColorFamily(slug);
  if (semantic) return { kind: 'semantic', family: semantic };
  return undefined;
}
