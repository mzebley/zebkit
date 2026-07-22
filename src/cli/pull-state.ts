import { createHash } from 'node:crypto';
import path from 'node:path';
import type { ComponentsFilter } from '../scripts/components-config';
import {
  extractVariantOverrideEntries,
  isVariantOverrideFile,
} from '../scripts/tokens/compile-variant-helpers';
import { fromDtcgDocument, toDtcgDocument } from '../scripts/tokens/dtcg-document';
import type { TokenInterface } from '../definitions/tokens';

export const PULL_STATE_VERSION = 2;
export const PULL_STATE_RELATIVE_PATH = '.zebkit/pull-state.json';

export type TokenModuleManifestEntry = { key: string; file: string };

export type PullState = {
  stateVersion: typeof PULL_STATE_VERSION;
  basePreset: string;
  modules: Record<
    string,
    {
      file: string;
      /** DTCG token paths (`group.child`, including terminal `$root`) to shipped-value hashes. */
      tokens: Record<string, string>;
      /** Structural group paths. Empty groups have no other state, so they must be explicit. */
      groups: string[];
      /** JSON-pointer paths to atomic group-metadata values. */
      groupMetadata: Record<string, string>;
    }
  >;
  variants?: Record<string, { file: string; variants: Record<string, string> }>;
};

export type TokenSnapshot = {
  manifest: { modules: TokenModuleManifestEntry[] };
  modules: Record<string, { file: string; tokens: Record<string, unknown> }>;
};

export type VariantSnapshot = {
  components: Record<string, { file: string; variants: Record<string, unknown> }>;
};

export type PullSyncSummary = {
  filesAdded: string[];
  filesRemoved: string[];
  keysAdded: number;
  defaultsUpdated: number;
  keysRemoved: number;
  preservedRetired: string[];
  variantFilesAdded: string[];
  variantFilesRemoved: string[];
  variantsAdded: number;
  variantDefaultsUpdated: number;
  variantsRemoved: number;
  preservedRetiredVariants: string[];
  establishedBaseline: boolean;
};

export interface PullStateDeps {
  pathExists: (path: string) => Promise<boolean>;
  readJson: (path: string) => Promise<any>;
  readJsonSafe: (path: string) => Promise<any>;
  writeJson: (path: string, data: any, options?: any) => Promise<void>;
  ensureDir: (path: string) => Promise<void>;
  remove: (path: string) => Promise<void>;
}

export interface VariantSnapshotDeps {
  pathExists: (path: string) => Promise<boolean>;
  readJson: (path: string) => Promise<any>;
  readdir: (path: string) => Promise<string[]>;
}

