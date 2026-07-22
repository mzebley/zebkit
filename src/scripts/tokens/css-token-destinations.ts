import path from 'node:path';
import fs from 'fs-extra';
import { glob } from 'glob';
import { lexer, parse } from 'css-tree';
import { CSS_FALLBACK_TYPE_BY_DTCG_TYPE } from '@definitions/dtcg';
import { cssTokenValueError, type CssTokenValueType } from '@definitions/css-token-values';
import {
  serializeShadowValue,
  tokenValueToString,
  zbkExtension,
  type AllowedTokenTypes,
  type ShadowTokenValue,
  type TokenInterface,
} from '@definitions/tokens';
import {
  buildCssVariableReferenceLookup,
  buildTokenReferenceLookup,
  enumerateTokenReferences,
  resolveTokenReferenceLookupId,
  tokenReferenceToLookupId,
} from './token-references';

export type TokenCssDestinations = Record<string, string[]>;

const DESTINATION_ARTIFACT = 'css-properties.json';

function normalizeScssVariable(value: string): string {
  return value.replace(/--#\{prefix\.\$cssVar\}-/g, '--zbk-');
}

/**
 * Derive the real CSS properties fed directly by each token from shipped
 * SCSS, generated utility SCSS, and inline TypeScript style declarations.
 */
export async function deriveDirectTokenCssDestinations(
  tokens: Record<string, TokenInterface>,
  sourceRoot = path.resolve('src')
): Promise<TokenCssDestinations> {
  const destinationSets = new Map<string, Set<string>>();
  const cssVariableLookup = buildCssVariableReferenceLookup(tokens);
  const tokenLookup = buildTokenReferenceLookup(tokens);
  const files = (await glob('**/*.{scss,ts}', { cwd: sourceRoot, absolute: true, nodir: true }))
    .filter((file) => !file.endsWith('.test.ts'))
    .sort((left, right) => left.localeCompare(right));

  const declaration = /(^|[;{\n])\s*([a-z-]+)\s*:\s*([^;{}]+)(?=;|\n|})/gim;
  const variable = /var\(\s*(--zbk-[a-z0-9-]+)/gi;
  for (const file of files) {
    const source = normalizeScssVariable(await fs.readFile(file, 'utf8'));
    for (const match of source.matchAll(declaration)) {
      const property = match[2].toLowerCase();
      if (property.startsWith('--')) continue;
      for (const variableMatch of match[3].matchAll(variable)) {
        const cssVariable = variableMatch[1];
        const reference = cssVariableLookup.get(cssVariable);
        if (!reference) continue;
        const lookupId = tokenReferenceToLookupId(reference);
        if (!lookupId) continue;
        const properties = destinationSets.get(lookupId) ?? new Set<string>();
        properties.add(property);
        destinationSets.set(lookupId, properties);
      }
    }
  }

  // Internal controls feed generated CSS math rather than a declaration directly.
  for (const [id, target] of tokenLookup) {
    if (id.startsWith('a11y.') && target.entry.$type === 'number') {
      destinationSets.set(id, new Set(['<number>']));
    }
    else if (/^color\.[^.]+-hue$/.test(id)) destinationSets.set(id, new Set(['<angle-or-number>']));
    else if (/^color\.[^.]+-saturation$/.test(id)) destinationSets.set(id, new Set(['<percentage>']));
  }

  return Object.fromEntries(
    [...destinationSets]
      .filter(([id]) => tokenLookup.has(id))
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([id, properties]) => [id, [...properties].sort()])
  );
}

/** Recompute reachability from the final merged alias graph. */
export function propagateTokenCssDestinations(
  tokens: Record<string, TokenInterface>,
  direct: TokenCssDestinations
): TokenCssDestinations {
  const tokenLookup = buildTokenReferenceLookup(tokens);
  const destinationSets = new Map<string, Set<string>>(
    Object.entries(direct).map(([id, properties]) => [id, new Set(properties)])
  );
  let changed = true;
  while (changed) {
    changed = false;
    for (const [sourceId, source] of tokenLookup) {
      const properties = destinationSets.get(sourceId);
      if (!properties?.size) continue;
      const moduleId = sourceId.slice(0, sourceId.indexOf('.'));
      for (const reference of enumerateTokenReferences(source.entry.$value, source.entry.$type)) {
        const targetId = resolveTokenReferenceLookupId(reference.target, tokenLookup, moduleId);
        if (!targetId || !tokenLookup.has(targetId)) continue;
        const targetProperties = destinationSets.get(targetId) ?? new Set<string>();
        const previousSize = targetProperties.size;
        const memberDestinations = reference.member === 'color'
          ? ['<color>']
          : reference.member === 'blur'
            ? ['<nonnegative-length>']
            : reference.member
              ? ['<length>']
              : properties;
        for (const property of memberDestinations) targetProperties.add(property);
        destinationSets.set(targetId, targetProperties);
        if (targetProperties.size !== previousSize) changed = true;
      }
    }
  }

  return Object.fromEntries(
    [...destinationSets]
      .filter(([id]) => tokenLookup.has(id))
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([id, properties]) => [id, [...properties].sort()])
  );
}

