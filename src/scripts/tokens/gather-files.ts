import fs from 'fs-extra';
import path from 'path';
import { glob } from 'glob';
import ora from 'ora';
import chalk from 'chalk';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface GatherOptions {
  /** Override for core SCSS/token source directory (defaults to src/core relative to this file) */
  coreDir?: string;
  /** Override for components directory */
  componentsDir?: string;
  /**
   * When set, loads pre-compiled JSON token defaults from this directory instead of
   * dynamically importing TS token modules. Used by the installed CLI.
   */
  tokenDefaultsDir?: string;
}

/**
 * Collects Zebkit token sources and SCSS entry points.
 * Expects token files at src/core/.../tokens.ts and src/components/.../tokens.ts.
 * In installed CLI mode, pass tokenDefaultsDir to load pre-compiled JSON defaults instead.
 */
export async function gatherZebkitFiles(components: string[], options?: GatherOptions) {
  const stylesheets: string[] = [];
  const tokenFiles: string[] = [];

  const spinner = ora('Gathering Zebkit token files...').start();

  try {
    const coreDir = options?.coreDir ?? path.resolve(__dirname, '../../core');
    const componentsDir = options?.componentsDir ?? path.resolve(__dirname, '../../components');

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

    if (options?.tokenDefaultsDir) {
      // Installed CLI mode: load pre-compiled JSON token defaults
      const jsonFiles = await glob('*.json', {
        cwd: options.tokenDefaultsDir,
        absolute: true,
        nodir: true,
        // variants.json is the built-in variant snapshot, not a token module.
        ignore: ['manifest.json', 'variants.json'],
      });
      tokenFiles.push(...jsonFiles);
    } else {
      // Dev mode: discover TypeScript token modules
      const coreTokens = await glob('**/tokens/tokens.ts', {
        cwd: coreDir,
        nodir: true,
      });
      tokenFiles.push(...coreTokens.map((file) => path.join('core', file)));
    }

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
    throw error;
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