function isRecord(value: unknown): value is Record<string, any> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (isRecord(value)) {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => `${JSON.stringify(key)}:${stableJson(child)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

function isSafeTokenFile(file: unknown): file is string {
  return (
    typeof file === 'string' &&
    /^zbk-[a-z0-9-]+\.tokens\.json$/.test(file) &&
    path.basename(file) === file
  );
}

function isSafeVariantFile(file: unknown): file is string {
  return (
    typeof file === 'string' &&
    /^zbk-[a-z0-9-]+\.variants\.json$/.test(file) &&
    path.basename(file) === file
  );
}

export function hashToken(value: unknown): string {
  return createHash('sha256').update(stableJson(value)).digest('hex');
}

const GROUP_METADATA_KEYS = ['$type', '$description', '$deprecated', '$extensions'] as const;

type StructuralValue = {
  path: string[];
  value: unknown;
};

type GroupMetadataValue = StructuralValue & {
  groupPath: string[];
};

type StructuralTokenDocument = {
  tokens: Map<string, StructuralValue>;
  groups: Map<string, string[]>;
  groupMetadata: Map<string, GroupMetadataValue>;
};

function tokenPathKey(pathSegments: string[]): string {
  return pathSegments.join('.');
}

function jsonPointer(pathSegments: string[]): string {
  return `/${pathSegments
    .map((segment) => segment.replace(/~/g, '~0').replace(/\//g, '~1'))
    .join('/')}`;
}

function fromJsonPointer(pointer: string): string[] {
  if (!pointer.startsWith('/')) throw new Error(`Invalid pull-state metadata path '${pointer}'.`);
  return pointer
    .slice(1)
    .split('/')
    .map((segment) => segment.replace(/~1/g, '/').replace(/~0/g, '~'));
}

function isTokenObject(value: unknown): value is Record<string, unknown> {
  return isRecord(value) && Object.prototype.hasOwnProperty.call(value, '$value');
}

function addMetadataValues(
  values: Map<string, GroupMetadataValue>,
  groupPath: string[],
  propertyPath: string[],
  value: unknown
): void {
  if (isRecord(value) && Object.keys(value).length > 0) {
    for (const [key, child] of Object.entries(value)) {
      addMetadataValues(values, groupPath, [...propertyPath, key], child);
    }
    return;
  }

  const pathSegments = [...groupPath, ...propertyPath];
  values.set(jsonPointer(pathSegments), {
    path: pathSegments,
    groupPath: [...groupPath],
    value,
  });
}

/** Split a DTCG document into independently reconcilable token, group, and metadata units. */
function describeTokenDocument(document: Record<string, unknown>): StructuralTokenDocument {
  const described: StructuralTokenDocument = {
    tokens: new Map(),
    groups: new Map(),
    groupMetadata: new Map(),
  };

  const walkGroup = (group: Record<string, unknown>, groupPath: string[]) => {
    if (groupPath.length > 0) described.groups.set(tokenPathKey(groupPath), [...groupPath]);

    for (const metadataKey of GROUP_METADATA_KEYS) {
      if (!Object.prototype.hasOwnProperty.call(group, metadataKey)) continue;
      addMetadataValues(
        described.groupMetadata,
        groupPath,
        [metadataKey],
        group[metadataKey]
      );
    }

    if (Object.prototype.hasOwnProperty.call(group, '$root')) {
      const rootPath = [...groupPath, '$root'];
      described.tokens.set(tokenPathKey(rootPath), {
        path: rootPath,
        value: group.$root,
      });
    }

    for (const [key, value] of Object.entries(group)) {
      if (key.startsWith('$')) continue;
      const childPath = [...groupPath, key];
      if (isTokenObject(value)) {
        described.tokens.set(tokenPathKey(childPath), { path: childPath, value });
      } else if (isRecord(value)) {
        walkGroup(value, childPath);
      }
    }
  };

  walkGroup(document, []);
  return described;
}

function hasOwnAtPath(root: Record<string, unknown>, pathSegments: string[]): boolean {
  let current: unknown = root;
  for (const segment of pathSegments) {
    if (!isRecord(current) || !Object.prototype.hasOwnProperty.call(current, segment)) {
      return false;
    }
    current = current[segment];
  }
  return true;
}

function valueAtPath(root: Record<string, unknown>, pathSegments: string[]): unknown {
  let current: unknown = root;
  for (const segment of pathSegments) {
    if (!isRecord(current) || !Object.prototype.hasOwnProperty.call(current, segment)) {
      return undefined;
    }
    current = current[segment];
  }
  return current;
}

function defineOwn(record: Record<string, unknown>, key: string, value: unknown): void {
  Object.defineProperty(record, key, {
    value,
    enumerable: true,
    configurable: true,
    writable: true,
  });
}

function formatTokenPath(moduleKey: string, pathSegments: string[]): string {
  return `${moduleKey}.${tokenPathKey(pathSegments)}`;
}

function shapeConflict(
  moduleKey: string,
  pathSegments: string[],
  packageShape: 'token' | 'group',
  projectShape: string
): Error {
  const tokenPath = formatTokenPath(moduleKey, pathSegments);
  return new Error(
    `Token shape conflict at '${tokenPath}': the package defines a ${packageShape}, ` +
      `but the project file contains ${projectShape}. Remove or relocate '${tokenPath}' ` +
      `and run zebkit pull again.`
  );
}

function ensureGroupAtPath(
  root: Record<string, unknown>,
  pathSegments: string[],
  moduleKey: string
): { group: Record<string, unknown>; created: boolean } {
  let group = root;
  let created = false;
  for (let index = 0; index < pathSegments.length; index += 1) {
    const segment = pathSegments[index];
    const traversed = pathSegments.slice(0, index + 1);
    if (!Object.prototype.hasOwnProperty.call(group, segment)) {
      const child: Record<string, unknown> = {};
      defineOwn(group, segment, child);
      group = child;
      created = true;
      continue;
    }
    const existing = group[segment];
    if (!isRecord(existing) || isTokenObject(existing)) {
      throw shapeConflict(
        moduleKey,
        traversed,
        'group',
        isTokenObject(existing) ? 'a token' : 'a non-object value'
      );
    }
    group = existing;
  }
  return { group, created };
}

function setAtPath(
  root: Record<string, unknown>,
  pathSegments: string[],
  value: unknown,
  moduleKey: string,
  expectedShape?: 'token'
): void {
  const parentPath = pathSegments.slice(0, -1);
  const { group } = ensureGroupAtPath(root, parentPath, moduleKey);
  const leaf = pathSegments[pathSegments.length - 1];
  if (expectedShape === 'token' && Object.prototype.hasOwnProperty.call(group, leaf)) {
    const existing = group[leaf];
    if (!isTokenObject(existing)) {
      throw shapeConflict(
        moduleKey,
        pathSegments,
        'token',
        isRecord(existing) ? 'a group' : 'a non-object value'
      );
    }
  }
  defineOwn(group, leaf, value);
}

function setMetadataAtPath(
  root: Record<string, unknown>,
  metadata: GroupMetadataValue,
  value: unknown,
  moduleKey: string
): void {
  const { group } = ensureGroupAtPath(root, metadata.groupPath, moduleKey);
  const propertyPath = metadata.path.slice(metadata.groupPath.length);
  let container = group;
  for (let index = 0; index < propertyPath.length - 1; index += 1) {
    const segment = propertyPath[index];
    if (!Object.prototype.hasOwnProperty.call(container, segment)) {
      const child: Record<string, unknown> = {};
      defineOwn(container, segment, child);
      container = child;
      continue;
    }
    const existing = container[segment];
    if (!isRecord(existing)) {
      throw new Error(
        `Token metadata shape conflict at '${formatTokenPath(moduleKey, [
          ...metadata.groupPath,
          ...propertyPath.slice(0, index + 1),
        ])}': the package defines nested metadata, but the project file contains ` +
          `a non-object value. Remove or relocate that metadata and run zebkit pull again.`
      );
    }
    container = existing;
  }
  defineOwn(container, propertyPath[propertyPath.length - 1], value);
}