export async function loadTokenCssDestinations(
  tokens: Record<string, TokenInterface>,
  tokenFiles: readonly string[]
): Promise<TokenCssDestinations> {
  const bundledFile = tokenFiles.find((file) => path.isAbsolute(file) && file.endsWith('.json'));
  if (bundledFile) {
    const candidates = [
      path.join(path.dirname(bundledFile), DESTINATION_ARTIFACT),
      path.resolve(path.dirname(bundledFile), '..', '..', 'defaults', DESTINATION_ARTIFACT),
    ];
    const artifact = await Promise.all(
      candidates.map(async (candidate) => (await fs.pathExists(candidate) ? candidate : undefined))
    ).then((matches) => matches.find((candidate): candidate is string => candidate !== undefined));
    if (!artifact) {
      throw new Error(
        `Bundled token CSS destination map is missing. Checked ${candidates.join(' and ')}. ` +
          `Reinstall Zebkit or rebuild package defaults.`
      );
    }
    return fs.readJson(artifact) as Promise<TokenCssDestinations>;
  }
  return deriveDirectTokenCssDestinations(tokens);
}

export function cssDestinationArtifactName(): string {
  return DESTINATION_ARTIFACT;
}

function rawCssType(type: AllowedTokenTypes): CssTokenValueType | undefined {
  const fallback = CSS_FALLBACK_TYPE_BY_DTCG_TYPE[
    type as keyof typeof CSS_FALLBACK_TYPE_BY_DTCG_TYPE
  ];
  return (fallback ?? type) as CssTokenValueType;
}

