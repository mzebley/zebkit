#!/usr/bin/env ts-node

import path from 'path';
import inquirer from 'inquirer';
import chalk from 'chalk';
import fs from 'fs-extra';
import { fileURLToPath } from 'node:url';
import type { Dirent } from 'fs';
import { gatherZebkitFiles } from '@token-scripts/gather-files';
import {
  buildZebkitTokens,
  BuildZebkitTokensOptions,
} from '@token-scripts/compile-tokens';
import { buildZebkitVariants } from '@token-scripts/compile-variants';
import { convertTokensToCssVars } from '@token-scripts/token-converter';
import { compileSass, CompileSassOptions } from '@token-scripts/compile-css';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ZEBKIT_PREFIX = 'zbk';

/**
 * Interactive entry point for building Zebkit tokens and CSS.
 * Expects each token folder to export `key` and a default token map alongside a `token-schema.ts`.
 */
function displayWelcome() {
  console.log(chalk.cyan('============================'));
  console.log(chalk.cyan('     Zebkit Token Builder    '));
  console.log(chalk.cyan('============================'));
}

async function getComponents(): Promise<string[]> {
  const componentsDir = path.resolve(__dirname, '../../components');
  if (!(await fs.pathExists(componentsDir))) return [];

  const items = await fs.readdir(componentsDir, { withFileTypes: true });
  return items
    .filter((item: Dirent) => item.isDirectory() && !item.name.startsWith('.'))
    .map((item: Dirent) => item.name);
}

async function run() {
  displayWelcome();
  try {
    const components = await getComponents();
    const selectedComponents =
      components.length > 0
        ? (
            await inquirer.prompt([
              {
                type: 'checkbox',
                name: 'selectedComponents',
                message: 'Select components to include:',
                choices: components,
              },
            ])
          ).selectedComponents
        : [];

    const { destinationPath, assetFilePath } = await inquirer.prompt([
      {
        type: 'input',
        name: 'destinationPath',
        message: 'Destination directory for exported files:',
        default: './dist',
      },
      {
        type: 'input',
        name: 'assetFilePath',
        message:
          'Path to your project assets (used for compiled CSS asset URLs):',
        default: '/assets/',
      },
    ]);

    const themeAnswers = await inquirer.prompt([
      {
        type: 'list',
        name: 'theme',
        message: 'Select the theme for your tokens:',
        choices: ['default', 'quiet-boutique', 'dark-boutique', 'custom'],
        default: 'default',
      },
      {
        type: 'input',
        name: 'customTokenPath',
        message: 'Path to custom token overrides file or folder:',
        when: (answers) => answers.theme === 'custom',
        validate: (input) => (input ? true : 'Path cannot be empty.'),
      },
      {
        type: 'input',
        name: 'customThemeName',
        message: 'Name for your custom theme:',
        when: (answers) => answers.theme === 'custom',
        default: 'custom',
      },
    ]);

    const { exportTokens } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'exportTokens',
        message: 'Export token artifacts (JSON/TS/JS)?',
        default: false,
      },
    ]);

    let splitMode: BuildZebkitTokensOptions['splitMode'] = 'combined';
    let outputFormats: string[] = [];

    if (exportTokens) {
      const tokenExportAnswers = await inquirer.prompt([
        {
          type: 'list',
          name: 'splitMode',
          message: 'Choose file splitting mode:',
          choices: [
            { name: 'combined (one file per format)', value: 'combined' },
            { name: 'per-module (one file per token module)', value: 'per-module' },
          ],
          default: 'combined',
        },
        {
          type: 'checkbox',
          name: 'outputFormats',
          message: 'Select output format(s):',
          choices: [
            { name: 'JSON', value: 'JSON', checked: true },
            { name: 'TypeScript', value: 'TypeScript' },
            { name: 'JavaScript', value: 'JavaScript' },
          ],
          validate: (input) =>
            input.length > 0 ? true : 'You must select at least one format.',
        },
      ]);
      splitMode = tokenExportAnswers.splitMode;
      outputFormats = tokenExportAnswers.outputFormats;
    }

    const writeVariantRegistry = exportTokens
      ? (
          await inquirer.prompt([
            {
              type: 'confirm',
              name: 'writeVariantRegistry',
              message: 'Write variant registry JSON output?',
              default: false,
            },
          ])
        ).writeVariantRegistry
      : false;

    let customTokenPath: string | undefined;
    let themeName = themeAnswers.theme;

    switch (themeAnswers.theme) {
      case 'quiet-boutique':
        customTokenPath = path.resolve(__dirname, '../../themes/quiet-boutique');
        break;
      case 'dark-boutique':
        customTokenPath = path.resolve(__dirname, '../../themes/dark-boutique');
        break;
      case 'custom':
        customTokenPath = themeAnswers.customTokenPath;
        themeName = themeAnswers.customThemeName || 'custom';
        break;
      default:
        customTokenPath = undefined;
        themeName = 'default';
    }

    if (customTokenPath && !(await fs.pathExists(customTokenPath))) {
      console.warn(
        chalk.yellow(`Custom token path not found at ${customTokenPath}. Skipping overrides.`)
      );
      customTokenPath = undefined;
    }

    const files = await gatherZebkitFiles(selectedComponents);

    const { tokens, layers } = await buildZebkitTokens(
      themeName,
      files.tokenFiles,
      destinationPath,
      customTokenPath,
      outputFormats,
      { splitMode: splitMode as BuildZebkitTokensOptions['splitMode'] }
    );

    const cssVars = convertTokensToCssVars(tokens, { layers });

    const { registry: variantRegistry, inlineCss, extraStylesheets } =
      await buildZebkitVariants(tokens);
    if (writeVariantRegistry) {
      const variantRegistryPath = path.join(
        destinationPath,
        `zbk-${themeName.toLowerCase()}-variants.json`
      );
      await fs.ensureDir(destinationPath);
      await fs.writeJson(variantRegistryPath, variantRegistry, { spaces: 2 });
    }

    const allStylesheets = [...files.stylesheets, ...extraStylesheets];

    const sassOptions: CompileSassOptions = {
      stylesheets: allStylesheets,
      cssVars,
      destination: destinationPath,
      projectName: themeName,
      sassVariables: {
        assetFilePath: { value: assetFilePath, modify: true },
        cssVarPrefix: { value: ZEBKIT_PREFIX, modify: false },
      },
      variantCss: inlineCss,
    };

    await compileSass(sassOptions);
  } catch (error: any) {
    if (error?.name === 'ExitPromptError') {
      console.log(chalk.yellow('\nPrompt cancelled by user.'));
      process.exit(0);
    } else {
      console.error(chalk.red('An error occurred:'), error);
      process.exit(1);
    }
  }
}

run();
