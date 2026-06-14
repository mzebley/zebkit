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
