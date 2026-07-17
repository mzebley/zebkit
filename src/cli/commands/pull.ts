import fs from 'fs-extra';
import chalk from 'chalk';
import {
  getZebkitContextDir,
  getZebkitDefaultsDir,
  getZebkitPackageRoot,
} from '../resolve-package-root.js';
import { loadZebkitConfig } from '../../scripts/config.js';
import { resolveBundledThemeTokensDir } from '../../scripts/theme-presets.js';
import { runPullCommand } from './pull-command';

export async function pull(options: { config?: string }) {
  try {
    return runPullCommand({
      pathExists: fs.pathExists,
      readJson: fs.readJson,
      readJsonSafe: async (p: string) => {
        try { return await fs.readJson(p); } catch { return undefined; }
      },
      writeJson: fs.writeJson,
      ensureDir: fs.ensureDir,
      readdir: fs.readdir,
      copyFile: fs.copyFile,
      remove: fs.remove,
      readFile: fs.readFile,
      writeFile: fs.writeFile,
      readConfig: () => loadZebkitConfig(options.config),
      getZebkitDefaultsDir,
      getZebkitPackageRoot,
      getZebkitContextDir,
      getProjectDir: () => process.cwd(),
      resolveBundledThemeTokensDir,
      log: (message: string) => console.log(message),
    });
  } catch (error) {
    if (error instanceof Error) {
      console.error(chalk.red(`Error: ${error.message}`));
    }
    process.exit(1);
  }
}
