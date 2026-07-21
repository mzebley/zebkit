import {
  isColorValue,
  serializeColorValue,
  type TokenInterface,
  type TokenObject,
} from '../../definitions/tokens';
import { fromDtcgDocument } from './dtcg-document';
import {
  buildTokenReferenceLookup,
  serializeTokenValueWithReferences,
} from './token-references';

export interface DocsToken extends TokenObject {
  /** Canonical CSS-facing representation used by the decoupled docs app. */
  $displayValue: string;
}

export type DocsTokenRegistry = Record<string, Record<string, DocsToken>>;

export interface PrimitivePaletteData {
  steps: number[];
  families: Array<{
    name: string;
    hue: number;
    saturation: number;
    swatches: Array<{ step: number; lightness: number; cssVar: string; hsl: string }>;
  }>;
  globals: Array<{ name: string; cssVar: string; value: string }>;
}

/** Flatten one authoring document into the docs hero's display diff. */
export function projectThemeTokenDiff(
  moduleKey: string,
  document: Record<string, unknown>,
  referenceDocuments: Record<string, Record<string, unknown>> = {}
): Record<string, string> {
  const { entries } = fromDtcgDocument(document, { mode: 'literal' });
  const referenceEntries = Object.fromEntries(
    Object.entries({
      ...referenceDocuments,
      [`zbk-${moduleKey}`]: document,
    }).map(([key, value]) => [
      key,
      fromDtcgDocument(value, { mode: 'literal' }).entries,
    ])
  );
  const referenceLookup = buildTokenReferenceLookup(referenceEntries);
  const errors: string[] = [];
  const result = Object.fromEntries(
    Object.entries(entries)
      .filter(([, entry]) => entry.$value !== undefined)
      .map(([tokenKey, entry]) => {
        const display = serializeTokenValueWithReferences(entry.$value, entry.$type, {
          referenceLookup,
          errors,
        }).replace(/^\{[^.{}]+\.(.+)\}$/, '$1');
        return [`${moduleKey}-${tokenKey}`, display];
      })
  );
  if (errors.length > 0) {
    throw new Error(`Cannot project theme token diff:\n${errors.join('\n')}`);
  }
  return result;
}

/**
 * Convert the public combined DTCG document into the flat, display-ready data
 * consumed by the docs app. Structural parsing and value formatting stay on
 * the source side so the decoupled Svelte build does not implement DTCG again.
 */
export function projectDocsTokenData(
  combined: Record<string, Record<string, unknown>>
): DocsTokenRegistry {
  const projected: DocsTokenRegistry = {};
  const parsed = Object.fromEntries(
    Object.entries(combined).map(([moduleKey, document]) => [
      moduleKey,
      fromDtcgDocument(document, { mode: 'literal' }).entries,
    ])
  );
  const referenceLookup = buildTokenReferenceLookup(parsed);
  const errors: string[] = [];

  for (const [moduleKey, entries] of Object.entries(parsed)) {
    projected[moduleKey] = Object.fromEntries(
      Object.entries(entries as TokenInterface).map(([name, entry]) => [
        name,
        {
          ...entry,
          $displayValue: serializeTokenValueWithReferences(entry.$value, entry.$type, {
            referenceLookup,
            errors,
          }),
        },
      ])
    );
  }

  if (errors.length > 0) {
    throw new Error(`Cannot project docs token data:\n${errors.join('\n')}`);
  }

  return projected;
}

/** Build docs primitive-palette data from the already parsed palette module. */
export function projectPrimitivePalette(
  registry: DocsTokenRegistry
): PrimitivePaletteData {
  const palette = registry['zbk-color'];
  if (!palette) throw new Error('default-tokens.json has no zbk-color module');

  const familyMap = new Map<
    string,
    PrimitivePaletteData['families'][number]
  >();
  const globals: PrimitivePaletteData['globals'] = [];

  for (const [name, token] of Object.entries(palette)) {
    if (!isColorValue(token.$value)) {
      throw new Error(`Palette entry '${name}' is not a structured DTCG color.`);
    }
    const value = token.$value;
    if (name.startsWith('global-')) {
      globals.push({
        name,
        cssVar: `--zbk-color-${name}`,
        value: serializeColorValue(value),
      });
      continue;
    }

    const stepMatch = name.match(/^(.+)-(\d+)$/);
    if (!stepMatch || value.colorSpace !== 'hsl') {
      throw new Error(`Unrecognized palette entry '${name}'.`);
    }
    const [hue, saturation, lightness] = value.components;
    if (
      typeof hue !== 'number' ||
      typeof saturation !== 'number' ||
      typeof lightness !== 'number'
    ) {
      throw new Error(`Palette entry '${name}' must have numeric hsl components.`);
    }

    const [, familyName, step] = stepMatch;
    const family = familyMap.get(familyName) ?? {
      name: familyName,
      hue,
      saturation,
      swatches: [],
    };
    family.swatches.push({
      step: Number(step),
      lightness,
      cssVar: `--zbk-color-${familyName}-${step}`,
      hsl: serializeColorValue(value),
    });
    familyMap.set(familyName, family);
  }

  const families = [...familyMap.values()].sort((a, b) =>
    a.name.localeCompare(b.name)
  );
  for (const family of families) {
    family.swatches.sort((a, b) => a.step - b.step);
  }

  return {
    steps: families[0]?.swatches.map((swatch) => swatch.step) ?? [],
    families,
    globals,
  };
}
