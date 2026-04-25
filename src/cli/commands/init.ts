import path from 'path';
import fs from 'fs-extra';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { getZebkitDefaultsDir, getZebkitPackageRoot } from '../resolve-package-root.js';
import { handlePromptCancel, isPromptCancelError } from '../prompt-cancel.js';
import type { ZebkitConfig } from '../../scripts/config.js';
import {
  DEFAULT_THEME_NAME,
  getBuiltInThemeNames,
  getThemePromptChoices,
  resolveBundledThemeTokensDir,
} from '../../scripts/theme-presets.js';
import {
  copyThemeTokens,
  getDefaultProjectName,
  InitCommandDeps,
  runInitCommand,
} from './init-command';

export async function init() {
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
    prompt: inquirer.prompt,
    getZebkitPackageRoot,
    getZebkitDefaultsDir,
    getBuiltInThemeNames,
    getThemePromptChoices,
    resolveBundledThemeTokensDir,
    handlePromptCancel,
    isPromptCancelError,
  });
}
export { copyThemeTokens, getDefaultProjectName };
