import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { watch, type FSWatcher } from 'node:fs';
import { runTokenBuild } from '../../scripts/tokens/build-tokens.js';
import { loadZebkitConfig } from '../../scripts/config.js';
import { getZebkitPackageRoot, getZebkitDefaultsDir } from '../resolve-package-root.js';
import { handlePromptCancel, isPromptCancelError } from '../prompt-cancel.js';
import { runBuildCommand, type BuildCommandOptions } from './build-command';

export interface BuildOptions extends BuildCommandOptions {
  watch?: boolean;
}

export async function build(options: BuildOptions = {}) {
  if (options.watch) {
    return buildWatch(options);
  }

  try {
    await runBuildCommand(createDeps(), options);
  } catch {
    // Failure details were already printed where they occurred; make sure the
    // process reports it instead of exiting 0.
    process.exitCode = 1;
  }
}

function createDeps() {
  return {
    getZebkitPackageRoot,
    getZebkitDefaultsDir,
    handlePromptCancel,
    isPromptCancelError,
    runTokenBuild,
  };
}

/**
 * Collects the paths a watch session cares about: the config file itself plus
 * every token override source (base tokenPath and each overlay tokenPath).
 */
async function collectWatchPaths(configPath?: string): Promise<string[]> {
  const loaded = await loadZebkitConfig(configPath);
  if (!loaded) return [];

  const paths = [loaded.path];
  const configDir = path.dirname(loaded.path);
  const addTokenPath = (tokenPath?: string) => {
    if (!tokenPath) return;
    paths.push(path.isAbsolute(tokenPath) ? tokenPath : path.resolve(configDir, tokenPath));
  };
  addTokenPath(loaded.config.tokens?.tokenPath);
  for (const overlay of loaded.config.tokens?.overlays ?? []) {
    addTokenPath(overlay.tokenPath);
  }
  return paths;
}

async function buildWatch(options: BuildOptions) {
  const watchPaths: string[] = [];
  for (const candidate of await collectWatchPaths(options.config)) {
    if (await fs.pathExists(candidate)) watchPaths.push(candidate);
  }

  if (watchPaths.length === 0) {
    console.error(
      chalk.red(
        'Watch mode needs a zebkit.config.json (interactive prompts would re-fire on every rebuild). Run `zebkit init` first.'
      )
    );
    process.exitCode = 1;
    return;
  }

  const runOnce = async () => {
    try {
      await runBuildCommand(createDeps(), options);
    } catch {
      // Keep watching after a failed build — the fix is usually the next save.
      console.error(chalk.red('Build failed; watching for changes.'));
    }
  };

  await runOnce();

  let timer: NodeJS.Timeout | undefined;
  let building = false;
  let dirty = false;

  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      if (building) {
        dirty = true;
        return;
      }
      building = true;
      do {
        dirty = false;
        console.log(chalk.cyan('\nChange detected — rebuilding...'));
        await runOnce();
      } while (dirty);
      building = false;
    }, 200);
  };

  const watchers: FSWatcher[] = [];
  for (const target of watchPaths) {
    const stats = await fs.stat(target);
    watchers.push(watch(target, { recursive: stats.isDirectory() }, schedule));
  }

  console.log(
    chalk.cyan(
      `\nWatching for changes:\n${watchPaths.map((p) => `  - ${p}`).join('\n')}\n(ctrl-c to stop)`
    )
  );

  // Keep the process alive until interrupted; watchers hold the event loop open.
  await new Promise<void>((resolve) => {
    process.once('SIGINT', () => {
      for (const watcher of watchers) watcher.close();
      console.log(chalk.yellow('\nWatch stopped.'));
      resolve();
    });
  });
}
