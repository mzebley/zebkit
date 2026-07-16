import path from 'path';
import type { ZebkitConfig } from '../../scripts/config';
import { resolveComponentsFilter } from '../../scripts/components-config';
import { copyAgentContext, writeVscodeSettings, type ContextCopyDeps } from './init-command';

export interface PullCommandDeps extends ContextCopyDeps {
  pathExists: (path: string) => Promise<boolean>;
  readJson: (path: string) => Promise<any>;
  readJsonSafe: (path: string) => Promise<any>;
  writeJson: (path: string, data: any, options?: any) => Promise<void>;
  ensureDir: (path: string) => Promise<void>;
  readdir: (path: string) => Promise<string[]>;
  copyFile: (src: string, dest: string) => Promise<void>;
  readConfig: () => Promise<{ config: ZebkitConfig; path: string } | undefined>;
  getZebkitDefaultsDir: () => string;
  getZebkitPackageRoot: () => string;
  getZebkitContextDir: () => string;
  /** Maps a base preset name to its bundled token snapshot dir (defaults dir for `default`). */
  resolveBundledThemeTokensDir: (
    themeName: string,
    defaultsDir: string,
    packageRoot: string
  ) => string;
  log: (message: string) => void;
}

/**
 * Refreshes the consumer's agent-context directory from the bundled context,
 * when `context.path` is configured. Honors the components include/exclude block
 * (per-component docs for excluded components are skipped; llms.txt is always
 * copied). Independent of token sync.
 */
async function refreshAgentContext(
  config: ZebkitConfig,
  configPath: string,
  deps: PullCommandDeps
): Promise<void> {
  const contextPath = config.context?.path;
  if (!contextPath) return; // omitted or false = opted out

  const { excluded } = resolveComponentsFilter(config.components);
  const targetDir = path.resolve(path.dirname(configPath), contextPath);
  const copied = await copyAgentContext(
    targetDir,
    deps.getZebkitContextDir(),
    excluded,
    deps
  );
  if (copied > 0) {
    deps.log(`Refreshed ${copied} agent context file${copied === 1 ? '' : 's'} in ${contextPath}`);
  }
}

async function countNewKeys(
  defaultTokenData: Record<string, unknown>,
  projectFilePath: string,
  moduleKey: string,
  deps: Pick<PullCommandDeps, 'pathExists' | 'readJson'>
): Promise<number> {
  if (!(await deps.pathExists(projectFilePath))) {
    return 0;
  }

  const projectFile = (await deps.readJson(projectFilePath)) as Record<string, any>;
  const defaultData = { ...defaultTokenData };
  delete (defaultData as any)._key;
  delete (defaultData as any)._layer;

  const projectTokens = projectFile[moduleKey] || {};
  let newKeysCount = 0;

  for (const key of Object.keys(defaultData)) {
    if (!(key in projectTokens)) {
      newKeysCount++;
    }
  }

  return newKeysCount;
}

async function mergeTokenFile(
  defaultTokenData: Record<string, unknown>,
  projectFilePath: string,
  moduleKey: string,
  deps: Pick<PullCommandDeps, 'readJson' | 'writeJson'>
): Promise<void> {
  const projectFile = (await deps.readJson(projectFilePath)) as Record<string, any>;
  const defaultData = { ...defaultTokenData };
  delete (defaultData as any)._key;
  delete (defaultData as any)._layer;

  const projectTokens = projectFile[moduleKey] || {};

  for (const [key, value] of Object.entries(defaultData)) {
    if (!(key in projectTokens)) {
      projectTokens[key] = value;
    }
  }

  projectFile[moduleKey] = projectTokens;
  await deps.writeJson(projectFilePath, projectFile, { spaces: 2 });
}

export async function runPullCommand(deps: PullCommandDeps) {
  deps.log('Syncing tokens...\n');

  const configResult = await deps.readConfig();
  if (!configResult) {
    deps.log('No zebkit config found. Run `zebkit init` first.');
    process.exit(1);
  }

  const { config, path: configPath } = configResult;

  // Agent context is independent of tokens — refresh it before the tokenPath gate.
  await refreshAgentContext(config, configPath, deps);

  const customTokenPath = config.tokens?.tokenPath;

  if (!customTokenPath) {
    deps.log(
      'No tokenPath set in config — nothing to pull into.\n' +
        'Set `tokens.tokenPath` (e.g. "./tokens") or re-run `zebkit init` and choose to copy token files.'
    );
    return;
  }

  // Pull from the snapshot of the configured base preset, not always the default
  // theme — otherwise a preset-based project gets default-theme values for new keys.
  const basePreset = config.tokens?.basePreset ?? 'default';
  const defaultsDir = deps.getZebkitDefaultsDir();
  const sourceDir = deps.resolveBundledThemeTokensDir(
    basePreset,
    defaultsDir,
    deps.getZebkitPackageRoot()
  );

  const tokensDir = path.resolve(path.dirname(configPath), customTokenPath);
  const manifestPath = path.join(sourceDir, 'manifest.json');

  if (!(await deps.pathExists(manifestPath))) {
    deps.log(
      `Token snapshot for base preset "${basePreset}" not found at ${manifestPath}. ` +
        'Run `npm run build:defaults` in zebkit.'
    );
    process.exit(1);
  }

  await deps.ensureDir(tokensDir);

  const manifest = (await deps.readJson(manifestPath)) as {
    modules: Array<{ key: string; file: string }>;
  };

  const results: Array<{ file: string; status: 'added' | 'updated'; count?: number }> = [];

  for (const mod of manifest.modules) {
    const srcFile = path.join(sourceDir, mod.file);
    const destFile = path.join(tokensDir, mod.file);
    const raw = (await deps.readJson(srcFile)) as Record<string, unknown>;
    const { _key, _layer, ...defaultTokenData } = raw;

    const fileExists = await deps.pathExists(destFile);

    if (!fileExists) {
      await deps.writeJson(destFile, { [mod.key]: defaultTokenData }, { spaces: 2 });
      results.push({ file: mod.file, status: 'added' });
    } else {
      const newKeysCount = await countNewKeys(defaultTokenData, destFile, mod.key, deps);

      if (newKeysCount > 0) {
        await mergeTokenFile(defaultTokenData, destFile, mod.key, deps);
        results.push({ file: mod.file, status: 'updated', count: newKeysCount });
      }
    }
  }

  if (results.length === 0) {
    deps.log('Already up to date.');
  } else {
    const added = results.filter((r) => r.status === 'added');
    const updated = results.filter((r) => r.status === 'updated');

    const maxLen = Math.max(...results.map((r) => r.file.length), 0);

    for (const result of added) {
      const filename = result.file.replace('.json', '');
      deps.log(`  + ${filename}.json${' '.repeat(Math.max(0, maxLen - result.file.length))} (new)`);
    }

    for (const result of updated) {
      const filename = result.file.replace('.json', '');
      deps.log(`  ~ ${filename}.json${' '.repeat(Math.max(0, maxLen - result.file.length))} (${result.count} new key${result.count === 1 ? '' : 's'} added)`);
    }

    deps.log('');
    deps.log(
      `${added.length} file${added.length === 1 ? '' : 's'} added, ${updated.length} file${updated.length === 1 ? '' : 's'} updated.`
    );
  }

  await writeVscodeSettings(path.dirname(configPath), customTokenPath, manifest.modules, deps);
  deps.log('Updated .vscode/settings.json for editor support');
}
