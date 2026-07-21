/**
 * DTCG document <-> internal token-map transforms (Phase 3, plan decisions
 * D2/D5/D6). Exported artifacts (per-module snapshots, combined exports, the
 * docs `default-tokens.json`) are real DTCG documents; the internal pipeline
 * works with a flat `TokenInterface` (record of leaf entries, each carrying its
 * own `$type`). These two functions are the single boundary between the shapes:
 *
 *   toDtcgDocument   flat entries + module metadata -> DTCG document
 *                    (hoists a shared `$type` to the group; folds layer /
 *                     cssEmission / scale into `$extensions["dev.zebkit"]`)
 *   fromDtcgDocument DTCG document -> flat entries + module metadata
 *                    (expands the group `$type` back onto entries, flattens
 *                     nested groups by joining path segments with `-` per D6,
 *                     rejects `$ref` / `$extends`)
 *
 * The round-trip is identity — `fromDtcgDocument(toDtcgDocument(x, m))` restores
 * `x` and `m` — so JSON-mode builds emit byte-identical CSS to source builds.
 */
import type { ColorValue, DimensionValue, TokenInterface, TokenObject, TokenGroupExtensions } from '@definitions/tokens';
import {
  allowedTokenTypes,
  isWholeValueAlias,
  zbkExtension,
  tokenExtensionsSchema,
  tokenGroupExtensionsSchema,
  validateTokenValue,
} from '@definitions/tokens';
import { ZEBKIT_EXTENSION_KEY, isDtcgSpecType, isZebkitSupportedSpecType } from '@definitions/dtcg';
import {
  buildTokenReferenceGraph,
  buildTokenReferenceLookup,
  buildCssVariableReferenceLookup,
  enumerateTokenReferences,
  findTokenReferenceCycles,
  isCompatibleReference,
  parseTokenReference,
  parseCssVariableReference,
  tokenReferenceToLookupId,
} from './token-references';
import { DEFAULT_LAYER, LayerName } from '@definitions/layers';
import { resolveTypeScale } from './build-type-scale';

/** JSON Pointer / inheritance alias forms zebkit deliberately does not support (D6). */
const REJECTED_REFERENCE_KEYS = ['$ref', '$extends'] as const;

/** Module-level metadata carried outside the entry map. */
export interface ModuleMeta {
  layer: LayerName;
  /** Internal diagnostic label; never serialized into the document. */
  label?: string;
  /** Present only for emission-external modules (the primitive palette). */
  cssEmission?: 'external';
  /** The `{ "dev.zebkit": { scale } }` group block, when the module has fluid-scale controls. */
  groupExtensions?: TokenGroupExtensions;
  /** Root group metadata preserved across a document read/write round trip. */
  description?: string;
  deprecated?: boolean | string;
  extensions?: Record<string, unknown>;
  /** Nested group metadata with its exact structural path. */
  groupMetadata?: PreservedGroupMetadata[];
  entryPaths?: Record<string, string[]>;
  /** Full collection used only while normalizing exact CSS-variable references. */
  referenceTokens?: Record<string, TokenInterface>;
  /** Precomputed form of `referenceTokens`, shared across a collection export. */
  cssVariableReferences?: ReadonlyMap<string, string>;
  /** Original root group type, when a parsed document is being round-tripped. */
  rootType?: string;
}

export interface PreservedGroupMetadata {
  path: string[];
  $type?: string;
  $description?: string;
  $deprecated?: boolean | string;
  $extensions?: Record<string, unknown>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function mergeMetadataRecords(
  base: Record<string, unknown> | undefined,
  override: Record<string, unknown> | undefined
): Record<string, unknown> | undefined {
  if (!base && !override) return undefined;
  const merged: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(override ?? {})) {
    merged[key] = isRecord(merged[key]) && isRecord(value)
      ? mergeMetadataRecords(merged[key] as Record<string, unknown>, value)
      : value;
  }
  return merged;
}

function mergePreservedGroupMetadata(
  base: PreservedGroupMetadata | undefined,
  override: PreservedGroupMetadata
): PreservedGroupMetadata {
  return {
    ...base,
    ...override,
    path: [...override.path],
    ...((base?.$extensions || override.$extensions)
      ? { $extensions: mergeMetadataRecords(base?.$extensions, override.$extensions) }
      : {}),
  };
}

/** Merge author metadata without collapsing structurally distinct group paths. */
export function mergeModuleMetadata(
  base: ModuleMeta | undefined,
  override: ModuleMeta
): ModuleMeta {
  const groups = new Map<string, PreservedGroupMetadata>();
  for (const metadata of base?.groupMetadata ?? []) {
    groups.set(JSON.stringify(metadata.path), metadata);
  }
  for (const metadata of override.groupMetadata ?? []) {
    const key = JSON.stringify(metadata.path);
    groups.set(key, mergePreservedGroupMetadata(groups.get(key), metadata));
  }
  const extensions = mergeMetadataRecords(base?.extensions, override.extensions);
  return {
    ...base,
    layer: base?.layer ?? override.layer,
    ...(base?.label || override.label ? { label: override.label ?? base?.label } : {}),
    ...(base?.cssEmission || override.cssEmission
      ? { cssEmission: override.cssEmission ?? base?.cssEmission }
      : {}),
    ...(base?.description !== undefined || override.description !== undefined
      ? { description: override.description ?? base?.description }
      : {}),
    ...(base?.deprecated !== undefined || override.deprecated !== undefined
      ? { deprecated: override.deprecated ?? base?.deprecated }
      : {}),
    ...(extensions
      ? {
          extensions,
          groupExtensions: extensions as TokenGroupExtensions,
        }
      : {}),
    ...(groups.size ? { groupMetadata: [...groups.values()] } : {}),
    ...((base?.entryPaths || override.entryPaths)
      ? { entryPaths: { ...base?.entryPaths, ...override.entryPaths } }
      : {}),
    ...(base?.rootType || override.rootType
      ? { rootType: override.rootType ?? base?.rootType }
      : {}),
  };
}

