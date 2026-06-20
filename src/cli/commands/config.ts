import inquirer from 'inquirer';
import chalk from 'chalk';
import { loadZebkitConfig } from '../../scripts/config.js';
import { getZebkitPackageRoot } from '../resolve-package-root.js';
import {
  getBuiltInThemeNames,
  getThemePromptChoices,
} from '../../scripts/theme-presets.js';
import { writeConfigToPath } from '../config-paths.js';
import { handlePromptCancel, isPromptCancelError } from '../prompt-cancel.js';
import {
  runConfigGet,
  runConfigGuided,
  runConfigSet,
  type ConfigCommandDeps,
} from './config-command.js';

function createDeps(): ConfigCommandDeps {
  return {
    readConfig: loadZebkitConfig,
    writeConfig: writeConfigToPath,
    prompt: inquirer.prompt,
    getZebkitPackageRoot,
    getBuiltInThemeNames,
    getThemePromptChoices,
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

export async function configGuided(): Promise<void> {
  try {
    await runConfigGuided(createDeps());
  } catch (error) {
    fail(error);
  }
}

export async function configSet(dotPath: string, value: string): Promise<void> {
  try {
    await runConfigSet(createDeps(), dotPath, value);
  } catch (error) {
    fail(error);
  }
}

export async function configGet(dotPath: string): Promise<void> {
  try {
    await runConfigGet(createDeps(), dotPath);
  } catch (error) {
    fail(error);
  }
}