function deleteAtPath(root: Record<string, unknown>, pathSegments: string[]): void {
  const parent = valueAtPath(root, pathSegments.slice(0, -1));
  if (isRecord(parent)) delete parent[pathSegments[pathSegments.length - 1]];
}

function pruneEmptyMetadataContainers(
  root: Record<string, unknown>,
  metadata: GroupMetadataValue
): void {
  for (
    let length = metadata.path.length - 1;
    length > metadata.groupPath.length;
    length -= 1
  ) {
    const containerPath = metadata.path.slice(0, length);
    const container = valueAtPath(root, containerPath);
    if (!isRecord(container) || Object.keys(container).length > 0) break;
    deleteAtPath(root, containerPath);
  }
}

function stateForDocument(document: Record<string, unknown>) {
  const described = describeTokenDocument(document);
  return {
    tokens: Object.fromEntries(
      [...described.tokens].map(([key, entry]) => [key, hashToken(entry.value)])
    ),
    groups: [...described.groups.keys()].sort((left, right) => left.localeCompare(right)),
    groupMetadata: Object.fromEntries(
      [...described.groupMetadata].map(([key, entry]) => [key, hashToken(entry.value)])
    ),
  };
}

function metadataFromStatePath(pointer: string): GroupMetadataValue {
  const pathSegments = fromJsonPointer(pointer);
  const metadataIndex = pathSegments.findIndex((segment) =>
    (GROUP_METADATA_KEYS as readonly string[]).includes(segment)
  );
  if (metadataIndex < 0) {
    throw new Error(`Invalid pull-state group metadata path '${pointer}'.`);
  }
  return {
    path: pathSegments,
    groupPath: pathSegments.slice(0, metadataIndex),
    value: undefined,
  };
}

type ModulePullState = PullState['modules'][string];