/** How a DTCG document is read at the runtime/export boundary. */
export type DtcgReadMode = 'runtime' | 'literal';

/**
 * True when a document member is a leaf token rather than a nested group. A
 * leaf usually carries `$value`, but zebkit's fluid generated-scale steps
 * (font sizes) omit it — they are derived at build from the group's scale
 * controls — so a member with only `$`-prefixed data and no nested token/group
 * children (e.g. `{ $type, $description, $extensions }`) is also a leaf.
 */
function isLeafToken(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  if ('$value' in record) return true;
  if ('$root' in record) return false;
  return !Object.keys(record).some((key) => !key.startsWith('$') && !key.startsWith('_'));
}

const TOKEN_PROPERTIES = new Set(['$value', '$type', '$description', '$extensions', '$deprecated']);
const GROUP_PROPERTIES = new Set(['$type', '$description', '$extensions', '$deprecated', '$root']);

function validName(name: string): boolean {
  return name.length > 0 && !name.startsWith('$') && !/[.{}]/.test(name);
}

function rejectedReferenceError(pathLabel: string, key: string): string {
  return (
    `${pathLabel}: '${key}' is not supported; use a curly-brace reference ` +
    `('{module.entry}') as '$value' (JSON Pointer '$ref' and '$extends' are rejected by D6)`
  );
}

function rawValueExtension(entry: TokenObject, rawCssValue: string, originalType = entry.$type) {
  return {
    ...entry.$extensions,
    [ZEBKIT_EXTENSION_KEY]: {
      ...entry.$extensions?.[ZEBKIT_EXTENSION_KEY],
      rawCssValue,
      originalType,
    },
  };
}

function parseRawColor(
  value: string,
  cssVariables: ReadonlyMap<string, string>,
  allowUnresolvedCssVariables = false
): ColorValue | string | undefined {
  if (value === 'transparent') return { colorSpace: 'srgb', components: [0, 0, 0], alpha: 0 };
  const reference = parseCssVariableReference(value, cssVariables);
  if (reference) return `{${reference}}`;
  if (allowUnresolvedCssVariables && /^var\(--[A-Za-z0-9_-]+\)$/.test(value)) {
    return '{unresolved.color}';
  }
  const hex = value.match(/^#([0-9a-f]{6})$/i);
  if (hex) {
    const components = [0, 2, 4].map((offset) =>
      parseInt(hex[1].slice(offset, offset + 2), 16) / 255
    ) as [number, number, number];
    return { colorSpace: 'srgb', components, hex: value };
  }
  const hsl = value.match(/^hsla?\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)%\s*,\s*(-?[\d.]+)%\s*(?:,\s*([\d.]+)\s*)?\)$/i);
  if (hsl) {
    return {
      colorSpace: 'hsl',
      components: [Number(hsl[1]), Number(hsl[2]), Number(hsl[3])],
      ...(hsl[4] === undefined ? {} : { alpha: Number(hsl[4]) }),
    };
  }
  const rgb = value.match(/^rgba?\(\s*(\d+)\s*(?:,|\s)\s*(\d+)\s*(?:,|\s)\s*(\d+)\s*(?:(?:,|\/)\s*([\d.]+)\s*)?\)$/i);
  if (rgb) {
    return {
      colorSpace: 'srgb',
      components: [Number(rgb[1]) / 255, Number(rgb[2]) / 255, Number(rgb[3]) / 255],
      ...(rgb[4] === undefined ? {} : { alpha: Number(rgb[4]) }),
    };
  }
  return undefined;
}

function splitCssList(value: string): string[] {
  const parts: string[] = [];
  let start = 0;
  let depth = 0;
  for (let index = 0; index < value.length; index += 1) {
    if (value[index] === '(') depth += 1;
    else if (value[index] === ')') depth -= 1;
    else if (value[index] === ',' && depth === 0) {
      parts.push(value.slice(start, index).trim());
      start = index + 1;
    }
  }
  parts.push(value.slice(start).trim());
  return parts;
}

function splitCssComponents(value: string): string[] {
  const parts: string[] = [];
  let start = 0;
  let depth = 0;
  for (let index = 0; index <= value.length; index += 1) {
    const char = value[index];
    if (char === '(') depth += 1;
    else if (char === ')') depth -= 1;
    if ((char === undefined || /\s/.test(char)) && depth === 0) {
      if (index > start) parts.push(value.slice(start, index));
      while (index + 1 < value.length && /\s/.test(value[index + 1])) index += 1;
      start = index + 1;
    }
  }
  return parts;
}

function parseRawShadow(
  value: string,
  cssVariables: ReadonlyMap<string, string>,
  allowUnresolvedCssVariables = false
): unknown[] | undefined {
  if (value === 'none') return [];
  const layers = splitCssList(value).map((layer) => {
    const parts = splitCssComponents(layer);
    const insetIndex = parts.findIndex((part) => part.toLowerCase() === 'inset');
    const inset = insetIndex !== -1;
    if (inset) parts.splice(insetIndex, 1);
    if (parts.length < 3 || parts.length > 5) return undefined;

    const firstColor = parseRawColor(parts[0], cssVariables, allowUnresolvedCssVariables);
    const lastColor = parseRawColor(
      parts[parts.length - 1],
      cssVariables,
      allowUnresolvedCssVariables
    );
    const color = firstColor ?? lastColor;
    if (!color) return undefined;
    const dimensionParts = firstColor ? parts.slice(1) : parts.slice(0, -1);
    if (dimensionParts.length < 2 || dimensionParts.length > 4) return undefined;
    const dimension = (part: string): DimensionValue | string | undefined => {
      const reference = parseCssVariableReference(part, cssVariables);
      if (reference) return `{${reference}}`;
      if (allowUnresolvedCssVariables && /^var\(--[A-Za-z0-9_-]+\)$/.test(part)) {
        return '{unresolved.dimension}';
      }
      const match = part.match(/^(-?(?:\d+(?:\.\d+)?|\.\d+))(px|rem)?$/i);
      if (!match) return undefined;
      const value = Number(match[1]);
      const unit = (match[2] ?? (value === 0 ? 'px' : undefined)) as 'px' | 'rem' | undefined;
      return unit ? { value, unit } : undefined;
    };
    const values = dimensionParts.map(dimension);
    if (values.some((entry) => entry === undefined)) return undefined;
    while (values.length < 4) values.push({ value: 0, unit: 'px' });
    return {
      color,
      offsetX: values[0],
      offsetY: values[1],
      blur: values[2],
      spread: values[3],
      ...(inset ? { inset: true } : {}),
    };
  });
  return layers.every((layer) => layer !== undefined) ? layers : undefined;
}

