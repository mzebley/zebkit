// The variant compiler stitches together runtime variant registries, inline CSS,
// and additional stylesheet imports. Variants can come from TypeScript modules in
// src/core or src/components, and end-users can override them by providing JSON
// exports when running the token builder in custom theme mode.
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
import {
  buildVariantMetaKey,
  extractVariantOverrideEntries,
  isVariantOverrideFile,
  mergeVariantOverrideEntry,
  normalizeVariantOverrideEntry,
  VariantMetadataEntry,
} from './compile-variant-helpers';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * In-memory representation of a single variant entry. The runtime registry maps
 * component -> variant name -> entry so components can resolve classNames and CSS vars.
 */
export interface VariantRuntimeEntry {
  component: string;
  name: string;
  className: string;
  overrides: Record<string, string>;
}

/**
 * Runtime registry shape used by component scripts (e.g. button) to look up variants.
 */
export interface VariantRegistry {
  [component: string]: {
    [variantName: string]: VariantRuntimeEntry;
  };
}
export type { VariantMetadataEntry } from './compile-variant-helpers';

/**
 * Output shape from buildZebkitVariants. Besides the registry it produces any inline
 * CSS declarations (variant overrides + optional styles) and extra stylesheet imports.
 */
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
  tokens: Record<string, TokenInterface>,
  customVariantPath?: string | string[]
): Promise<BuildZebkitVariantsResult> {
  // Friendly CLI spinner to give the user feedback during variant collection.
  const spinner = ora('Processing Zebkit variants...').start();

  // Registry + CSS state we construct through the run.
  const registry: VariantRegistry = {};
  const variantMetadata = new Map<string, VariantMetadataEntry>();

  try {
    // Determine base directories to inspect for variant modules relative to scripts dir.
    const projectRoot = path.resolve(__dirname, '../../..');
    const coreDir = path.resolve(__dirname, '../../core');
    const componentsDir = path.resolve(__dirname, '../../components');

    // Collect glob patterns for core/components variant folders.
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
        variantMetadata,
        projectRoot
      );
    }

    const buildOutputs = () => buildVariantOutputs(registry, variantMetadata, tokens);
    let { inlineCss, extraStylesheets } = buildOutputs();

    const overridePaths = Array.isArray(customVariantPath)
      ? customVariantPath
      : customVariantPath
      ? [customVariantPath]
      : [];

    for (const overridePath of overridePaths) {
      // Once built-in variants are loaded, optionally apply overlay JSON overrides.
      await applyVariantOverrides(overridePath, registry, tokens, variantMetadata);
    }

    if (overridePaths.length > 0) {
      ({ inlineCss, extraStylesheets } = buildOutputs());
    }

    spinner.succeed(chalk.green('Variant processing complete.'));
    return {
      registry,
      inlineCss,
      extraStylesheets,
    };
  } catch (error) {
    spinner.fail(chalk.red('Failed to process Zebkit variants.'));
    throw error;
  }
}

async function loadVariantFile(
  file: string,
  tokens: Record<string, TokenInterface>,
  registry: VariantRegistry,
  variantMetadata: Map<string, VariantMetadataEntry>,
  projectRoot: string
) {
  try {
    const baseName = path.basename(file);
    // Skip plain type helper files that shouldn't be evaluated.
    if (baseName === 'types.ts') return;

    // Dynamically import the module via file:// so ts-node/tsx can resolve TS output.
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
      // Ignore module namespaces or non-object exports without required fields.
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
        variantMetadata,
        projectRoot
      );
    }
  } catch (error) {
    // A variant module that fails to load would silently drop its variant CSS
    // from the bundle — fail the build instead.
    throw new Error(`Failed to load variant file ${file}: ${error}`);
  }
}

