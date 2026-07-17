import { createHash } from 'node:crypto';
import path from 'node:path';

export const PULL_STATE_VERSION = 1;
export const PULL_STATE_RELATIVE_PATH = '.zebkit/pull-state.json';

export type TokenModuleManifestEntry = { key: string; file: string };

export type PullState = {
  stateVersion: typeof PULL_STATE_VERSION;
  basePreset: string;
  modules: Record<string, { file: string; tokens: Record<string, string> }>;
};

export type TokenSnapshot = {
  manifest: { modules: TokenModuleManifestEntry[] };
  modules: Record<string, { file: string; tokens: Record<string, unknown> }>;
};

export type PullSyncSummary = {
  filesAdded: string[];
  filesRemoved: string[];
  keysAdded: number;
  defaultsUpdated: number;
  keysRemoved: number;
  preservedRetired: string[];
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

export function createPullState(basePreset: string, snapshot: TokenSnapshot): PullState {
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
  if (
    value?.stateVersion !== PULL_STATE_VERSION ||
    typeof value?.basePreset !== 'string' ||
    !validModules
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
  deps: PullStateDeps;
}): Promise<PullSyncSummary> {
  const { tokensDir, configPath, basePreset, snapshot, deps } = options;
  const priorState = await readPullState(configPath, deps);
  const summary: PullSyncSummary = {
    filesAdded: [],
    filesRemoved: [],
    keysAdded: 0,
    defaultsUpdated: 0,
    keysRemoved: 0,
    preservedRetired: [],
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

  await writePullState(configPath, createPullState(basePreset, snapshot), deps);
  return summary;
}
