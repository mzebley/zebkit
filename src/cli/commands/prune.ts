import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { loadZebkitConfig } from '../../scripts/config.js';
import { scanContent } from '../../scripts/prune/content-scan.js';
import { pruneCss } from '../../scripts/prune/engine.js';
import { getZebkitPackageRoot } from '../resolve-package-root.js';
import { runPruneCommand, type PruneCommandOptions } from './prune-command.js';

function readZebkitVersion(): string {
  try {
    const pkg = fs.readJsonSync(path.join(getZebkitPackageRoot(), 'package.json'));
    return typeof pkg.version === 'string' ? pkg.version : '0.0.0';
  } catch {
    return '0.0.0';
  }
}

export async function prune(options: PruneCommandOptions = {}): Promise<void> {
  try {
    await runPruneCommand(
      {
        readConfig: loadZebkitConfig,
        scanContent,
        pruneCss,
        readFile: (filePath) => fs.readFile(filePath, 'utf8'),
        writeFile: (filePath, data) => fs.writeFile(filePath, data),
        pathExists: (filePath) => fs.pathExists(filePath),
        ensureDir: (dirPath) => fs.ensureDir(dirPath),
        writeJson: (filePath, data) => fs.writeJson(filePath, data, { spaces: 2 }),
        zebkitVersion: readZebkitVersion(),
        zebkitPackageRoot: getZebkitPackageRoot(),
        cwd: process.cwd(),
        log: (message) => console.log(message),
      },
      options
    );
  } catch (error) {
    console.error(chalk.red(error instanceof Error ? error.message : String(error)));
    process.exitCode = 1;
  }
}
