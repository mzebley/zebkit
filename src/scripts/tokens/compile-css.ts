import fs from 'fs-extra';
import path from 'path';
import * as sass from 'sass';
import postcss from 'postcss';
import autoprefixer from 'autoprefixer';
import cssnano from 'cssnano';
import postcssPresetEnv from 'postcss-preset-env';
import ora from 'ora';
import chalk from 'chalk';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface SassVariable {
  value: string;
  modify?: boolean;
}

/**
 * Compiles SCSS bundles for a given theme, injecting CSS variables and Sass variables.
 */
export interface CompileSassOptions {
  stylesheets: string[];
  cssVars: string;
  destination: string;
  projectName: string;
  sassVariables: { [key: string]: SassVariable };
  utilityStylesheetPatterns?: string[];
  /**
   * Optional additional CSS (e.g., variant-specific rules)
   * that should be appended to the compiled bundle.
   */
  variantCss?: string;
}

export async function compileSass(options: CompileSassOptions): Promise<void> {
  const spinner = ora('Compiling Zebkit CSS...').start();
  const {
    stylesheets,
    cssVars,
    destination,
    projectName,
    sassVariables = {},
    utilityStylesheetPatterns = ['utilities', 'utility', 'color'],
    variantCss = '',
  } = options;

  const projectRoot = path.resolve(__dirname, '../../..');
  const resolvedDestination = path.isAbsolute(destination)
    ? destination
    : path.resolve(projectRoot, destination);

  try {
    await fs.ensureDir(resolvedDestination);

    // Build Sass variable block
    let variableDefinitions = '';
    for (const key in sassVariables) {
      if (Object.prototype.hasOwnProperty.call(sassVariables, key)) {
        const variable = sassVariables[key];
        if (variable.modify) {
          variableDefinitions += `$${key}: '${ensureTrailingSlash(variable.value)}';\n`;
        } else {
          variableDefinitions += `$${key}: ${variable.value};\n`;
        }
      }
    }

    // Ensure utility sheets compile last
    const utilitySheets: string[] = [];
    const nonUtilitySheets: string[] = [];
    for (const sheet of stylesheets) {
      const matchesUtility = utilityStylesheetPatterns.some((pattern) =>
        sheet.includes(pattern)
      );
      if (matchesUtility) {
        utilitySheets.push(sheet);
      } else {
        nonUtilitySheets.push(sheet);
      }
    }
    const orderedSheets = [...nonUtilitySheets, ...utilitySheets];

    // Create import statements relative to src root
    const includeBasePath = path.resolve(__dirname, '../../');
    let importStatements = '';
    for (const sheet of orderedSheets) {
      const absoluteSheet = path.isAbsolute(sheet)
        ? sheet
        : path.resolve(projectRoot, sheet);
      const importPath = path
        .relative(includeBasePath, absoluteSheet)
        .replace(/\\/g, '/');
      importStatements += `@import '${importPath}';\n`;
    }

    const sassCode = variableDefinitions + importStatements;

    const includePaths = [
      path.join(projectRoot, 'src'),
      path.join(projectRoot, 'src', 'core'),
      path.join(projectRoot, 'src', 'components'),
      projectRoot,
    ];

    const tmpSassFile = path.join(projectRoot, `zbk-temp-${Date.now()}.scss`);
    await fs.writeFile(tmpSassFile, sassCode);

    try {
      const sassResult = sass.renderSync({
        file: tmpSassFile,
        includePaths,
      });

      // Ensure @import statements from token conversion (e.g., Google Fonts) stay at the top
      let importBlock = '';
      let filteredCssVars = cssVars;
      if (cssVars.includes('@import')) {
        const importLines: string[] = [];
        const otherLines: string[] = [];
        cssVars.split('\n').forEach((line) => {
          if (line.trim().startsWith('@import')) {
            importLines.push(line.trim());
          } else {
            otherLines.push(line);
          }
        });
        importBlock = importLines.join('\n');
        filteredCssVars = otherLines.join('\n');
      }

      const cssCode = `${importBlock ? `${importBlock}\n` : ''}${sassResult.css.toString()}\n${filteredCssVars}\n${variantCss}`;

      const result = await postcss([
        postcssPresetEnv({
          stage: 3,
          features: { 'custom-properties': false },
        }),
        autoprefixer(),
        cssnano({ preset: 'default' }),
      ]).process(cssCode, { from: undefined });

      const outputFilePath = path.join(
        resolvedDestination,
        `zbk-${projectName.toLowerCase()}.min.css`
      );
      await fs.writeFile(outputFilePath, result.css);
      spinner.succeed(chalk.green(`CSS written to ${outputFilePath}`));
    } finally {
      await fs.remove(tmpSassFile);
    }
  } catch (error) {
    spinner.fail(chalk.red('SCSS compilation failed'));
    console.error(error);
  }
}

function ensureTrailingSlash(value: string): string {
  const trimmed = value.trim();
  if (trimmed.endsWith('/')) return trimmed;
  return `${trimmed}/`;
}
