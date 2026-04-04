import { Command } from 'commander';
import { init } from './commands/init.js';
import { build } from './commands/build.js';

const program = new Command();

program
  .name('zebkit')
  .description('Token-driven design system CLI')
  .version('0.0.1');

program
  .command('init')
  .description('Initialize zebkit in your project')
  .action(init);

program
  .command('build')
  .description('Build CSS from design tokens')
  .option('-c, --config <path>', 'path to config file')
  .action(build);

program.parse();