function reconcileTokenModule(
  moduleKey: string,
  projectTokens: Record<string, unknown>,
  currentTokens: Record<string, unknown>,
  priorModule: ModulePullState | undefined,
  summary: PullSyncSummary
): boolean {
  const current = describeTokenDocument(currentTokens);
  let dirty = false;

  // Token/group changes are intentionally surfaced as conflicts instead of
  // guessing whether a project customization should be destroyed.
  for (const groupPath of current.groups.values()) {
    if (!hasOwnAtPath(projectTokens, groupPath)) continue;
    const projectValue = valueAtPath(projectTokens, groupPath);
    if (!isRecord(projectValue) || isTokenObject(projectValue)) {
      throw shapeConflict(
        moduleKey,
        groupPath,
        'group',
        isTokenObject(projectValue) ? 'a token' : 'a non-object value'
      );
    }
  }
  for (const tokenEntry of current.tokens.values()) {
    if (!hasOwnAtPath(projectTokens, tokenEntry.path)) continue;
    const projectValue = valueAtPath(projectTokens, tokenEntry.path);
    if (!isTokenObject(projectValue)) {
      throw shapeConflict(
        moduleKey,
        tokenEntry.path,
        'token',
        isRecord(projectValue) ? 'a group' : 'a non-object value'
      );
    }
  }

  // Retire old leaves independently. Removing an untouched child must not be
  // blocked by a customized sibling in the same group.
  for (const [tokenKey, oldHash] of Object.entries(priorModule?.tokens ?? {})) {
    if (current.tokens.has(tokenKey)) continue;
    const tokenPath = tokenKey.split('.');
    if (!hasOwnAtPath(projectTokens, tokenPath)) continue;
    const projectValue = valueAtPath(projectTokens, tokenPath);
    if (hashToken(projectValue) === oldHash) {
      deleteAtPath(projectTokens, tokenPath);
      summary.keysRemoved += 1;
      dirty = true;
    } else {
      summary.preservedRetired.push(formatTokenPath(moduleKey, tokenPath));
    }
  }

  for (const [metadataKey, oldHash] of Object.entries(
    priorModule?.groupMetadata ?? {}
  )) {
    if (current.groupMetadata.has(metadataKey)) continue;
    const metadata = metadataFromStatePath(metadataKey);
    if (!hasOwnAtPath(projectTokens, metadata.path)) continue;
    const projectValue = valueAtPath(projectTokens, metadata.path);
    if (hashToken(projectValue) === oldHash) {
      deleteAtPath(projectTokens, metadata.path);
      pruneEmptyMetadataContainers(projectTokens, metadata);
      summary.keysRemoved += 1;
      dirty = true;
    } else {
      summary.preservedRetired.push(formatTokenPath(moduleKey, metadata.path));
    }
  }

  // Remove retired group shells only after their untouched contents have been
  // removed. Custom children or metadata keep the group and file alive.
  for (const groupKey of [...(priorModule?.groups ?? [])]
    .filter((key) => !current.groups.has(key))
    .sort((left, right) => right.split('.').length - left.split('.').length)) {
    const groupPath = groupKey.split('.');
    const projectValue = valueAtPath(projectTokens, groupPath);
    if (isRecord(projectValue) && !isTokenObject(projectValue) && Object.keys(projectValue).length === 0) {
      deleteAtPath(projectTokens, groupPath);
      dirty = true;
    }
  }

  // Materialize shipped empty groups. Non-empty groups are created by their
  // token or metadata leaves.
  for (const groupPath of current.groups.values()) {
    if (hasOwnAtPath(projectTokens, groupPath)) continue;
    const hasContent =
      [...current.tokens.values()].some((entry) =>
        entry.path.length > groupPath.length &&
        groupPath.every((segment, index) => entry.path[index] === segment)
      ) ||
      [...current.groupMetadata.values()].some((entry) =>
        entry.groupPath.length >= groupPath.length &&
        groupPath.every((segment, index) => entry.groupPath[index] === segment)
      ) ||
      [...current.groups.values()].some((entry) =>
        entry.length > groupPath.length &&
        groupPath.every((segment, index) => entry[index] === segment)
      );
    if (!hasContent) {
      ensureGroupAtPath(projectTokens, groupPath, moduleKey);
      summary.keysAdded += 1;
      dirty = true;
    }
  }

  for (const [tokenKey, currentEntry] of current.tokens) {
    const exists = hasOwnAtPath(projectTokens, currentEntry.path);
    const oldHash = priorModule?.tokens[tokenKey];
    if (!exists) {
      setAtPath(projectTokens, currentEntry.path, currentEntry.value, moduleKey, 'token');
      summary.keysAdded += 1;
      dirty = true;
      continue;
    }
    const projectValue = valueAtPath(projectTokens, currentEntry.path);
    if (
      oldHash &&
      hashToken(projectValue) === oldHash &&
      hashToken(currentEntry.value) !== oldHash
    ) {
      setAtPath(projectTokens, currentEntry.path, currentEntry.value, moduleKey, 'token');
      summary.defaultsUpdated += 1;
      dirty = true;
    }
  }

  for (const [metadataKey, currentEntry] of current.groupMetadata) {
    const exists = hasOwnAtPath(projectTokens, currentEntry.path);
    const oldHash = priorModule?.groupMetadata[metadataKey];
    if (!exists) {
      setMetadataAtPath(projectTokens, currentEntry, currentEntry.value, moduleKey);
      summary.keysAdded += 1;
      dirty = true;
      continue;
    }
    const projectValue = valueAtPath(projectTokens, currentEntry.path);
    if (
      oldHash &&
      hashToken(projectValue) === oldHash &&
      hashToken(currentEntry.value) !== oldHash
    ) {
      setMetadataAtPath(projectTokens, currentEntry, currentEntry.value, moduleKey);
      summary.defaultsUpdated += 1;
      dirty = true;
    }
  }

  return dirty;
}