function parseRawUnit<T extends string>(value: string, units: readonly T[]): { value: number; unit: T } | undefined {
  if (value === '0' && (units as readonly string[]).includes('ms')) return { value: 0, unit: 'ms' as T };
  const match = value.match(new RegExp(`^(-?(?:\\d+(?:\\.\\d+)?|\\.\\d+))(${units.join('|')})$`));
  return match ? { value: Number(match[1]), unit: match[2] as T } : undefined;
}

/** Convert runtime theme CSS strings to valid DTCG values while retaining exact CSS on re-ingest. */
function normalizeExportEntry(
  entry: TokenObject,
  pathLabel: string,
  cssVariables: ReadonlyMap<string, string>,
  allowUnresolvedCssVariables = false
): TokenObject {
  if (typeof entry.$value !== 'string' || isWholeValueAlias(entry.$value)) return entry;
  const raw = String(entry.$value);
  if (entry.$type === 'color' && raw === '' && zbkExtension(entry)?.emptyColorPlaceholder === true) {
    return entry;
  }
  if (entry.$type === 'color') {
    const parsed = parseRawColor(raw, cssVariables, allowUnresolvedCssVariables);
    if (parsed && validateTokenValue('color', parsed).success) {
      return { ...entry, $value: parsed, $extensions: rawValueExtension(entry, raw) };
    }
    throw new Error(`Cannot export ${pathLabel} as DTCG color: unsupported raw CSS value ${JSON.stringify(raw)}`);
  }
  if (entry.$type === 'dimension') {
    const parsed = parseRawUnit(raw, ['px', 'rem']);
    if (parsed) {
      if (!validateTokenValue('dimension', parsed).success) {
        throw new Error(`Cannot export ${pathLabel} as DTCG dimension: non-finite raw CSS value ${JSON.stringify(raw)}`);
      }
      return { ...entry, $value: parsed, $extensions: rawValueExtension(entry, raw) };
    }
    return { ...entry, $type: 'cssDimension', $extensions: rawValueExtension(entry, raw, 'dimension') };
  }
  if (entry.$type === 'duration') {
    const parsed = parseRawUnit(raw, ['ms', 's']);
    if (parsed && validateTokenValue('duration', parsed).success) {
      return { ...entry, $value: parsed, $extensions: rawValueExtension(entry, raw) };
    }
    throw new Error(`Cannot export ${pathLabel} as DTCG duration: unsupported raw CSS value ${JSON.stringify(raw)}`);
  }
  if (entry.$type === 'cubicBezier') {
    const match = raw.match(/^cubic-bezier\(\s*([\d.-]+)\s*,\s*([\d.-]+)\s*,\s*([\d.-]+)\s*,\s*([\d.-]+)\s*\)$/i);
    if (match) {
      const parsed = match.slice(1).map(Number) as [number, number, number, number];
      if (validateTokenValue('cubicBezier', parsed).success) {
        return { ...entry, $value: parsed, $extensions: rawValueExtension(entry, raw) };
      }
    }
    throw new Error(`Cannot export ${pathLabel} as DTCG cubicBezier: unsupported raw CSS value ${JSON.stringify(raw)}`);
  }
  if (entry.$type === 'shadow') {
    const parsed = parseRawShadow(raw, cssVariables, allowUnresolvedCssVariables);
    if (parsed && validateTokenValue('shadow', parsed).success) {
      return { ...entry, $value: parsed as any, $extensions: rawValueExtension(entry, raw) };
    }
    throw new Error(`Cannot export ${pathLabel} as DTCG shadow: unsupported raw CSS value ${JSON.stringify(raw)}`);
  }
  return entry;
}

/**
 * Validate raw override grammar before the full collection exists. CSS-variable
 * references are represented by typed sentinels here; the final collection
 * export still resolves every variable through the exact generated lookup.
 */
export function assertRawTokenValueNormalizable(entry: TokenObject, pathLabel: string): TokenObject {
  return normalizeExportEntry(entry, pathLabel, new Map(), true);
}

/**
 * Serialize a module's flat entries and metadata into a DTCG document. A `$type`
 * shared by every entry is hoisted to the group and dropped from the entries;
 * layer / cssEmission / scale ride a group-level `$extensions["dev.zebkit"]`
 * block. Group `$`-members are emitted first, then the entries in their original
 * order.
 */
