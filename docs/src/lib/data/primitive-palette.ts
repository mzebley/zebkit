import paletteJson from './generated/primitive-palette.json';

export interface PrimitiveSwatch {
  /** Scale step, e.g. `50`, `500`, `950`. */
  step: number;
  /** Lightness percentage baked into the generated HSL. */
  lightness: number;
  /** Full CSS custom property, e.g. `--zbk-color-blue-500`. */
  cssVar: string;
  /** Resolved HSL value, e.g. `hsl(210, 78%, 58%)`. */
  hsl: string;
}

export interface PrimitiveFamily {
  /** Palette family name, e.g. `blue`, `dusk`, `merlot`. */
  name: string;
  hue: number;
  saturation: number;
  swatches: PrimitiveSwatch[];
}

export interface PrimitiveGlobal {
  name: string;
  cssVar: string;
  value: string;
}

export interface PrimitivePalette {
  steps: number[];
  families: PrimitiveFamily[];
  globals: PrimitiveGlobal[];
}

export const primitivePalette = paletteJson as PrimitivePalette;

/** Steps at/under this lightness read as "dark" and want light ink overlaid. */
const DARK_LIGHTNESS = 60;

/** Heuristic legible ink for a swatch: dark steps take light ink, light steps take dark ink. */
export function onColor(lightness: number): 'light' | 'dark' {
  return lightness <= DARK_LIGHTNESS ? 'light' : 'dark';
}
