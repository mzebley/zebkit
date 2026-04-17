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

const BREAKPOINT_WIDTHS: Record<string, string> = {
  tablet: '40rem',
  'tablet-lg': '50rem',
  desktop: '70rem',
  'desktop-lg': '80rem',
  widescreen: '100rem',
};

function buildBreakpointsUse(enabled: string[] | false | undefined): string {
  if (enabled === undefined) return '';
  const map =
    enabled === false
      ? '()'
      : `(${enabled.map((bp) => `'${bp}': ${BREAKPOINT_WIDTHS[bp]}`).join(', ')})`;
  return `@use 'core/styles/variables/breakpoints' with ($active-breakpoints: ${map});\n`;
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
  /**
   * Root of the zebkit package installation. Required when running from the
   * installed CLI so Sass can resolve stylesheet paths inside zebkit's src/.
   * Defaults to the package root inferred from this file's location (dev mode).
   */
  zebkitPackageRoot?: string;
  /**
   * Controls which responsive breakpoints are compiled into utility classes.
   * undefined = all breakpoints (default behavior).
   * false = no responsive utility classes.
   * string[] = only the named breakpoints.
   */
  enabledBreakpoints?: string[] | false;
  /**
   * Additional @use statements to prepend before the gathered stylesheet modules.
   * Used for smart color filtering to include only referenced palette families.
   */
  additionalModuleUses?: string;
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
    zebkitPackageRoot,
    enabledBreakpoints,
    additionalModuleUses = '',
  } = options;

  // In dev mode, resolve from this file's location. In installed CLI mode,
  // the caller provides zebkitPackageRoot (e.g., node_modules/zebkit/).
  const zbkRoot = zebkitPackageRoot ?? path.resolve(__dirname, '../../..');
  const resolvedDestination = path.isAbsolute(destination)
    ? destination
    : path.resolve(process.cwd(), destination);

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

    // Create stylesheet uses relative to zebkit's src root.
    const includeBasePath = path.join(zbkRoot, 'src');
    let moduleUses = '';
    orderedSheets.forEach((sheet, index) => {
      const absoluteSheet = path.isAbsolute(sheet)
        ? sheet
        : path.resolve(zbkRoot, sheet);
      const importPath = path
        .relative(includeBasePath, absoluteSheet)
        .replace(/\\/g, '/');
      moduleUses += `@use '${importPath}' as zbk_module_${index};\n`;
    });

    const breakpointsUse = buildBreakpointsUse(enabledBreakpoints);
    const sassCode = variableDefinitions + breakpointsUse + additionalModuleUses + moduleUses;

    const includePaths = [
      path.join(zbkRoot, 'src'),
      path.join(zbkRoot, 'src', 'core'),
      path.join(zbkRoot, 'src', 'components'),
      zbkRoot,
    ];

    const sassResult = sass.compileString(sassCode, {
      loadPaths: includePaths,
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

    const layerOrdering = '@layer theme, base, components, utilities;';
    const cssCode = `${importBlock ? `${importBlock}\n` : ''}${layerOrdering}\n${sassResult.css}\n${filteredCssVars}\n${variantCss}`;

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
