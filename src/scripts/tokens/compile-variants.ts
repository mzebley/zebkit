import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';
import ora from 'ora';
import { glob } from 'glob';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { TokenInterface } from '@definitions/tokens';
import type { VariantConfig } from '@definitions/token-variants';
import { convertDotNotation } from './token-converter';
import { ZEBKIT_PREFIX } from '@config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface VariantRuntimeEntry {
  component: string;
  name: string;
  className: string;
  overrides: Record<string, string>;
}

export interface VariantRegistry {
  [component: string]: {
    [variantName: string]: VariantRuntimeEntry;
  };
}

export interface BuildZebkitVariantsResult {
  registry: VariantRegistry;
  /**
   * CSS rules generated from `styles.inline` in variants.
   * This is ready to be appended to the final CSS bundle.
   */
  inlineCss: string;
  /**
   * Extra SCSS/CSS stylesheet paths declared via `styles.stylesheetPaths`.
   * These should be included in Sass compilation as additional imports.
   */
  extraStylesheets: string[];
}

/**
 * Loads Zebkit variant modules, validates their overrides against the token maps,
 * resolves class names, and aggregates inline CSS + extra stylesheet imports.
 *
 * Variant modules are discovered under:
 *   - src/core/**\/variants/*.ts
 *   - src/components/**\/variants/*.ts
 *
 * Each file may default-export a single VariantConfig, an array of VariantConfig,
 * or expose `variants` as an array.
 */
export async function buildZebkitVariants(
  tokens: Record<string, TokenInterface>
): Promise<BuildZebkitVariantsResult> {
  const spinner = ora('Processing Zebkit variants...').start();

  const registry: VariantRegistry = {};
  const inlineCssBlocks: string[] = [];
  const extraStylesheets: string[] = [];

  try {
    const projectRoot = path.resolve(__dirname, '../../..');
    const coreDir = path.resolve(__dirname, '../../core');
    const componentsDir = path.resolve(__dirname, '../../components');

    const variantPatterns: string[] = [];

    if (await fs.pathExists(coreDir)) {
      variantPatterns.push(path.join(coreDir, '**/variants/*.ts'));
    }
    if (await fs.pathExists(componentsDir)) {
      variantPatterns.push(path.join(componentsDir, '**/variants/*.ts'));
    }

    const variantFiles: string[] = [];
    for (const pattern of variantPatterns) {
      const matches = await glob(pattern.replace(/\\/g, '/'), {
        nodir: true,
        absolute: true,
      });
      variantFiles.push(...matches);
    }

    for (const file of variantFiles) {
      await loadVariantFile(
        file,
        tokens,
        registry,
        inlineCssBlocks,
        extraStylesheets,
        projectRoot
      );
    }

    spinner.succeed(chalk.green('Variant processing complete.'));
  } catch (error) {
    spinner.fail(chalk.red('Failed to process Zebkit variants.'));
    console.error(error);
  }

  const inlineCss =
    inlineCssBlocks.length > 0 ? inlineCssBlocks.join('\n\n') + '\n' : '';

  return {
    registry,
    inlineCss,
    extraStylesheets,
  };
}

async function loadVariantFile(
  file: string,
  tokens: Record<string, TokenInterface>,
  registry: VariantRegistry,
  inlineCssBlocks: string[],
  extraStylesheets: string[],
  projectRoot: string
) {
  try {
    const baseName = path.basename(file);
    // Skip pure type helper files
    if (baseName === 'types.ts') return;

    const mod = await import(pathToFileURL(file).href);
    const rawExport =
      mod.default ??
      mod.variants ??
      mod.buttonVariants ??
      (baseName === 'index.ts' && mod.buttonVariants
        ? mod.buttonVariants
        : mod);

    const variants: VariantConfig[] = Array.isArray(rawExport)
      ? rawExport
      : [rawExport];

    for (const variant of variants) {
      // Ignore module namespaces or non-object exports without required fields
      if (
        !variant ||
        typeof variant !== 'object' ||
        (!('component' in variant) && !Array.isArray(rawExport))
      ) {
        continue;
      }
      await registerVariant(
        variant as VariantConfig,
        tokens,
        registry,
        inlineCssBlocks,
        extraStylesheets,
        projectRoot
      );
    }
  } catch (error) {
    console.warn(chalk.yellow(`Failed to load variant file: ${file}`));
    console.error(error);
  }
}

async function registerVariant(
  variant: VariantConfig<string, string>,
  tokens: Record<string, TokenInterface>,
  registry: VariantRegistry,
  inlineCssBlocks: string[],
  extraStylesheets: string[],
  projectRoot: string
) {
  const component = variant.component;
  const name = variant.name;

  if (!component || !name) {
    console.warn(
      chalk.yellow('Variant missing required "component" or "name" property. Skipping.')
    );
    return;
  }

  const tokenKey = `${ZEBKIT_PREFIX}-${component}`;

  if (!tokens[tokenKey]) {
    console.warn(
      chalk.yellow(
        `No token map found for component "${component}" (expected key "${tokenKey}"). Skipping variant "${name}".`
      )
    );
    return;
  }

  const className =
    variant.classNameOverride ?? `${ZEBKIT_PREFIX}-${component}--${name}`;

  const overrides: Record<string, string> = {};
  const sourceTokens = tokens[tokenKey];

  if (variant.overrides) {
    for (const [key, value] of Object.entries(variant.overrides)) {
      if (!Object.prototype.hasOwnProperty.call(sourceTokens, key)) {
        console.warn(
          chalk.yellow(
            `Variant "${component}.${name}" has override for unknown token "${key}". Ignoring.`
          )
        );
        continue;
      }
      if (typeof value !== 'string') {
        console.warn(
          chalk.yellow(
            `Variant "${component}.${name}" override for "${key}" must be a string. Ignoring.`
          )
        );
        continue;
      }
      overrides[key] = value;
    }
  }

  if (!registry[component]) {
    registry[component] = {};
  }
  registry[component][name] = {
    component,
    name,
    className,
    overrides,
  };

  const declarations: string[] = [];
  for (const [key, value] of Object.entries(overrides)) {
    const sourceToken = sourceTokens[key];
    const resolvedValue =
      typeof value === 'string'
        ? convertDotNotation(value, sourceToken.type, ZEBKIT_PREFIX, tokens)
        : String(value);
    declarations.push(`--${tokenKey}-${key}: ${resolvedValue};`);
  }

  if (variant.styles?.inline) {
    const inline = Array.isArray(variant.styles.inline)
      ? variant.styles.inline
      : [variant.styles.inline];

    const extraDeclarations = inline
      .map((line) => line.trim())
      .filter(Boolean);

    declarations.push(...extraDeclarations);
  }

  if (declarations.length > 0) {
    inlineCssBlocks.push(`.${className} {\n  ${declarations.join('\n  ')}\n}`);
  }

  if (variant.styles?.stylesheetPaths?.length) {
    for (const sheet of variant.styles.stylesheetPaths) {
      if (!sheet) continue;
      const absPath = path.isAbsolute(sheet)
        ? sheet
        : path.resolve(projectRoot, sheet);
      extraStylesheets.push(absPath);
    }
  }
}
