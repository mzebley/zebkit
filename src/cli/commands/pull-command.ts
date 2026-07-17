import path from 'path';
import type { ZebkitConfig } from '../../scripts/config';
import { resolveComponentsFilter } from '../../scripts/components-config';
import { getPullStatePath, readTokenSnapshot, syncTokenSnapshot } from '../pull-state';
import { copyAgentContext, writeVscodeSettings, type ContextCopyDeps } from './init-command';

export interface PullCommandDeps extends ContextCopyDeps {
  readJson: (path: string) => Promise<any>;
  readJsonSafe: (path: string) => Promise<any>;
  writeJson: (path: string, data: any, options?: any) => Promise<void>;
  readConfig: () => Promise<{ config: ZebkitConfig; path: string } | undefined>;
  getZebkitDefaultsDir: () => string;
  getZebkitPackageRoot: () => string;
  getZebkitContextDir: () => string;
  getProjectDir: () => string;
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
  projectDir: string,
  deps: PullCommandDeps
): Promise<void> {
  const contextPath = config.context?.path;
  if (!contextPath) return; // omitted or false = opted out

  const { excluded } = resolveComponentsFilter(config.components);
  const targetDir = path.resolve(projectDir, contextPath);
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

export async function runPullCommand(deps: PullCommandDeps) {
  deps.log('Syncing tokens...\n');

  const configResult = await deps.readConfig();
  if (!configResult) {
    deps.log('No zebkit config found. Run `zebkit init` first.');
    process.exit(1);
  }

  const { path: configPath } = configResult;
  const projectDir = deps.getProjectDir();
  const config = configResult.config;

  // Agent context is independent of tokens — refresh it before the tokenPath gate.
  await refreshAgentContext(config, projectDir, deps);

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

  // Config paths follow the build command's established convention: they are
  // relative to the project working directory, even when --config is nested.
  const tokensDir = path.resolve(projectDir, customTokenPath);
  const manifestPath = path.join(sourceDir, 'manifest.json');

  if (!(await deps.pathExists(manifestPath))) {
    deps.log(
      `Token snapshot for base preset "${basePreset}" not found at ${manifestPath}. ` +
        'Run `npm run build:defaults` in zebkit.'
    );
    process.exit(1);
  }

  await deps.ensureDir(tokensDir);

  const snapshot = await readTokenSnapshot(sourceDir, deps);
  const summary = await syncTokenSnapshot({
    tokensDir,
    configPath,
    basePreset,
    snapshot,
    deps,
  });

  const changedCount =
    summary.filesAdded.length +
    summary.filesRemoved.length +
    summary.keysAdded +
    summary.defaultsUpdated +
    summary.keysRemoved;

  if (changedCount === 0) {
    deps.log('Already up to date.');
  } else {
    const parts = [
      summary.filesAdded.length && `${summary.filesAdded.length} file${summary.filesAdded.length === 1 ? '' : 's'} added`,
      summary.filesRemoved.length && `${summary.filesRemoved.length} untouched retired file${summary.filesRemoved.length === 1 ? '' : 's'} removed`,
      summary.keysAdded && `${summary.keysAdded} new key${summary.keysAdded === 1 ? '' : 's'} added`,
      summary.defaultsUpdated && `${summary.defaultsUpdated} untouched default${summary.defaultsUpdated === 1 ? '' : 's'} updated`,
      summary.keysRemoved && `${summary.keysRemoved} untouched retired key${summary.keysRemoved === 1 ? '' : 's'} removed`,
    ].filter(Boolean);
    deps.log(parts.join(', ') + '.');
  }

  if (summary.establishedBaseline) {
    const statePath = path.relative(path.dirname(configPath), getPullStatePath(configPath));
    deps.log(`Established ${statePath} baseline; commit this file with the project.`);
  }
  for (const token of summary.preservedRetired) {
    deps.log(`Warning: preserved customized retired token ${token}; migrate or remove it manually.`);
  }

  await writeVscodeSettings(projectDir, customTokenPath, snapshot.manifest.modules, deps);
  deps.log('Updated .vscode/settings.json for editor support');
}
