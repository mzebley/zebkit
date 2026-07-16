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
import { slugifyFileSegment } from './build-helpers';
import { pruneCss } from '../prune/engine';
import type { PruneEngineResult, PruneMode, PruneOptions } from '../prune/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface SassVariable {
  value: string;
  modify?: boolean;
}

// Inject the token-derived active breakpoints as the SCSS `$active-breakpoints`
// map (key -> width). An empty map compiles no responsive utilities. This is the
// single source of truth for which breakpoints compile; the SCSS defaults in
// _breakpoints.scss are only a standalone-compilation fallback.
function buildBreakpointsUse(activeBreakpoints: Record<string, string>): string {
  const entries = Object.entries(activeBreakpoints);
  const map =
    entries.length === 0
      ? '()'
      : `(${entries.map(([bp, width]) => `'${bp}': ${width}`).join(', ')})`;
  return `@use 'tokens/styles/variables/breakpoints' with ($active-breakpoints: ${map});\n`;
}

const LAYER_ORDERING = '@layer theme, base, components, utilities;';

/** preset-env + autoprefixer: everything that runs before minification. */
function preMinifyPlugins() {
  return [
    postcssPresetEnv({
      stage: 3,
      features: { 'custom-properties': false },
    }),
    autoprefixer(),
  ];
}

/** cssnano only. Split out so prune can run between the transforms and minification. */
function minifyPlugins() {
  return [cssnano({ preset: 'default' })];
}

async function runPostcss(css: string, plugins: postcss.AcceptedPlugin[]): Promise<string> {
  const result = await postcss(plugins).process(css, { from: undefined });
  return result.css;
}

/**
 * Shared postcss pass for every emitted stylesheet (base bundle and overlays):
 * preset-env + autoprefixer, plus cssnano when minifying. Single pass — the
 * canonical (non-pruned) output is produced exclusively through here so it stays
 * byte-identical whether or not a build also emits a pruned sibling.
 */
export async function postProcessCss(css: string, minify = true): Promise<string> {
  const plugins = [...preMinifyPlugins(), ...(minify ? minifyPlugins() : [])];
  return runPostcss(css, plugins);
}

/**
 * A prune pass wired into a build. The candidate set is scanned by the caller
 * (build-tokens) so this module stays free of content-file IO.
 */
export interface CompileSassPruneRequest {
  engineOptions: PruneOptions;
  mode: PruneMode;
  /**
   * Alongside-mode output path (absolute). Omitted = `<destination>/zbk-<theme>.pruned(.min).css`.
   * Ignored in replace mode (the canonical file is pruned in place).
   */
  outPath?: string;
}

/** Prune outcome returned to the caller so it can shape and write the report. */
export interface CompileSassPruneOutcome {
  engineResult: PruneEngineResult;
  /** Canonical (pre-prune) output — the report's "before". */
  canonicalCss: string;
  /** Pruned output actually written — the report's "after". */
  prunedCss: string;
  outputPath: string;
  mode: PruneMode;
}

export interface CompileSassResult {
  /** Absolute path of the canonical `zbk-<theme>(.min).css`. */
  canonicalPath: string;
  /** Present only when a prune request was supplied. */
  prune?: CompileSassPruneOutcome;
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
  /**
   * Path fragments (matched against each sheet's src-relative import path, posix
   * separators) that mark a sheet as utility-emitting; those compile last so
   * utility classes win same-specificity conflicts within their layer.
   */
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
   * Active breakpoints as a `key -> width` map, injected into SCSS as
   * `$active-breakpoints`. Token-derived and config-filtered by the caller.
   * An empty map compiles no responsive utility classes. Defaults to `{}`.
   */
  activeBreakpoints?: Record<string, string>;
  /**
   * Additional @use statements appended after the gathered stylesheet modules.
   * Used for smart color filtering to include only referenced palette families.
   */
  additionalModuleUses?: string;
  /** Minify the output (default true → `zbk-<name>.min.css`; false → `zbk-<name>.css`). */
  minify?: boolean;
  /**
   * Optional prune pass. When present, the prune runs on the preset-env/autoprefixer
   * output *before* cssnano, so minification cleans up whatever pruning leaves. In
   * alongside mode the canonical file is still written unchanged.
   */
  prune?: CompileSassPruneRequest;
}