export function toDtcgDocument(
  entries: TokenInterface,
  meta: ModuleMeta,
  options: { mode?: 'export' | 'authoring' } = {}
): Record<string, unknown> {
  const mode = options.mode ?? 'export';
  const names = Object.keys(entries);
  const paths = Object.fromEntries(
    names.map((name) => [name, meta.entryPaths?.[name] ?? [name]])
  ) as Record<string, string[]>;
  for (let leftIndex = 0; leftIndex < names.length; leftIndex += 1) {
    const leftName = names[leftIndex];
    const left = paths[leftName];
    for (let rightIndex = leftIndex + 1; rightIndex < names.length; rightIndex += 1) {
      const rightName = names[rightIndex];
      const right = paths[rightName];
      const shared = Math.min(left.length, right.length);
      const samePrefix = left.slice(0, shared).every((segment, index) => segment === right[index]);
      if (samePrefix && (left.length === shared || right.length === shared)) {
        throw new Error(
          `${meta.label ?? 'module'}: structural token paths '${left.join('.')}' and ` +
            `'${right.join('.')}' collide after metadata-preserving reconstruction`
        );
      }
    }
  }
  const groupMetadata = new Map(
    (meta.groupMetadata ?? []).map(({ path, ...metadata }) => [
      JSON.stringify(path),
      metadata,
    ])
  );
  const cssVariables = meta.cssVariableReferences ?? buildCssVariableReferenceLookup(meta.referenceTokens ?? {});
  const serializedEntries = mode === 'authoring'
    ? entries
    : Object.fromEntries(
        names.map((name) => [
          name,
          normalizeExportEntry(entries[name], `${meta.label ?? 'module'}.${name}`, cssVariables),
        ])
      ) as TokenInterface;
  const distinctTypes = new Set(names.map((name) => serializedEntries[name].$type));
  const groupType = names.length === 0
    ? undefined
    : meta.entryPaths
      ? meta.rootType
      : distinctTypes.size === 1
        ? [...distinctTypes][0]
        : undefined;

  const existingExtensions = meta.extensions ?? meta.groupExtensions ?? {};

  const doc: Record<string, unknown> = {};
  if (groupType) doc.$type = groupType;
  if (meta.description !== undefined) doc.$description = meta.description;
  if (meta.deprecated !== undefined) doc.$deprecated = meta.deprecated;
  if (mode === 'authoring') {
    if (Object.keys(existingExtensions).length > 0) doc.$extensions = existingExtensions;
  } else {
    const scale = meta.groupExtensions?.[ZEBKIT_EXTENSION_KEY]?.scale;
    const existingVendor = existingExtensions[ZEBKIT_EXTENSION_KEY];
    const vendor: Record<string, unknown> = {
      ...(existingVendor && typeof existingVendor === 'object' && !Array.isArray(existingVendor)
        ? existingVendor as Record<string, unknown>
        : {}),
      layer: meta.layer,
    };
    if (meta.cssEmission) vendor.cssEmission = meta.cssEmission;
    else delete vendor.cssEmission;
    if (scale) vendor.scale = scale;
    doc.$extensions = { ...existingExtensions, [ZEBKIT_EXTENSION_KEY]: vendor };
  }

  for (const name of names) {
    const entry = mode === 'export' && serializedEntries[name].$type === 'color' && serializedEntries[name].$value === ''
      ? {
          ...serializedEntries[name],
          $value: { colorSpace: 'srgb', components: [0, 0, 0], alpha: 0 },
          $extensions: {
            ...serializedEntries[name].$extensions,
            [ZEBKIT_EXTENSION_KEY]: {
              ...serializedEntries[name].$extensions?.[ZEBKIT_EXTENSION_KEY],
              emptyColorPlaceholder: true,
            },
          },
        }
      : serializedEntries[name];
    const path = paths[name];
    let inheritedType = groupType;
    for (let length = 1; length < path.length; length += 1) {
      const metadata = groupMetadata.get(JSON.stringify(path.slice(0, length)));
      if (typeof metadata?.$type === 'string') inheritedType = metadata.$type;
    }
    const serialized = (() => {
      if (!inheritedType || entry.$type !== inheritedType) return entry;
      const { $type, ...rest } = entry;
      return rest;
    })();
    let group = doc;
    const normalSegments = path.slice(0, -1);
    for (let index = 0; index < normalSegments.length; index += 1) {
      const segment = normalSegments[index];
      if (!group[segment] || typeof group[segment] !== 'object' || Array.isArray(group[segment])) {
        group[segment] = {
          ...(groupMetadata.get(JSON.stringify(normalSegments.slice(0, index + 1))) ?? {}),
        };
      }
      group = group[segment] as Record<string, unknown>;
    }
    const leaf = path[path.length - 1];
    group[leaf] = serialized;
  }
  return doc;
}

/** A compiled build's per-module outputs — everything needed to serialize its DTCG documents. */
export interface ModuleBuildOutput {
  tokens: Record<string, TokenInterface>;
  layers?: Record<string, LayerName>;
  groupExtensions?: Record<string, TokenGroupExtensions | undefined>;
  externalModules?: ReadonlySet<string>;
  moduleMetadata?: Record<string, ModuleMeta | undefined>;
}

/**
 * Serialize every module of a build to its DTCG document, keyed by module key.
 * This is the single source of truth for what the exporters emit — the CLI
 * defaults snapshots (`build:defaults`), the `writeTokensToFile` exports, and
 * the `check:dtcg-validate` gate all derive their documents from here so the
 * validated shape can never drift from the exported one.
 */
export function toDtcgDocuments(
  build: ModuleBuildOutput
): Record<string, Record<string, unknown>> {
  const materializedTokens = resolveTypeScale(build.tokens, {
    mode: 'fluid',
    groupExtensions: build.groupExtensions,
    preserveProvenance: true,
  });
  const documents: Record<string, Record<string, unknown>> = {};
  const cssVariableReferences = buildCssVariableReferenceLookup(materializedTokens);
  for (const key of Object.keys(materializedTokens)) {
    documents[key] = toDtcgDocument(materializedTokens[key], {
      ...build.moduleMetadata?.[key],
      layer: build.layers?.[key] ?? build.moduleMetadata?.[key]?.layer ?? DEFAULT_LAYER,
      label: key,
      cssEmission: build.externalModules?.has(key) ? 'external' : undefined,
      groupExtensions:
        build.groupExtensions?.[key] ?? build.moduleMetadata?.[key]?.groupExtensions,
      cssVariableReferences,
    });
  }
  return documents;
}

interface ParsedDtcgDocument {
  entries: TokenInterface;
  meta: ModuleMeta;
  errors: string[];
}

function isTransparentPlaceholderValue(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const color = value as Record<string, unknown>;
  return (
    color.colorSpace === 'srgb' &&
    Array.isArray(color.components) &&
    color.components.length === 3 &&
    color.components.every((component) => component === 0) &&
    color.alpha === 0
  );
}