async function applyVariantOverrides(
  overridePath: string,
  registry: VariantRegistry,
  tokens: Record<string, TokenInterface>,
  variantMetadata: Map<string, VariantMetadataEntry>
) {
  // Support both absolute and relative override references (CLI accepts either).
  const resolvedOverridePath = path.isAbsolute(overridePath)
    ? overridePath
    : path.resolve(process.cwd(), overridePath);

  if (!(await fs.pathExists(resolvedOverridePath))) {
    console.warn(
      chalk.yellow(
        `Variant override path '${resolvedOverridePath}' does not exist. Skipping variant overrides.`
      )
    );
    return;
  }

  const stats = await fs.stat(resolvedOverridePath);
  const overrideFiles: string[] = [];

  // A single file means user pointed directly at JSON; directories are globbed.
  if (stats.isFile()) {
    if (isVariantOverrideFile(resolvedOverridePath)) {
      overrideFiles.push(resolvedOverridePath);
    }
  } else if (stats.isDirectory()) {
    const files = await glob('**/*.json', {
      cwd: resolvedOverridePath,
      absolute: true,
      nodir: true,
    });
    overrideFiles.push(...files.filter(isVariantOverrideFile));
  } else {
    console.warn(
      chalk.yellow(
        `Variant override path '${resolvedOverridePath}' is neither a file nor a directory.`
      )
    );
    return;
  }

  for (const file of overrideFiles) {
    try {
      // Parse raw JSON and convert it into a flat list of entries, regardless of structure.
      const rawData = await fs.readJson(file);
      const entries = extractVariantOverrideEntries(rawData);
      if (entries.length === 0) continue;

      for (const entry of entries) {
        mergeVariantOverrideEntry(
          entry,
          registry,
          tokens,
          variantMetadata,
          path.basename(file)
        );
      }
    } catch (error) {
      // The user explicitly pointed the build at this override file; continuing
      // would silently ship CSS without it.
      throw new Error(`Failed to parse variant override file '${file}': ${error}`);
    }
  }
}

export {
  buildVariantMetaKey,
  extractVariantOverrideEntries,
  isVariantOverrideFile,
  mergeVariantOverrideEntry,
  normalizeVariantOverrideEntry,
} from './compile-variant-helpers';

async function registerVariant(
  variant: VariantConfig<string, string>,
  tokens: Record<string, TokenInterface>,
  registry: VariantRegistry,
  variantMetadata: Map<string, VariantMetadataEntry>,
  projectRoot: string
) {
  // Hard fail (with warning) if component or name missing.
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

  const inlineStyles =
    variant.styles?.inline
      ? (Array.isArray(variant.styles.inline)
          ? variant.styles.inline
          : [variant.styles.inline]
        )
          .map((line) => line.trim())
          .filter(Boolean)
      : [];

  const stylesheetPaths: string[] = [];
  if (variant.styles?.stylesheetPaths?.length) {
    for (const sheet of variant.styles.stylesheetPaths) {
      if (!sheet) continue;
      const absPath = path.isAbsolute(sheet)
        ? sheet
        : path.resolve(projectRoot, sheet);
      stylesheetPaths.push(absPath);
    }
  }

  variantMetadata.set(buildVariantMetaKey(component, name), {
    component,
    name,
    className,
    inlineStyles,
    stylesheetPaths,
  });
}

function buildVariantOutputs(
  registry: VariantRegistry,
  variantMetadata: Map<string, VariantMetadataEntry>,
  tokens: Record<string, TokenInterface>
): { inlineCss: string; extraStylesheets: string[] } {
  const inlineCssBlocks: string[] = [];
  const extraStylesheetSet = new Set<string>();
  const referenceErrors: string[] = [];

  for (const [component, variants] of Object.entries(registry)) {
    const tokenKey = `${ZEBKIT_PREFIX}-${component}`;
    const sourceTokens = tokens[tokenKey];
    if (!sourceTokens) continue;

    for (const [name, entry] of Object.entries(variants)) {
      const meta = variantMetadata.get(buildVariantMetaKey(component, name));
      const className = meta?.className ?? entry.className;
      const declarations: string[] = [];

      for (const [key, value] of Object.entries(entry.overrides || {})) {
        const sourceToken = sourceTokens[key];
        if (!sourceToken) continue;
        const resolvedValue =
          typeof value === 'string'
            ? convertDotNotation(
                value,
                sourceToken.type,
                ZEBKIT_PREFIX,
                tokens,
                false,
                referenceErrors
              )
            : String(value);
        declarations.push(`--${tokenKey}-${key}: ${resolvedValue};`);
      }

      if (meta?.inlineStyles?.length) {
        declarations.push(...meta.inlineStyles);
      }

      if (declarations.length > 0) {
        inlineCssBlocks.push(`.${className} {\n  ${declarations.join('\n  ')}\n}`);
      }

      if (meta?.stylesheetPaths?.length) {
        for (const sheet of meta.stylesheetPaths) {
          extraStylesheetSet.add(sheet);
        }
      }
    }
  }

  if (referenceErrors.length > 0) {
    throw new Error(
      `Variant overrides contain invalid token references:\n${referenceErrors
        .map((e) => `  - ${e}`)
        .join('\n')}`
    );
  }

  const inlineCss =
    inlineCssBlocks.length > 0 ? inlineCssBlocks.join('\n\n') + '\n' : '';

  return {
    inlineCss,
    extraStylesheets: Array.from(extraStylesheetSet),
  };
}
