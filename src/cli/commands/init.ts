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

export async function init() {
  try {
    const configPath = path.resolve(process.cwd(), 'zebkit.config.json');
    const packageRoot = getZebkitPackageRoot();
    const defaultsDir = getZebkitDefaultsDir();
    const builtInThemes = getThemePromptChoices(await getBuiltInThemeNames(packageRoot));

    if (await fs.pathExists(configPath)) {
      const { overwrite } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'overwrite',
          message: chalk.yellow('zebkit.config.json already exists. Overwrite?'),
          default: false,
        },
      ]);
      if (!overwrite) {
        console.log(chalk.gray('Init cancelled.'));
        return;
      }
    }

    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'destinationPath',
        message: 'Output directory for compiled CSS:',
        default: './dist',
      },
      {
        type: 'input',
        name: 'assetFilePath',
        message: 'Asset URL path (used for CSS asset references):',
        default: '/',
      },
      {
        type: 'list',
        name: 'theme',
        message: 'Starting theme:',
        choices: builtInThemes,
        default: DEFAULT_THEME_NAME,
      },
      {
        type: 'input',
        name: 'projectName',
        message: 'Project name (used for output filename):',
        default: getDefaultProjectName(process.cwd()),
      },
      {
        type: 'confirm',
        name: 'copyTokens',
        message: 'Copy default token files to ./tokens/ for customization?',
        default: true,
      },
    ]);

    const config: ZebkitConfig = {
      tokens: {
        destinationPath: answers.destinationPath,
        assetFilePath: answers.assetFilePath,
        theme: answers.theme,
        customThemeName: answers.projectName,
      },
    };

    if (answers.copyTokens) {
      config.tokens!.customTokenPath = './tokens';
      const selectedThemeDir = resolveBundledThemeTokensDir(answers.theme, defaultsDir, packageRoot);
      await copyThemeTokens(process.cwd(), selectedThemeDir);
    }

    await fs.writeJson(configPath, config, { spaces: 2 });
    console.log(chalk.green('\nCreated zebkit.config.json'));
    console.log(chalk.gray('\nNext:'));
    if (answers.copyTokens) {
      console.log(chalk.gray('  1. Edit ./tokens/ to customize design tokens'));
      console.log(chalk.gray('  2. Run `zebkit build` to compile CSS'));
    } else {
      console.log(chalk.gray('  1. Run `zebkit build` to compile CSS'));
    }
  } catch (error) {
    if (isPromptCancelError(error)) {
      handlePromptCancel('Init');
      return;
    }

    throw error;
  }
}

function getDefaultProjectName(projectDir: string): string {
  return path.basename(projectDir);
}

async function copyThemeTokens(projectDir: string, sourceDir: string) {
  const tokensDir = path.resolve(projectDir, 'tokens');
  const manifestPath = path.join(sourceDir, 'manifest.json');

  if (!(await fs.pathExists(manifestPath))) {
    console.warn(
      chalk.yellow(
        `Theme token manifest not found at ${manifestPath} — skipping token copy.\n` +
          'Run `npm run build:defaults` in the zebkit package to generate bundled theme presets.'
      )
    );
    return;
  }

  await fs.ensureDir(tokensDir);

  const manifest = await fs.readJson(manifestPath) as { modules: Array<{ key: string; file: string }> };
  let copied = 0;

  for (const mod of manifest.modules) {
    const destFile = path.join(tokensDir, mod.file);

    // Don't overwrite existing customizations
    if (await fs.pathExists(destFile)) continue;

    const srcFile = path.join(sourceDir, mod.file);
    const raw = await fs.readJson(srcFile) as Record<string, unknown>;

    // Strip internal metadata fields before writing to the project
    const { _key, _layer, ...tokenData } = raw;

    // Write as { "zbk-button": { ...tokenProperties } } so applyCustomOverrides
    // can merge it regardless of filename inference.
    await fs.writeJson(destFile, { [mod.key]: tokenData }, { spaces: 2 });
    copied++;
  }

  if (copied > 0) {
    console.log(chalk.green(`\nCopied ${copied} token files to ./tokens/`));
  } else {
    console.log(chalk.gray('\n./tokens/ is already up to date.'));
  }
}