function runtimeEntry(source: Record<string, unknown>, inheritedType: string | undefined): TokenObject {
  const entry = { ...source } as unknown as TokenObject;
  if (!entry.$type && inheritedType) entry.$type = inheritedType as TokenObject['$type'];
  if (entry.$extensions) {
    entry.$extensions = { ...entry.$extensions };
    const vendor = entry.$extensions[ZEBKIT_EXTENSION_KEY];
    if (vendor) entry.$extensions[ZEBKIT_EXTENSION_KEY] = { ...vendor };
  }

  const vendor = entry.$extensions?.[ZEBKIT_EXTENSION_KEY];
  if (
    entry.$type === 'color' &&
    vendor?.emptyColorPlaceholder === true &&
    entry.$value !== undefined &&
    isTransparentPlaceholderValue(entry.$value)
  ) {
    entry.$value = '';
  }

  const rawCssValue = vendor?.rawCssValue;
  const originalType = vendor?.originalType;
  if (typeof rawCssValue === 'string') entry.$value = rawCssValue;
  if (typeof originalType === 'string') entry.$type = originalType;
  if (typeof rawCssValue === 'string' || typeof originalType === 'string') {
    const { rawCssValue: _raw, originalType: _type, ...restVendor } = vendor ?? {};
    const { [ZEBKIT_EXTENSION_KEY]: _vendor, ...otherVendors } = entry.$extensions ?? {};
    entry.$extensions = Object.keys(restVendor).length
      ? { ...otherVendors, [ZEBKIT_EXTENSION_KEY]: restVendor }
      : Object.keys(otherVendors).length
        ? otherVendors
        : undefined;
  }

  const scale = entry.$extensions?.[ZEBKIT_EXTENSION_KEY]?.scale;
  if (scale?.valueSource === 'generated') {
    const { valueSource: _source, ...authoringScale } = scale;
    delete entry.$value;
    entry.$extensions = {
      ...entry.$extensions,
      [ZEBKIT_EXTENSION_KEY]: {
        ...entry.$extensions?.[ZEBKIT_EXTENSION_KEY],
        scale: authoringScale,
      },
    };
  } else if (scale?.valueSource === 'pinned') {
    const { valueSource: _source, ...authoringScale } = scale;
    entry.$extensions = {
      ...entry.$extensions,
      [ZEBKIT_EXTENSION_KEY]: {
        ...entry.$extensions?.[ZEBKIT_EXTENSION_KEY],
        scale: authoringScale,
      },
    };
  }
  return entry;
}

function literalEntry(source: Record<string, unknown>, inheritedType: string | undefined): TokenObject {
  const entry = { ...source } as unknown as TokenObject;
  if (!entry.$type && inheritedType) entry.$type = inheritedType as TokenObject['$type'];
  return entry;
}

function metadataOf(
  record: Record<string, unknown>,
  path: string[]
): PreservedGroupMetadata {
  return {
    path,
    ...(typeof record.$type === 'string' ? { $type: record.$type } : {}),
    ...(typeof record.$description === 'string' ? { $description: record.$description } : {}),
    ...(typeof record.$deprecated === 'boolean' || typeof record.$deprecated === 'string'
      ? { $deprecated: record.$deprecated }
      : {}),
    ...(record.$extensions && typeof record.$extensions === 'object' && !Array.isArray(record.$extensions)
      ? { $extensions: record.$extensions as Record<string, unknown> }
      : {}),
  };
}

