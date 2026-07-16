import path from 'path';
import fs from 'fs-extra';
import inquirer from 'inquirer';
import chalk from 'chalk';
import {
  getZebkitContextDir,
  getZebkitDefaultsDir,
  getZebkitPackageRoot,
} from '../resolve-package-root.js';
import { handlePromptCancel, isPromptCancelError } from '../prompt-cancel.js';
import type { ZebkitConfig } from '../../scripts/config.js';
import {
  DEFAULT_THEME_NAME,
  getBuiltInThemeNames,
  getThemePromptChoices,
  resolveBundledThemeTokensDir,
} from '../../scripts/theme-presets.js';
import { getKnownComponents } from '../../scripts/known-components.js';
import {
  copyThemeTokens,
  getDefaultProjectName,
  InitCommandDeps,
  runInitCommand,
} from './init-command';

export async function init(options: { quick?: boolean } = {}) {
  return runInitCommand({
    pathExists: fs.pathExists,
    writeJson: fs.writeJson,
    readJson: fs.readJson,
    readJsonSafe: async (p: string) => {
      try {
        return await fs.readJson(p);
      } catch {
        return undefined;
      }
    },
    ensureDir: fs.ensureDir,
    readdir: fs.readdir,
    copyFile: fs.copyFile,
    remove: fs.remove,
    readFile: fs.readFile,
    writeFile: fs.writeFile,
    prompt: inquirer.prompt,
    getZebkitPackageRoot,
    getZebkitDefaultsDir,
    getZebkitContextDir,
    getBuiltInThemeNames,
    getThemePromptChoices,
    getKnownComponents,
    resolveBundledThemeTokensDir,
    handlePromptCancel,
    isPromptCancelError,
  }, { quick: options.quick });
}
export { copyThemeTokens, getDefaultProjectName };
