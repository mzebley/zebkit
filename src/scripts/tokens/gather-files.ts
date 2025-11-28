import fs from 'fs-extra';
import path from 'path';
import { glob } from 'glob';
import ora from 'ora';
import chalk from 'chalk';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Collects Zebkit token sources and SCSS entry points.
 * Expects token files at src/core/.../tokens.ts and src/components/.../tokens.ts.
 */
export async function gatherZebkitFiles(components: string[]) {
  const stylesheets: string[] = [];
  const tokenFiles: string[] = [];

  const spinner = ora('Gathering Zebkit token files...').start();

  try {
    const coreDir = path.resolve(__dirname, '../../core');
    const componentsDir = path.resolve(__dirname, '../../components');
    const projectRoot = path.resolve(__dirname, '../../');

    // Core stylesheets: entry styles.scss plus nested styles/*.scss
    const coreStyles = await glob(
      ['**/styles.scss', 'styles/**/*.scss'],
      {
        cwd: coreDir,
        absolute: true,
        nodir: true,
      }
    );
    stylesheets.push(...coreStyles);

    // Core token files reported as relative "core/..." (includes semantic modules under core/semantic/**/tokens.ts)
    const coreTokens = await glob('**/tokens/tokens.ts', {
      cwd: coreDir,
      nodir: true,
    });
    tokenFiles.push(...coreTokens.map((file) => path.join('core', file)));

    if (components.length > 0 && (await fs.pathExists(componentsDir))) {
      for (const component of components) {
        const componentDir = path.join(componentsDir, component);
        if (!(await fs.pathExists(componentDir))) {
          console.warn(
            chalk.yellow(`Component directory does not exist: ${componentDir}`)
          );
          continue;
        }

        const componentStyles = await glob(
          ['**/styles.scss', 'styles/**/*.scss'],
          {
            cwd: componentDir,
            absolute: true,
            nodir: true,
          }
        );
        stylesheets.push(...componentStyles);

        const componentTokens = await glob('**/tokens/tokens.ts', {
          cwd: componentDir,
          nodir: true,
        });
        tokenFiles.push(
          ...componentTokens.map((file) => path.join('components', component, file))
        );
      }
    }

    spinner.succeed('Token and stylesheet discovery complete.');
  } catch (error) {
    spinner.fail('Failed to gather token files.');
    console.error(error);
  }

  // Normalize stylesheet paths to be project-root-relative for Sass import generation.
  const normalizedStyles = stylesheets.map((file) =>
    path.isAbsolute(file) ? file : path.resolve(__dirname, '../../', file)
  );

  return {
    stylesheets: normalizedStyles,
    tokenFiles,
  };
}