function parseDtcgDocument(
  doc: Record<string, unknown>,
  mode: DtcgReadMode,
  label: string
): ParsedDtcgDocument {
  const entries: TokenInterface = {};
  const errors: string[] = [];
  const entryPaths: Record<string, string[]> = {};
  const groupMetadata: PreservedGroupMetadata[] = [];

  const validateProperties = (
    record: Record<string, unknown>,
    allowed: ReadonlySet<string>,
    pathLabel: string
  ) => {
    for (const key of Object.keys(record)) {
      if (REJECTED_REFERENCE_KEYS.includes(key as (typeof REJECTED_REFERENCE_KEYS)[number])) {
        errors.push(rejectedReferenceError(pathLabel, key));
      } else if (key.startsWith('$') && !allowed.has(key)) {
        errors.push(`${pathLabel}: unknown reserved property '${key}'`);
      }
    }
  };

  const addToken = (
    record: Record<string, unknown>,
    segments: string[],
    inheritedType: string | undefined,
    pathLabel: string,
    originalSegments = segments
  ) => {
    validateProperties(record, TOKEN_PROPERTIES, pathLabel);
    const childKeys = Object.keys(record).filter((key) => !key.startsWith('$'));
    if ('$value' in record && childKeys.length > 0) {
      errors.push(`${pathLabel}: a token with '$value' cannot also contain child tokens or groups`);
    }
    const name = segments.join('-');
    if (!name) {
      errors.push(`${pathLabel}: '$root' is only valid inside a named group`);
      return;
    }
    if (entries[name]) {
      errors.push(`${pathLabel}: flattened token name '${name}' collides with '${entryPaths[name].join('.')}'`);
      return;
    }
    entries[name] = mode === 'runtime'
      ? runtimeEntry(record, inheritedType)
      : literalEntry(record, inheritedType);
    entryPaths[name] = originalSegments;
  };

  const walkGroup = (
    node: Record<string, unknown>,
    segments: string[],
    inheritedType: string | undefined,
    pathLabel: string
  ) => {
    validateProperties(node, GROUP_PROPERTIES, pathLabel);
    if (node.$type !== undefined && typeof node.$type !== 'string') {
      errors.push(`${pathLabel}.$type: expected a string`);
    }
    if (node.$description !== undefined && typeof node.$description !== 'string') {
      errors.push(`${pathLabel}.$description: expected a string`);
    }
    if (
      node.$deprecated !== undefined &&
      typeof node.$deprecated !== 'boolean' &&
      typeof node.$deprecated !== 'string'
    ) {
      errors.push(`${pathLabel}.$deprecated: expected a boolean or string`);
    }
    if (
      node.$extensions !== undefined &&
      (!node.$extensions || typeof node.$extensions !== 'object' || Array.isArray(node.$extensions))
    ) {
      errors.push(`${pathLabel}.$extensions: expected an object`);
    }
    const groupType = typeof node.$type === 'string' ? node.$type : inheritedType;
    if (segments.length > 0) groupMetadata.push(metadataOf(node, segments));

    if ('$root' in node) {
      const root = node.$root;
      if (!root || typeof root !== 'object' || Array.isArray(root)) {
        errors.push(`${pathLabel}.$root: expected a token object`);
      } else {
        addToken(
          root as Record<string, unknown>,
          [...segments, 'root'],
          groupType,
          `${pathLabel}.$root`,
          [...segments, '$root']
        );
      }
    }

    for (const [key, value] of Object.entries(node)) {
      if (key.startsWith('$')) continue;
      const childPath = `${pathLabel}.${key}`;
      if (!validName(key)) {
        errors.push(`${childPath}: token and group names cannot begin with '$' or contain '.', '{', or '}'`);
        continue;
      }
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        errors.push(`${childPath}: expected a token or group object`);
        continue;
      }
      const record = value as Record<string, unknown>;
      const nextSegments = [...segments, key];
      if (isLeafToken(record) || '$value' in record) {
        addToken(record, nextSegments, groupType, childPath);
      } else {
        walkGroup(record, nextSegments, groupType, childPath);
      }
    }
  };

  walkGroup(doc, [], undefined, label);

  const rootExtensions = doc.$extensions && typeof doc.$extensions === 'object' && !Array.isArray(doc.$extensions)
    ? doc.$extensions as Record<string, unknown>
    : undefined;
  const groupExt = rootExtensions?.[ZEBKIT_EXTENSION_KEY] as Record<string, unknown> | undefined;
  const layer = (groupExt?.layer as LayerName) ?? DEFAULT_LAYER;
  const cssEmission = groupExt?.cssEmission === 'external' ? 'external' : undefined;
  const groupExtensions = rootExtensions as TokenGroupExtensions | undefined;
  const meta: ModuleMeta = {
    layer,
    cssEmission,
    groupExtensions,
    ...(typeof doc.$description === 'string' ? { description: doc.$description } : {}),
    ...(typeof doc.$deprecated === 'boolean' || typeof doc.$deprecated === 'string'
      ? { deprecated: doc.$deprecated }
      : {}),
    ...(rootExtensions ? { extensions: rootExtensions } : {}),
    ...(groupMetadata.length ? { groupMetadata } : {}),
    ...(Object.keys(entryPaths).length ? { entryPaths } : {}),
    ...(typeof doc.$type === 'string' ? { rootType: doc.$type } : {}),
  };
  return { entries, meta, errors };
}

/**
 * Parse a DTCG document into flat entries plus module metadata. The group
 * `$type` is applied to any entry that omits one; nested groups flatten by
 * joining path segments with `-` (D6); `$ref` / `$extends` are rejected.
 */
export function fromDtcgDocument(doc: Record<string, unknown>): {
  entries: TokenInterface;
  meta: ModuleMeta;
}
export function fromDtcgDocument(
  doc: Record<string, unknown>,
  options: { mode?: DtcgReadMode }
): {
  entries: TokenInterface;
  meta: ModuleMeta;
};
export function fromDtcgDocument(
  doc: Record<string, unknown>,
  options: { mode?: DtcgReadMode } = {}
): {
  entries: TokenInterface;
  meta: ModuleMeta;
} {
  const parsed = parseDtcgDocument(doc, options.mode ?? 'runtime', 'document');
  if (parsed.errors.length > 0) throw new Error(parsed.errors.join('\n'));
  return { entries: parsed.entries, meta: parsed.meta };
}

/** One token a strict-mode export dropped or pruned to keep references closed (D9). */
export interface DroppedToken {
  /** Flattened token name within the module. */
  name: string;
  /** The token's effective type. */
  $type: string;
  /** Why the token was removed from strict output. */
  reason: 'proprietary-type' | 'unsupported-type' | 'missing-reference' | 'referenced-proprietary' | 'referenced-dropped' | 'incompatible-reference';
  /** The flattened collection id that caused a dependency drop, when applicable. */
  referencedTarget?: string;
}

/** The result of a strict-mode export over a complete theme document set. */
export interface StrictDtcgDocuments {
  documents: Record<string, Record<string, unknown>>;
  dropped: Record<string, DroppedToken[]>;
}

interface FlattenedDocument {
  key: string;
  moduleId: string;
  entries: TokenInterface;
  meta: ModuleMeta;
}

function moduleIdForDocument(key: string): string {
  return key.startsWith('zbk-') ? key.slice(4) : key;
}

function flattenDocuments(
  documents: Record<string, Record<string, unknown>>,
  mode: DtcgReadMode
): FlattenedDocument[] {
  return Object.entries(documents).map(([key, doc]) => {
    const parsed = fromDtcgDocument(doc, { mode });
    return { key, moduleId: moduleIdForDocument(key), ...parsed };
  });
}

function buildReferenceLookup(flattened: FlattenedDocument[]): Map<string, { entry: TokenObject; key: string; name: string }> {
  const lookup = new Map<string, { entry: TokenObject; key: string; name: string }>();
  for (const doc of flattened) {
    for (const [name, entry] of Object.entries(doc.entries)) {
      lookup.set(`${doc.moduleId}.${name}`, { entry, key: doc.key, name });
    }
  }
  return lookup;
}

/**
 * Strict-mode export (D9) over a complete theme. Proprietary tokens are removed
 * first, then aliases to absent/dropped/type-incompatible targets are repeatedly
 * removed until the remaining document set is reference-closed.
 */