/**
 * Token override files contain entries with a concrete authorable value, plus
 * the module's group-level `$extensions` member (fluid-scale controls) — the
 * only authorable surface for build-time scale settings.
 */
export function getAuthorableTokenData(raw: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(raw).filter(
      ([key, token]) =>
        (key === '$extensions' && isRecord(token)) ||
        (!key.startsWith('_') &&
          !key.startsWith('$') &&
          isRecord(token) &&
          Object.prototype.hasOwnProperty.call(token, '$value'))
    )
  );
}

/** Remove package-owned emission metadata while retaining authorable extensions. */
function authoringRootExtensions(
  extensions: Record<string, unknown> | undefined
): Record<string, unknown> | undefined {
  if (!extensions) return undefined;
  const authorable = structuredClone(extensions);
  const vendor = authorable['dev.zebkit'];
  if (isRecord(vendor)) {
    delete vendor.layer;
    delete vendor.cssEmission;
    if (Object.keys(vendor).length === 0) delete authorable['dev.zebkit'];
  }
  return Object.keys(authorable).length > 0 ? authorable : undefined;
}

export async function readTokenSnapshot(
  sourceDir: string,
  deps: Pick<PullStateDeps, 'readJson'>
): Promise<TokenSnapshot> {
  const manifestPath = path.join(sourceDir, 'manifest.json');
  const manifest = await deps.readJson(manifestPath);
  if (
    !isRecord(manifest) ||
    !Array.isArray(manifest.modules) ||
    manifest.modules.some(
      (module) =>
        !isRecord(module) ||
        typeof module?.key !== 'string' ||
        !/^zbk-[a-z0-9-]+$/.test(module.key) ||
        module.file !== `${module.key}.json`
    ) ||
    new Set(manifest.modules.map((module: TokenModuleManifestEntry) => module.key)).size !==
      manifest.modules.length
  ) {
    throw new Error(`Invalid bundled token manifest at ${manifestPath}.`);
  }

  const modules: TokenSnapshot['modules'] = {};
  for (const module of manifest.modules) {
    const raw = await deps.readJson(path.join(sourceDir, module.file));
    if (!isRecord(raw)) {
      throw new Error(`Bundled token module ${module.file} must contain a JSON object.`);
    }
    // Restore runtime/authoring values before materializing the pull snapshot.
    // This removes export-only generated scale values and restores raw CSS
    // values/types from their DTCG provenance extensions. Palette documents use
    // external emission for their defaults but remain authorable.
    const { entries, meta } = fromDtcgDocument(raw, { mode: 'runtime' });
    const authorableEntries = getAuthorableTokenData(entries) as TokenInterface;
    const extensions = authoringRootExtensions(meta.extensions ?? meta.groupExtensions);
    const tokens = toDtcgDocument(
      authorableEntries,
      {
        ...meta,
        extensions,
        groupExtensions: extensions,
      },
      { mode: 'authoring' }
    );
    if (Object.keys(tokens).length === 0) continue;
    modules[module.key] = {
      file: `${module.key}.tokens.json`,
      tokens,
    };
  }

  return { manifest: manifest as TokenSnapshot['manifest'], modules };
}

