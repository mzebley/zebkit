import path from 'path';
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
      readConfig: async () => {
        if (options.config) {
          const resolved = path.resolve(options.config);
          if (!(await fs.pathExists(resolved))) {
            console.error(chalk.red(`Config file not found at ${resolved}.`));
            process.exit(1);
          }
          const content = await fs.readFile(resolved, 'utf-8');
          return { config: JSON.parse(content), path: resolved };
        }
        return loadZebkitConfig();
      },
      getZebkitDefaultsDir,
      getZebkitPackageRoot,
      getZebkitContextDir,
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