export function toStrictDtcgDocuments(
  documents: Record<string, Record<string, unknown>>
): StrictDtcgDocuments {
  const flattened = flattenDocuments(documents, 'literal');
  const tokenMap = Object.fromEntries(flattened.map((doc) => [doc.key, doc.entries]));
  const cycles = findTokenReferenceCycles(buildTokenReferenceGraph(tokenMap));
  if (cycles.length > 0) {
    throw new Error(`Strict DTCG export cannot contain reference cycles: ${cycles.map((cycle) => cycle.join(' -> ')).join('; ')}`);
  }
  const lookup = buildReferenceLookup(flattened);
  const resolvingTypes = new Set<string>();
  const resolveType = (id: string): string | undefined => {
    const target = lookup.get(id);
    if (!target) return undefined;
    if (target.entry.$type) return target.entry.$type;
    if (resolvingTypes.has(id)) return undefined;
    const reference = parseTokenReference(target.entry.$value);
    const referenceId = reference ? tokenReferenceToLookupId(reference) : undefined;
    if (!referenceId) return undefined;
    resolvingTypes.add(id);
    const inferred = resolveType(referenceId);
    resolvingTypes.delete(id);
    if (inferred && ALLOWED_TYPES.has(inferred)) target.entry.$type = inferred as TokenObject['$type'];
    return inferred;
  };
  for (const id of lookup.keys()) resolveType(id);
  const kept = new Map<string, Set<string>>();
  const dropped: Record<string, DroppedToken[]> = {};
  const dropById = new Map<string, DroppedToken>();

  for (const doc of flattened) {
    kept.set(doc.key, new Set());
    for (const [name, entry] of Object.entries(doc.entries)) {
      const id = `${doc.moduleId}.${name}`;
      if (entry.$type && isZebkitSupportedSpecType(entry.$type)) {
        kept.get(doc.key)!.add(name);
      } else {
        const drop: DroppedToken = {
          name,
          $type: entry.$type ?? '(none)',
          reason: entry.$type && isDtcgSpecType(entry.$type) ? 'unsupported-type' : 'proprietary-type',
        };
        (dropped[doc.key] ??= []).push(drop);
        dropById.set(id, drop);
      }
    }
  }

  let changed = true;
  while (changed) {
    changed = false;
    for (const doc of flattened) {
      for (const name of [...kept.get(doc.key)!]) {
        const entry = doc.entries[name];
        for (const reference of enumerateTokenReferences(entry.$value, entry.$type)) {
          const lookupId = tokenReferenceToLookupId(reference.target);
          const targetInfo = lookupId ? lookup.get(lookupId) : undefined;
          const targetIsKept = targetInfo ? kept.get(targetInfo.key)?.has(targetInfo.name) === true : false;
          let reason: DroppedToken['reason'] | undefined;
          if (!targetInfo) reason = 'missing-reference';
          else if (!targetIsKept) reason = (lookupId && dropById.get(lookupId)?.reason === 'proprietary-type')
            ? 'referenced-proprietary'
            : 'referenced-dropped';
          else if (!isCompatibleReference(reference.expectedType as any, targetInfo.entry.$type)) reason = 'incompatible-reference';
          if (!reason) continue;
          kept.get(doc.key)!.delete(name);
          const drop: DroppedToken = {
            name,
            $type: entry.$type ?? '(none)',
            reason,
            referencedTarget: reference.target,
          };
          (dropped[doc.key] ??= []).push(drop);
          dropById.set(`${doc.moduleId}.${name}`, drop);
          changed = true;
          break;
        }
      }
    }
  }

  const strictDocuments: Record<string, Record<string, unknown>> = {};
  for (const doc of flattened) {
    const entries: TokenInterface = {};
    for (const name of kept.get(doc.key)!) entries[name] = doc.entries[name];
    strictDocuments[doc.key] = toDtcgDocument(entries, doc.meta);
  }
  for (const key of Object.keys(dropped)) {
    dropped[key].sort((a, b) => a.name.localeCompare(b.name) || a.reason.localeCompare(b.reason));
  }
  return { documents: strictDocuments, dropped };
}

const ALLOWED_TYPES = new Set<string>(allowedTokenTypes.options);

/**
 * Validate one exported DTCG document (a module) for zebkit-conformance: it
 * parses (no `$ref`/`$extends`, well-formed groups), every leaf resolves a
 * `$type` in the allowed set (spec + documented proprietary registry), and
 * every entry has a literal value matching the registry for its effective type,
 * or a whole-value alias for collection-level resolution. Returns human-readable
 * problems with source paths; empty means valid.
 */
export function validateDtcgDocument(
  doc: unknown,
  label = 'document',
  options: { strict?: boolean } = {}
): string[] {
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) {
    return [`${label}: not a JSON object`];
  }
  const parsed = parseDtcgDocument(doc as Record<string, unknown>, 'literal', label);
  const errors = [...parsed.errors];
  errors.push(...validateParsedMetadata(parsed, label));
  errors.push(...validateParsedEntries(parsed, label, options));
  return errors;
}

function schemaIssue(pathLabel: string, result: { success: boolean; error?: { issues?: Array<{ path: PropertyKey[]; message: string }> } }): string[] {
  if (result.success) return [];
  return (result.error?.issues ?? []).map((issue) =>
    `${pathLabel}${issue.path.length ? `.${issue.path.map(String).join('.')}` : ''}: ${issue.message}`
  );
}

function validateParsedMetadata(parsed: ParsedDtcgDocument, label: string): string[] {
  const errors: string[] = [];
  if (parsed.meta.extensions) {
    errors.push(...schemaIssue(`${label}.$extensions`, tokenGroupExtensionsSchema.safeParse(parsed.meta.extensions)));
  }
  for (const metadata of parsed.meta.groupMetadata ?? []) {
    const name = metadata.path.join('.');
    if (metadata.$extensions) {
      errors.push(...schemaIssue(`${label}.${name}.$extensions`, tokenGroupExtensionsSchema.safeParse(metadata.$extensions)));
    }
    if (metadata.$deprecated !== undefined && typeof metadata.$deprecated !== 'boolean' && typeof metadata.$deprecated !== 'string') {
      errors.push(`${label}.${name}.$deprecated: expected a boolean or string`);
    }
  }
  return errors;
}