function toAuthorableVariant(entry: Record<string, any>): Record<string, unknown> {
  const defaultClassName = `zbk-${entry.component}--${entry.name}`;
  return {
    ...(typeof entry.axis === 'string' && entry.axis ? { axis: entry.axis } : {}),
    ...(typeof entry.description === 'string' && entry.description
      ? { description: entry.description }
      : {}),
    ...(typeof entry.className === 'string' &&
      entry.className &&
      entry.className !== defaultClassName
      ? { className: entry.className }
      : typeof entry.classNameOverride === 'string' && entry.classNameOverride
        ? { className: entry.classNameOverride }
        : {}),
    overrides: isRecord(entry.overrides) ? entry.overrides : {},
    ...(isRecord(entry.styles) ? { styles: entry.styles } : {}),
  };
}

/**
 * Builds the editable, effective shipped-variant snapshot used by pull. The
 * default package snapshot is patched by any bundled base-preset overrides,
 * then filtered through the consumer's components config.
 */
export async function readVariantSnapshot(
  defaultsDir: string,
  sourceDir: string,
  componentsFilter: ComponentsFilter,
  deps: VariantSnapshotDeps
): Promise<VariantSnapshot> {
  const snapshotPath = path.join(defaultsDir, 'variants.json');
  const raw = await deps.readJson(snapshotPath);
  if (!Array.isArray(raw)) {
    throw new Error(`Invalid bundled variant snapshot at ${snapshotPath}.`);
  }

  const shippedNames = new Set<string>();
  const effective = new Map<string, Record<string, any>>();

  for (const rawEntry of raw) {
    const [entry] = extractVariantOverrideEntries(rawEntry);
    if (!entry) {
      throw new Error(`Invalid bundled variant entry in ${snapshotPath}.`);
    }
    const component = entry.component.toLowerCase();
    const name = entry.name.toLowerCase();
    const key = `${component}::${name}`;
    shippedNames.add(key);
    effective.set(key, {
      ...entry,
      component,
      name,
      ...(typeof rawEntry.classNameOverride === 'string' && rawEntry.classNameOverride
        ? { className: rawEntry.classNameOverride }
        : {}),
    });
  }

  const presetOverridesDir = path.join(sourceDir, 'variant-overrides');
  if (await deps.pathExists(presetOverridesDir)) {
    const files = (await deps.readdir(presetOverridesDir))
      .filter(isVariantOverrideFile)
      .sort((left, right) => left.localeCompare(right));
    for (const file of files) {
      const data = await deps.readJson(path.join(presetOverridesDir, file));
      for (const entry of extractVariantOverrideEntries(data)) {
        const component = entry.component.toLowerCase();
        const name = entry.name.toLowerCase();
        const key = `${component}::${name}`;
        const existing = effective.get(key);
        effective.set(key, {
          ...existing,
          ...entry,
          component,
          name,
          overrides: {
            ...(existing?.overrides ?? {}),
            ...(entry.overrides ?? {}),
          },
        });
      }
    }
  }

  const components: VariantSnapshot['components'] = {};
  for (const [key, entry] of effective) {
    const component = entry.component as string;
    const name = entry.name as string;
    if (componentsFilter.excluded.has(component)) continue;
    const allowlist = componentsFilter.variantAllowlists.get(component);
    if (shippedNames.has(key) && allowlist && !allowlist.has(name)) continue;

    const componentSnapshot = components[component] ?? {
      file: `zbk-${component}.variants.json`,
      variants: {},
    };
    componentSnapshot.variants[name] = toAuthorableVariant(entry);
    components[component] = componentSnapshot;
  }

  return { components };
}

