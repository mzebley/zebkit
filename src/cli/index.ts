import fs from 'fs-extra';
import path from 'path';
import { Command } from 'commander';
import { init } from './commands/init.js';
import { build } from './commands/build.js';
import { pull } from './commands/pull.js';
import { prune } from './commands/prune.js';
import { configGet, configGuided, configSet } from './commands/config.js';
import {
  overlayTheme,
  overlayThemeDelete,
  overlayThemeEdit,
  overlayThemeList,
  overlayThemeNew,
} from './commands/overlay-theme.js';
import { getZebkitPackageRoot } from './resolve-package-root.js';

function readPackageVersion(): string {
  try {
    const pkg = fs.readJsonSync(path.join(getZebkitPackageRoot(), 'package.json'));
    return typeof pkg.version === 'string' ? pkg.version : '0.0.0';
  } catch {
    return '0.0.0';
  }
}

const program = new Command();

program
  .name('zebkit')
  .description('Token-driven design system CLI')
  .version(readPackageVersion());

program
  .command('init')
  .description('Initialize zebkit in your project')
  .option('--quick', 'Fast path: only the essential prompts')
  .action(init);

program
  .command('build')
  .description('Build CSS from design tokens')
  .option('-c, --config <path>', 'path to config file')
  .option('--theme <preset>', 'override tokens.basePreset for this build')
  .option('--dest <path>', 'override tokens.destinationPath for this build')
  .option('--prune', 'prune unused CSS after building (honors tokens.prune config)')
  .option('--prune-out <path>', 'write a pruned file alongside the canonical CSS (implies alongside mode)')
  .option('-w, --watch', 'rebuild when the config or token override files change')
  .action(build);

program
  .command('pull')
  .description('Sync latest default tokens into your project token files')
  .option('-c, --config <path>', 'path to config file')
  .action(pull);

program
  .command('prune')
  .description('Remove unused classes, variants, and unreachable tokens from built CSS')
  .option('-c, --config <path>', 'path to config file')
  .option('--css <path>', 'input CSS (default: <destinationPath>/zbk-<theme>.min.css)')
  .option('--out <path>', 'output path; implies alongside mode')
  .option('--replace', 'prune in place (mutually exclusive with --out)')
  .option('--dry-run', 'no file written; report only')
  .option('--report <path>', 'where to write the JSON report')
  .action(prune);

const config = program
  .command('config')
  .description('Edit zebkit config: run with no args for a guided walkthrough')
  .action(configGuided);

config
  .command('get <path>')
  .description('Print a single config value, e.g. tokens.fonts.strategy')
  .action(configGet);

config
  .command('set <path> <value>')
  .description('Set a single config value, e.g. tokens.fonts.strategy preload')
  .action(configSet);

const overlay = program
  .command('overlay-theme')
  .description('Manage overlay themes: run with no args to list and pick an action')
  .action(overlayTheme);

overlay.command('list').description('List configured overlay themes').action(overlayThemeList);
overlay.command('new').description('Create a new overlay theme').action(overlayThemeNew);
overlay
  .command('edit [name]')
  .description('Edit an existing overlay theme')
  .action(overlayThemeEdit);
overlay
  .command('delete [name]')
  .description('Delete an overlay theme (optionally its token files)')
  .action(overlayThemeDelete);

program.parse();
