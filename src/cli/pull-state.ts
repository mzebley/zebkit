import { createHash } from 'node:crypto';
import path from 'node:path';
import type { ComponentsFilter } from '../scripts/components-config';
import {
  extractVariantOverrideEntries,
  isVariantOverrideFile,
} from '../scripts/tokens/compile-variant-helpers';

export const PULL_STATE_VERSION = 1;
export const PULL_STATE_RELATIVE_PATH = '.zebkit/pull-state.json';

export type TokenModuleManifestEntry = { key: string; file: string };

export type PullState = {
  stateVersion: typeof PULL_STATE_VERSION;
  basePreset: string;
  modules: Record<string, { file: string; tokens: Record<string, string> }>;
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

/** Token override files contain only entries with a concrete authorable value. */
export function getAuthorableTokenData(raw: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(raw).filter(
      ([key, token]) =>
        !key.startsWith('_') &&
        isRecord(token) &&
        Object.prototype.hasOwnProperty.call(token, 'value')
    )
  );
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
    const tokens = getAuthorableTokenData(raw);
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
          tokens: Object.fromEntries(
            Object.entries(module.tokens).map(([tokenKey, value]) => [tokenKey, hashToken(value)])
          ),
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
        Object.values(module.tokens).every((hash) => typeof hash === 'string')
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

    let dirty = !exists;
    for (const [tokenKey, currentValue] of Object.entries(currentModule.tokens)) {
      if (!(tokenKey in projectTokens)) {
        projectTokens[tokenKey] = currentValue;
        summary.keysAdded += 1;
        dirty = true;
        continue;
      }

      const oldHash = priorState?.modules[moduleKey]?.tokens[tokenKey];
      if (
        oldHash &&
        hashToken(projectTokens[tokenKey]) === oldHash &&
        hashToken(currentValue) !== oldHash
      ) {
        projectTokens[tokenKey] = currentValue;
        summary.defaultsUpdated += 1;
        dirty = true;
      }
    }

    for (const [tokenKey, oldHash] of Object.entries(
      priorState?.modules[moduleKey]?.tokens ?? {}
    )) {
      if (tokenKey in currentModule.tokens || !(tokenKey in projectTokens)) continue;
      if (hashToken(projectTokens[tokenKey]) === oldHash) {
        delete projectTokens[tokenKey];
        summary.keysRemoved += 1;
        dirty = true;
      } else {
        summary.preservedRetired.push(`${moduleKey}.${tokenKey}`);
      }
    }

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

    for (const [tokenKey, oldHash] of Object.entries(oldModule.tokens)) {
      if (!(tokenKey in projectTokens)) continue;
      if (hashToken(projectTokens[tokenKey]) === oldHash) {
        delete projectTokens[tokenKey];
        summary.keysRemoved += 1;
      } else {
        summary.preservedRetired.push(`${moduleKey}.${tokenKey}`);
      }
    }

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
