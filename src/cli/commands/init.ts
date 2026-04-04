import path from 'path';
import fs from 'fs-extra';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { getZebkitDefaultsDir } from '../resolve-package-root.js';
import type { ZebkitConfig } from '../../scripts/config.js';

export async function init() {
  const configPath = path.resolve(process.cwd(), 'zebkit.config.json');

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
      choices: ['default', 'quiet-boutique', 'dark-boutique', 'custom'],
      default: 'default',
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
    },
  };

  if (answers.copyTokens) {
    config.tokens!.customTokenPath = './tokens';
    await copyDefaultTokens(process.cwd());
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
}

async function copyDefaultTokens(projectDir: string) {
  const defaultsDir = getZebkitDefaultsDir();
  const tokensDir = path.resolve(projectDir, 'tokens');
  const manifestPath = path.join(defaultsDir, 'manifest.json');

  if (!(await fs.pathExists(manifestPath))) {
    console.warn(
      chalk.yellow(
        'Default token manifest not found — skipping token copy.\n' +
          'Run `npm run build:defaults` in the zebkit package to generate defaults.'
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

    const srcFile = path.join(defaultsDir, mod.file);
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
