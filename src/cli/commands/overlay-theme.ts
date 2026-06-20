import fs from 'fs-extra';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { loadZebkitConfig } from '../../scripts/config.js';
import {
  getZebkitDefaultsDir,
  getZebkitPackageRoot,
} from '../resolve-package-root.js';
import { resolveBundledThemeTokensDir } from '../../scripts/theme-presets.js';
import { writeConfigToPath } from '../config-paths.js';
import { handlePromptCancel, isPromptCancelError } from '../prompt-cancel.js';
import {
  runOverlayDefault,
  runOverlayDelete,
  runOverlayEdit,
  runOverlayList,
  runOverlayNew,
  type OverlayThemeCommandDeps,
} from './overlay-theme-command.js';

function createDeps(): OverlayThemeCommandDeps {
  return {
    readConfig: loadZebkitConfig,
    writeConfig: writeConfigToPath,
    prompt: inquirer.prompt,
    pathExists: fs.pathExists,
    ensureDir: fs.ensureDir,
    readJson: fs.readJson,
    writeJson: fs.writeJson,
    remove: fs.remove,
    getZebkitPackageRoot,
    getZebkitDefaultsDir,
    resolveBundledThemeTokensDir,
    handlePromptCancel,
    isPromptCancelError,
    log: (message: string) => console.log(message),
  };
}

function fail(error: unknown): never {
  if (error instanceof Error) {
    console.error(chalk.red(error.message));
  }
  process.exit(1);
}

export async function overlayTheme(): Promise<void> {
  try {
    await runOverlayDefault(createDeps());
  } catch (error) {
    fail(error);
  }
}

export async function overlayThemeList(): Promise<void> {
  try {
    await runOverlayList(createDeps());
  } catch (error) {
    fail(error);
  }
}

export async function overlayThemeNew(): Promise<void> {
  try {
    await runOverlayNew(createDeps());
  } catch (error) {
    fail(error);
  }
}

export async function overlayThemeEdit(name?: string): Promise<void> {
  try {
    await runOverlayEdit(createDeps(), name);
  } catch (error) {
    fail(error);
  }
}

export async function overlayThemeDelete(name?: string): Promise<void> {
  try {
    await runOverlayDelete(createDeps(), name);
  } catch (error) {
    fail(error);
  }
}
