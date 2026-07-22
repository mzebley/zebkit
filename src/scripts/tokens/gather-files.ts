import fs from 'fs-extra';
import path from 'path';
import { glob } from 'glob';
import ora from 'ora';
import chalk from 'chalk';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface GatherOptions {
  /** Override for the token-module source directory (defaults to src/tokens relative to this file) */
  tokensDir?: string;
  /** Override for the components directory (defaults to src/components) */
  componentsDir?: string;
  /**
   * When set, loads pre-compiled JSON token defaults from this directory instead of
   * dynamically importing TS token modules. Used by the installed CLI.
   */
  tokenDefaultsDir?: string;
  /**
   * Component names excluded by the `components` config block. Their styles.scss
   * and token modules are dropped here, before the compile.
   */
  excludedComponents?: ReadonlySet<string>;
}

/**
 * Collects Zebkit token sources and SCSS entry points.
 *
 * Token modules live at src/tokens/.../tokens/tokens.ts (the token language) and
 * src/components/{name}/tokens/tokens.ts (per-component surfaces). Component
 * tokens are part of the default vocabulary; the shipped surface shrinks in two
 * ways that compose: the `components` config (declared intent, filtered here at
 * gather time) and `zebkit prune` (evidence-based, runs after the compile and
 * can only ever remove more).
 *
 * In installed CLI mode, pass tokenDefaultsDir to load pre-compiled JSON defaults instead.
 */
export async function gatherZebkitFiles(options?: GatherOptions) {
  const stylesheets: string[] = [];
  const tokenFiles: string[] = [];

  const spinner = ora('Gathering Zebkit token files...').start();

  try {
    const tokensDir = options?.tokensDir ?? path.resolve(__dirname, '../../tokens');
    const componentsDir = options?.componentsDir ?? path.resolve(__dirname, '../../components');
    const excluded = options?.excludedComponents ?? new Set<string>();
    const componentNameOf = (file: string): string =>
      path.relative(componentsDir, file).split(path.sep)[0]?.toLowerCase() ?? '';

    // Token-language stylesheets: entry styles.scss plus nested styles/*.scss
    const tokenStyles = await glob(
      ['**/styles.scss', 'styles/**/*.scss'],
      {
        cwd: tokensDir,
        absolute: true,
        nodir: true,
      }
    );
    // glob order follows filesystem readdir and varies between machines/runs.
    // Sort every discovery so the compiled CSS (and thus a pruned build) is
    // byte-reproducible.
    stylesheets.push(...tokenStyles.sort());

    if (await fs.pathExists(componentsDir)) {
      const componentStyles = await glob('**/styles.scss', {
        cwd: componentsDir,
        absolute: true,
        nodir: true,
      });
      stylesheets.push(
        ...componentStyles.filter((file) => !excluded.has(componentNameOf(file))).sort()
      );
    }

    if (options?.tokenDefaultsDir) {
      // Installed CLI mode: load pre-compiled JSON token defaults
      const jsonFiles = await glob('*.json', {
        cwd: options.tokenDefaultsDir,
        absolute: true,
        nodir: true,
        // manifest/variants/components are pipeline snapshots and
        // component-tokens.json is the component-consumed-vars list for prune —
        // none of them is a token module.
        ignore: ['manifest.json', 'variants.json', 'components.json', 'component-tokens.json', 'css-properties.json'],
      });
      const excludedModuleKeys = new Set(
        [...excluded].map((component) => `zbk-${component}`)
      );
      tokenFiles.push(
        ...jsonFiles
          .filter(
            (file) => !excludedModuleKeys.has(path.basename(file, '.json').toLowerCase())
          )
          .sort()
      );
    } else {
      // Dev mode: discover TypeScript token modules
      const languageTokens = await glob('**/tokens/tokens.ts', {
        cwd: tokensDir,
        nodir: true,
      });
      tokenFiles.push(...languageTokens.sort().map((file) => path.join('tokens', file)));

      if (await fs.pathExists(componentsDir)) {
        const componentTokens = await glob('**/tokens/tokens.ts', {
          cwd: componentsDir,
          nodir: true,
        });
        tokenFiles.push(
          ...componentTokens
            .filter((file) => !excluded.has(file.split(/[\\/]/)[0]?.toLowerCase() ?? ''))
            .sort()
            .map((file) => path.join('components', file))
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