export function createPullState(
  basePreset: string,
  snapshot: TokenSnapshot,
  variantSnapshot?: VariantSnapshot
): PullState {
  return {
    stateVersion: PULL_STATE_VERSION,
    basePreset,
    modules: Object.fromEntries(
      Object.entries(snapshot.modules).map(([moduleKey, module]) => [
        moduleKey,
        {
          file: module.file,
          ...stateForDocument(module.tokens),
        },
      ])
    ),
    ...(variantSnapshot
      ? {
          variants: Object.fromEntries(
            Object.entries(variantSnapshot.components).map(([component, data]) => [
              component,
              {
                file: data.file,
                variants: Object.fromEntries(
                  Object.entries(data.variants).map(([name, value]) => [name, hashToken(value)])
                ),
              },
            ])
          ),
        }
      : {}),
  };
}

export function getPullStatePath(configPath: string): string {
  const configName = path.basename(configPath);
  const stateName =
    configName === 'zebkit.config.json'
      ? path.basename(PULL_STATE_RELATIVE_PATH)
      : `${configName.replace(/\.json$/i, '')}.pull-state.json`;
  return path.join(path.dirname(configPath), '.zebkit', stateName);
}

export async function writePullState(
  configPath: string,
  state: PullState,
  deps: Pick<PullStateDeps, 'ensureDir' | 'writeJson'>
): Promise<void> {
  const statePath = getPullStatePath(configPath);
  await deps.ensureDir(path.dirname(statePath));
  await deps.writeJson(statePath, state, { spaces: 2 });
}

export async function readPullState(
  configPath: string,
  deps: Pick<PullStateDeps, 'pathExists' | 'readJson'>
): Promise<PullState | undefined> {
  const statePath = getPullStatePath(configPath);
  if (!(await deps.pathExists(statePath))) return undefined;
  const value = await deps.readJson(statePath);
  const validModules =
    isRecord(value?.modules) &&
    Object.values(value.modules).every(
      (module) =>
        isRecord(module) &&
        isSafeTokenFile(module.file) &&
        isRecord(module.tokens) &&
        Object.values(module.tokens).every((hash) => typeof hash === 'string') &&
        Array.isArray(module.groups) &&
        module.groups.every((group) => typeof group === 'string') &&
        isRecord(module.groupMetadata) &&
        Object.entries(module.groupMetadata).every(
          ([metadataPath, hash]) => metadataPath.startsWith('/') && typeof hash === 'string'
        )
    );
  const validVariants =
    value?.variants === undefined ||
    (isRecord(value.variants) &&
      Object.values(value.variants).every(
        (component) =>
          isRecord(component) &&
          isSafeVariantFile(component.file) &&
          isRecord(component.variants) &&
          Object.values(component.variants).every((hash) => typeof hash === 'string')
      ));
  if (
    value?.stateVersion !== PULL_STATE_VERSION ||
    typeof value?.basePreset !== 'string' ||
    !validModules ||
    !validVariants
  ) {
    throw new Error(
      `Invalid pull state at ${statePath}. Remove it and run pull to establish a fresh baseline.`
    );
  }
  return value as PullState;
}