function validateParsedEntries(
  parsed: ParsedDtcgDocument,
  label: string,
  options: { strict?: boolean },
  effectiveTypes: ReadonlyMap<string, string> = new Map()
): string[] {
  const errors: string[] = [];
  for (const [name, entry] of Object.entries(parsed.entries)) {
    const type = entry.$type || effectiveTypes.get(name);
    if (!type) {
      errors.push(`${label}.${name}: no $type (and no group $type to inherit)`);
      continue;
    } else if (!ALLOWED_TYPES.has(type)) {
      errors.push(`${label}.${name}: unknown $type '${type}'`);
      continue;
    }
    if (options.strict && !isZebkitSupportedSpecType(type)) {
      errors.push(`${label}.${name}: non-spec $type '${type}' or unsupported DTCG type is not allowed in strict mode`);
      continue;
    }
    if (entry.$value === undefined) {
      errors.push(`${label}.${name}: missing $value`);
      continue;
    }
    if (typeof entry.$description !== 'string') {
      errors.push(`${label}.${name}: missing $description`);
    }
    if (entry.$deprecated !== undefined && typeof entry.$deprecated !== 'boolean' && typeof entry.$deprecated !== 'string') {
      errors.push(`${label}.${name}.$deprecated: expected a boolean or string`);
    }
    if (entry.$extensions) {
      errors.push(...schemaIssue(`${label}.${name}.$extensions`, tokenExtensionsSchema.safeParse(entry.$extensions)));
    }
    if (zbkExtension(entry)?.emptyColorPlaceholder === true && !isTransparentPlaceholderValue(entry.$value)) {
      errors.push(`${label}.${name}: emptyColorPlaceholder requires the structured transparent color value`);
    }
    const result = validateTokenValue(type as Parameters<typeof validateTokenValue>[0], entry.$value);
    if (!result.success) {
      errors.push(`${label}.${name}: value does not match $type '${type}'`);
    }
  }
  return errors;
}

/** Validate an entire theme so aliases can be checked across module documents. */
export function validateDtcgDocuments(
  documents: Record<string, Record<string, unknown>>,
  label = 'collection',
  options: { strict?: boolean } = {}
): string[] {
  const errors: string[] = [];
  const flattened: FlattenedDocument[] = [];
  for (const [key, document] of Object.entries(documents)) {
    const documentLabel = `${label}/${key}`;
    if (!document || typeof document !== 'object' || Array.isArray(document)) {
      errors.push(`${documentLabel}: not a JSON object`);
      continue;
    }
    const parsed = parseDtcgDocument(document, 'literal', documentLabel);
    errors.push(...parsed.errors, ...validateParsedMetadata(parsed, documentLabel));
    flattened.push({ key, moduleId: moduleIdForDocument(key), entries: parsed.entries, meta: parsed.meta });
  }
  const lookup = buildReferenceLookup(flattened);
  const effectiveTypes = new Map<string, string>();
  const resolvingTypes = new Set<string>();
  const resolveEffectiveType = (id: string): string | undefined => {
    if (effectiveTypes.has(id)) return effectiveTypes.get(id);
    if (resolvingTypes.has(id)) return undefined;
    const target = lookup.get(id);
    if (!target) return undefined;
    if (target.entry.$type) {
      effectiveTypes.set(id, target.entry.$type);
      return target.entry.$type;
    }
    const reference = parseTokenReference(target.entry.$value);
    const referenceId = reference ? tokenReferenceToLookupId(reference) : undefined;
    if (!referenceId) return undefined;
    resolvingTypes.add(id);
    const inferred = resolveEffectiveType(referenceId);
    resolvingTypes.delete(id);
    if (inferred) effectiveTypes.set(id, inferred);
    return inferred;
  };
  for (const id of lookup.keys()) resolveEffectiveType(id);

  for (const doc of flattened) {
    const documentTypes = new Map<string, string>();
    for (const name of Object.keys(doc.entries)) {
      const type = effectiveTypes.get(`${doc.moduleId}.${name}`);
      if (type) documentTypes.set(name, type);
    }
    errors.push(...validateParsedEntries(
      { entries: doc.entries, meta: doc.meta, errors: [] },
      `${label}/${doc.key}`,
      options,
      documentTypes
    ));
    for (const [name, entry] of Object.entries(doc.entries)) {
      const source = `${label}/${doc.key}.${name}`;
      const sourceId = `${doc.moduleId}.${name}`;
      const sourceType = effectiveTypes.get(sourceId);
      if (!sourceType || !ALLOWED_TYPES.has(sourceType)) continue;
      for (const reference of enumerateTokenReferences(
        entry.$value,
        sourceType as Parameters<typeof enumerateTokenReferences>[1]
      )) {
        const lookupId = tokenReferenceToLookupId(reference.target);
        const targetInfo = lookupId ? lookup.get(lookupId) : undefined;
        if (!targetInfo) {
          errors.push(`${source}: missing reference target '${reference.target}'`);
        } else {
          const targetType = lookupId ? resolveEffectiveType(lookupId) : undefined;
          if (!targetType || !isCompatibleReference(reference.expectedType, targetType)) {
            errors.push(`${source}: reference '${reference.target}' has type '${targetType ?? '(none)'}', expected '${reference.expectedType}'`);
          }
        }
      }
    }
  }
  const tokenMap = Object.fromEntries(flattened.map((doc) => [doc.key, doc.entries]));
  for (const cycle of findTokenReferenceCycles(buildTokenReferenceGraph(tokenMap))) {
    errors.push(`${label}: reference cycle ${cycle.join(' -> ')}`);
  }
  return errors;
}