export async function compileSass(options: CompileSassOptions): Promise<CompileSassResult> {
  const spinner = ora('Compiling Zebkit CSS...').start();
  const {
    stylesheets,
    cssVars,
    destination,
    projectName,
    sassVariables = {},
    utilityStylesheetPatterns = [
      'tokens/styles/utility-classes/',
      'tokens/colors/',
      'tokens/semantic/color/',
    ],
    variantCss = '',
    zebkitPackageRoot,
    activeBreakpoints = {},
    additionalModuleUses = '',
    minify = true,
    prune,
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

    // Resolve each sheet to its src-relative import path, then order so
    // utility-emitting sheets compile last.
    const includeBasePath = path.join(zbkRoot, 'src');
    const importPaths = stylesheets.map((sheet) => {
      const absoluteSheet = path.isAbsolute(sheet)
        ? sheet
        : path.resolve(zbkRoot, sheet);
      return path.relative(includeBasePath, absoluteSheet).replace(/\\/g, '/');
    });
    const isUtilitySheet = (importPath: string) =>
      utilityStylesheetPatterns.some((pattern) => importPath.includes(pattern));
    const orderedImports = [
      ...importPaths.filter((p) => !isUtilitySheet(p)),
      ...importPaths.filter(isUtilitySheet),
    ];

    let moduleUses = '';
    orderedImports.forEach((importPath, index) => {
      moduleUses += `@use '${importPath}' as zbk_module_${index};\n`;
    });

    const breakpointsUse = buildBreakpointsUse(activeBreakpoints);
    // Smart-mode palette @uses come after the gathered modules, matching the
    // palettes-last ordering that `utilityStylesheetPatterns` gives 'all' mode.
    const sassCode = variableDefinitions + breakpointsUse + moduleUses + additionalModuleUses;

    const includePaths = [
      path.join(zbkRoot, 'src'),
      path.join(zbkRoot, 'src', 'tokens'),
      path.join(zbkRoot, 'src', 'components'),
      zbkRoot,
    ];

    const sassResult = sass.compileString(sassCode, {
      loadPaths: includePaths,
    });

    // Hoist @import statements from token conversion (e.g., Google Fonts) to the
    // top, and drop the layer-ordering statement the converter emits — this file
    // declares its own before any layered content.
    const importLines: string[] = [];
    const otherLines: string[] = [];
    cssVars.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('@import')) {
        importLines.push(trimmed);
      } else if (trimmed === LAYER_ORDERING) {
        // skip duplicate layer statement
      } else {
        otherLines.push(line);
      }
    });
    const importBlock = importLines.join('\n');
    const filteredCssVars = otherLines.join('\n');

    const cssCode = `${importBlock ? `${importBlock}\n` : ''}${LAYER_ORDERING}\n${sassResult.css}\n${filteredCssVars}\n${variantCss}`;

    const outputFilePath = path.join(
      resolvedDestination,
      `zbk-${slugifyFileSegment(projectName)}${minify ? '.min' : ''}.css`
    );

    if (!prune) {
      const processed = await postProcessCss(cssCode, minify);
      await fs.writeFile(outputFilePath, processed);
      spinner.succeed(
        chalk.green(`CSS written to ${outputFilePath} (${formatSize(Buffer.byteLength(processed))})`)
      );
      return { canonicalPath: outputFilePath };
    }

    // Canonical output goes through the exact single-pass pipeline so it stays
    // byte-identical to a non-prune build; the pruned sibling runs prune between
    // the transforms and cssnano.
    const canonicalCss = await postProcessCss(cssCode, minify);
    const transformed = await runPostcss(cssCode, preMinifyPlugins());
    const engineResult = pruneCss(transformed, prune.engineOptions);
    const prunedCss = minify
      ? await runPostcss(engineResult.css, minifyPlugins())
      : engineResult.css;

    let outputPath: string;
    if (prune.mode === 'replace') {
      // Prune in place; the unpruned canonical is never written.
      outputPath = outputFilePath;
      await fs.writeFile(outputPath, prunedCss);
      spinner.succeed(
        chalk.green(
          `Pruned CSS written to ${outputPath} ` +
            `(${formatSize(Buffer.byteLength(canonicalCss))} → ${formatSize(Buffer.byteLength(prunedCss))})`
        )
      );
    } else {
      // Alongside: canonical stays byte-identical to a non-prune build.
      await fs.writeFile(outputFilePath, canonicalCss);
      outputPath = prune.outPath ?? outputFilePath.replace(/(\.min)?\.css$/, '.pruned$1.css');
      await fs.ensureDir(path.dirname(outputPath));
      await fs.writeFile(outputPath, prunedCss);
      spinner.succeed(
        chalk.green(
          `CSS written to ${outputFilePath}; pruned sibling ${outputPath} ` +
            `(${formatSize(Buffer.byteLength(canonicalCss))} → ${formatSize(Buffer.byteLength(prunedCss))})`
        )
      );
    }

    return {
      canonicalPath: outputFilePath,
      prune: { engineResult, canonicalCss, prunedCss, outputPath, mode: prune.mode },
    };
  } catch (error) {
    spinner.fail(chalk.red('SCSS compilation failed'));
    throw error;
  }
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

function ensureTrailingSlash(value: string): string {
  const trimmed = value.trim();
  if (trimmed.endsWith('/')) return trimmed;
  return `${trimmed}/`;
}