export async function syncTokenSnapshot(options: {
  tokensDir: string;
  configPath: string;
  basePreset: string;
  snapshot: TokenSnapshot;
  variantSnapshot?: VariantSnapshot;
  deps: PullStateDeps;
}): Promise<PullSyncSummary> {
  const { tokensDir, configPath, basePreset, snapshot, variantSnapshot, deps } = options;
  const priorState = await readPullState(configPath, deps);
  const summary: PullSyncSummary = {
    filesAdded: [],
    filesRemoved: [],
    keysAdded: 0,
    defaultsUpdated: 0,
    keysRemoved: 0,
    preservedRetired: [],
    variantFilesAdded: [],
    variantFilesRemoved: [],
    variantsAdded: 0,
    variantDefaultsUpdated: 0,
    variantsRemoved: 0,
    preservedRetiredVariants: [],
    establishedBaseline: !priorState,
  };

  for (const [moduleKey, currentModule] of Object.entries(snapshot.modules)) {
    const filePath = path.join(tokensDir, currentModule.file);
    const exists = await deps.pathExists(filePath);
    const projectTokens = exists ? await deps.readJson(filePath) : {};
    if (!isRecord(projectTokens)) {
      throw new Error(`Token file ${filePath} must contain a JSON object.`);
    }
    if (!exists) summary.filesAdded.push(currentModule.file);

    const reconciled = reconcileTokenModule(
      moduleKey,
      projectTokens,
      currentModule.tokens,
      priorState?.modules[moduleKey],
      summary
    );
    const dirty = !exists || reconciled;

    if (dirty) await deps.writeJson(filePath, projectTokens, { spaces: 2 });
  }

  for (const [moduleKey, oldModule] of Object.entries(priorState?.modules ?? {})) {
    if (Object.prototype.hasOwnProperty.call(snapshot.modules, moduleKey)) continue;
    const filePath = path.join(tokensDir, oldModule.file);
    if (!(await deps.pathExists(filePath))) continue;
    const projectTokens = await deps.readJson(filePath);
    if (!isRecord(projectTokens)) {
      throw new Error(`Token file ${filePath} must contain a JSON object.`);
    }

    reconcileTokenModule(moduleKey, projectTokens, {}, oldModule, summary);

    if (Object.keys(projectTokens).length === 0) {
      await deps.remove(filePath);
      summary.filesRemoved.push(oldModule.file);
    } else {
      await deps.writeJson(filePath, projectTokens, { spaces: 2 });
    }
  }

  for (const [component, currentComponent] of Object.entries(
    variantSnapshot?.components ?? {}
  )) {
    const filePath = path.join(tokensDir, currentComponent.file);
    const exists = await deps.pathExists(filePath);
    const projectData = exists ? await deps.readJson(filePath) : { [component]: {} };
    if (!isRecord(projectData) || !isRecord(projectData[component])) {
      throw new Error(
        `Variant file ${filePath} must contain a component-keyed object such as { "${component}": { ... } }.`
      );
    }
    if (!exists) summary.variantFilesAdded.push(currentComponent.file);

    const projectVariants = projectData[component] as Record<string, unknown>;
    let dirty = !exists;
    for (const [name, currentValue] of Object.entries(currentComponent.variants)) {
      if (!(name in projectVariants)) {
        projectVariants[name] = currentValue;
        summary.variantsAdded += 1;
        dirty = true;
        continue;
      }

      const oldHash = priorState?.variants?.[component]?.variants[name];
      if (
        oldHash &&
        hashToken(projectVariants[name]) === oldHash &&
        hashToken(currentValue) !== oldHash
      ) {
        projectVariants[name] = currentValue;
        summary.variantDefaultsUpdated += 1;
        dirty = true;
      }
    }

    for (const [name, oldHash] of Object.entries(
      priorState?.variants?.[component]?.variants ?? {}
    )) {
      if (name in currentComponent.variants || !(name in projectVariants)) continue;
      if (hashToken(projectVariants[name]) === oldHash) {
        delete projectVariants[name];
        summary.variantsRemoved += 1;
        dirty = true;
      } else {
        summary.preservedRetiredVariants.push(`${component}.${name}`);
      }
    }

    if (dirty) await deps.writeJson(filePath, projectData, { spaces: 2 });
  }

  for (const [component, oldComponent] of Object.entries(
    variantSnapshot ? (priorState?.variants ?? {}) : {}
  )) {
    if (Object.prototype.hasOwnProperty.call(variantSnapshot?.components ?? {}, component)) continue;
    const filePath = path.join(tokensDir, oldComponent.file);
    if (!(await deps.pathExists(filePath))) continue;
    const projectData = await deps.readJson(filePath);
    if (!isRecord(projectData) || !isRecord(projectData[component])) {
      throw new Error(
        `Variant file ${filePath} must contain a component-keyed object such as { "${component}": { ... } }.`
      );
    }
    const projectVariants = projectData[component] as Record<string, unknown>;

    for (const [name, oldHash] of Object.entries(oldComponent.variants)) {
      if (!(name in projectVariants)) continue;
      if (hashToken(projectVariants[name]) === oldHash) {
        delete projectVariants[name];
        summary.variantsRemoved += 1;
      } else {
        summary.preservedRetiredVariants.push(`${component}.${name}`);
      }
    }

    if (Object.keys(projectVariants).length === 0) {
      await deps.remove(filePath);
      summary.variantFilesRemoved.push(oldComponent.file);
    } else {
      await deps.writeJson(filePath, projectData, { spaces: 2 });
    }
  }

  const nextState = createPullState(basePreset, snapshot, variantSnapshot);
  if (!variantSnapshot && priorState?.variants) {
    nextState.variants = priorState.variants;
  }
  await writePullState(configPath, nextState, deps);
  return summary;
}