function matchesDestination(value: string, destination: string): boolean {
  const candidateValues = [value];
  if (/\b(?:var|env|attr)\(/i.test(value)) {
    for (const replacement of ['0', 'none', 'normal', 'red', '1ms', 'auto', 'opacity']) {
      const candidate = replaceIndeterminateFunctions(value, replacement);
      if (candidate !== value) candidateValues.push(candidate);
    }
  }
  return candidateValues.some((candidate) => matchesConcreteDestination(candidate, destination));
}

function matchesConcreteDestination(value: string, destination: string): boolean {
  try {
    const ast = parse(value, { context: 'value' });
    if (destination === 'opacity') {
      const numeric = value.trim().match(/^(-?(?:\d+|\d*\.\d+))(%)?$/);
      if (numeric) {
        const amount = Number(numeric[1]);
        return amount >= 0 && amount <= (numeric[2] ? 100 : 1);
      }
    }
    if (destination === 'transition-duration' || destination === 'animation-duration') {
      const time = value.trim().match(/^(-?(?:\d+|\d*\.\d+))(?:ms|s)$/i);
      if (time && Number(time[1]) < 0) return false;
    }
    if (destination === '<angle-or-number>') {
      return !lexer.matchType('angle', ast).error || !lexer.matchType('number', ast).error;
    }
    if (destination === '<nonnegative-length>') {
      const length = value.trim().match(/^(-?(?:\d+|\d*\.\d+))(?:[a-z]+|%)?$/i);
      return (!length || Number(length[1]) >= 0) && !lexer.matchType('length', ast).error;
    }
    if (destination.startsWith('<') && destination.endsWith('>')) {
      return !lexer.matchType(destination.slice(1, -1), ast).error;
    }
    return !lexer.matchProperty(destination, ast).error;
  } catch {
    return false;
  }
}

/**
 * Replace var()/env() calls only for grammar matching. The original value has
 * already passed balanced CSS syntax checks, and replacements still have to
 * satisfy the complete destination grammar, so trailing garbage is rejected.
 */
function replaceIndeterminateFunctions(value: string, replacement: string): string {
  let output = '';
  let cursor = 0;
  while (cursor < value.length) {
    const match = /\b(?:var|env|attr)\s*\(/gi.exec(value.slice(cursor));
    if (!match) return output + value.slice(cursor);
    const start = cursor + match.index;
    let index = start + match[0].length;
    let depth = 1;
    let quote: string | undefined;
    for (; index < value.length && depth > 0; index += 1) {
      const character = value[index];
      if (quote) {
        if (character === '\\') index += 1;
        else if (character === quote) quote = undefined;
      } else if (character === '"' || character === "'") quote = character;
      else if (character === '(') depth += 1;
      else if (character === ')') depth -= 1;
    }
    if (depth !== 0) return value;
    output += value.slice(cursor, start) + replacement;
    cursor = index;
  }
  return output;
}

const UNMAPPED_STANDARD_DESTINATIONS: Partial<Record<AllowedTokenTypes, string[]>> = {
  color: ['<color>'],
  dimension: ['<length>'],
  duration: ['<time>'],
  fontFamily: ['font-family'],
  fontWeight: ['font-weight'],
  cubicBezier: ['transition-timing-function'],
  number: ['<number>'],
  strokeStyle: ['border-style'],
  shadow: ['box-shadow'],
};

const UNAMBIGUOUS_PROPRIETARY_DESTINATIONS: Partial<Record<AllowedTokenTypes, string[]>> = {
  cssColor: ['<color>'],
  cssDuration: ['<time>'],
  cssFontFamily: ['font-family'],
  cssFontWeight: ['font-weight'],
  cssEasingFunction: ['transition-timing-function'],
  cssStrokeStyle: ['border-style'],
  cssShadow: ['box-shadow'],
  display: ['display'],
  cursor: ['cursor'],
  fontStyle: ['font-style'],
  textDecoration: ['text-decoration'],
  textTransform: ['text-transform'],
  textAlignment: ['text-align'],
  transitionProperty: ['transition-property'],
  transform: ['transform'],
  asset: ['<image>'],
  content: ['content'],
  resize: ['resize'],
};

/** Validate a raw override against every CSS property it can reach. */
export function tokenCssValueError(
  moduleKey: string,
  tokenName: string,
  type: AllowedTokenTypes,
  value: string,
  destinations: TokenCssDestinations
): string | undefined {
  const cssType = rawCssType(type);
  if (cssType) {
    const syntaxError = cssTokenValueError(cssType, value);
    if (syntaxError) return syntaxError;
  }

  const moduleId = moduleKey.replace(/^zbk-/, '');
  const id = `${moduleId}.${tokenName}`;
  const properties = destinations[id] ??
    UNMAPPED_STANDARD_DESTINATIONS[type] ??
    UNAMBIGUOUS_PROPRIETARY_DESTINATIONS[type];
  if (!properties?.length) {
    return `has no CSS destination mapping for '${id}'. Bind the token in shipped CSS or add an explicit generated-control destination before accepting raw CSS.`;
  }
  const mismatches = properties.filter((property) => !matchesDestination(value, property));
  if (mismatches.length > 0) {
    return `is not valid for every CSS destination of '${id}' (${properties.join(', ')}); ` +
      `it fails ${mismatches.join(', ')}. Use a value accepted by all destinations or split the token by purpose.`;
  }
  return undefined;
}

/** Coverage gate used by source builds and artifact drift checks. */
export function unmappedCssTokens(
  tokens: Record<string, TokenInterface>,
  destinations: TokenCssDestinations
): string[] {
  const lookup = buildTokenReferenceLookup(tokens);
  return [...lookup]
    .filter(([id, target]) =>
      !destinations[id]?.length &&
      !UNMAPPED_STANDARD_DESTINATIONS[target.entry.$type] &&
      !UNAMBIGUOUS_PROPRIETARY_DESTINATIONS[target.entry.$type]
    )
    .map(([id]) => id)
    .sort();
}

/** Validate every authored raw CSS value after aliases and overrides are final. */
export function validateTokenCssValues(
  tokens: Record<string, TokenInterface>,
  destinations: TokenCssDestinations
): string[] {
  const errors: string[] = [];
  for (const [moduleKey, entries] of Object.entries(tokens)) {
    for (const [name, entry] of Object.entries(entries)) {
      const scale = zbkExtension(entry)?.scale;
      if (
        entry.$value === undefined &&
        typeof scale?.index === 'number' &&
        scale.valueSource !== 'pinned'
      ) {
        // An indexed step without an authored value is an intentional
        // pre-resolver placeholder. Pinned and concrete steps are real CSS
        // inputs and continue through validation below.
        continue;
      }
      if (typeof entry.$value === 'string' && /^\{[^{}]+\}$/.test(entry.$value)) continue;
      if (
        entry.$type === 'color' &&
        entry.$value === '' &&
        zbkExtension(entry)?.emptyColorPlaceholder === true
      ) continue;
      // Composite shadow references are serialized later with the collection
      // resolver. Their referenced literals are validated at their own targets.
      if (
        entry.$type === 'shadow' &&
        enumerateTokenReferences(entry.$value, entry.$type).length > 0
      ) continue;
      let cssValue: string;
      try {
        cssValue = entry.$type === 'shadow'
          ? serializeShadowValue(entry.$value as ShadowTokenValue)
          : tokenValueToString(entry.$value, entry.$type);
      } catch (serializationError) {
        errors.push(
          `${moduleKey}.${name}: could not serialize $type '${entry.$type}' for CSS destination validation: ` +
            `${serializationError instanceof Error ? serializationError.message : String(serializationError)}`
        );
        continue;
      }
      const error = tokenCssValueError(moduleKey, name, entry.$type, cssValue, destinations);
      if (error) errors.push(`${moduleKey}.${name}: ${error}`);
    }
  }
  return errors;
}
