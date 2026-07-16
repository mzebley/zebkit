// The variant compiler stitches together runtime variant registries, inline CSS,
// and additional stylesheet imports. Variants can come from TypeScript modules in
// src/tokens or src/components, and end-users can override them by providing JSON
// exports when running the token builder in custom theme mode.
import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';
import ora from 'ora';
import { glob } from 'glob';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { TokenInterface } from '@definitions/tokens';
import type { VariantConfig } from '@definitions/token-variants';
import type { ComponentsFilter } from '../components-config';
import { convertDotNotation } from './token-converter';
import { computeEmissionClosure } from './build-helpers';
import { ZEBKIT_PREFIX } from '@config';
import {
  assertShippedVariantsAreTokenOnly,
  buildVariantMetaKey,
  extractVariantOverrideEntries,
  filterShippedVariants,
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
  /** Advisory composition axis (e.g. "style", "size"). */
  axis?: string;
  /** One-line summary surfaced in the registry, docs, and agent context. */
  description?: string;
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

export interface BuildZebkitVariantsOptions {
  /**
   * JSON snapshot of built-in variant configs to load instead of discovering TS
   * modules from src/ (installed CLI mode — the TS sources don't ship, and the
   * bundled CLI couldn't import them anyway). Written by `npm run build:defaults`.
   */
  snapshotPath?: string;
  /**
   * Root that relative variant `styles.stylesheetPaths` resolve against.
   * Defaults to the repo root inferred from this file's location (dev mode);
   * pass the zebkit package root in installed CLI mode.
   */
  packageRoot?: string;
  /**
   * Resolved `components` config block. Excluded components' variants are
   * dropped wholesale; shipped variants outside a component's allowlist are
   * dropped and consumer overrides that target them warn with the fix.
   * Custom (new-name) consumer variants are never filtered.
   */
  componentsFilter?: ComponentsFilter;
}

/**
 * Discovers built-in variant configs from TS modules under:
 *   - src/tokens/**\/variants/*.ts
 *   - src/components/**\/variants/*.ts
 *
 * Each file may default-export a single VariantConfig, an array of VariantConfig,
 * or expose `variants` as an array. Only usable in dev mode (requires the TS
 * sources plus a TS-aware loader); the installed CLI loads a JSON snapshot instead.
 */
export async function discoverVariantConfigs(): Promise<VariantConfig[]> {
  const tokensDir = path.resolve(__dirname, '../../tokens');
  const componentsDir = path.resolve(__dirname, '../../components');

  const variantPatterns: string[] = [];
  if (await fs.pathExists(tokensDir)) {
    variantPatterns.push(path.join(tokensDir, '**/variants/*.ts'));
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
    // glob order follows filesystem readdir and varies between machines/runs.
    // Sort so config discovery order — and thus the registry insertion order that
    // drives the emitted variant CSS block order — is byte-reproducible.
    variantFiles.push(...matches.sort());
  }

  const configs: VariantConfig[] = [];
  // A variant is typically exported both by its own module and by the
  // component's variants/index.ts registry; dedupe by component + name so the
  // snapshot and registry hold each config exactly once.
  const seen = new Set<string>();
  for (const file of variantFiles) {
    for (const config of await loadVariantFile(file)) {
      const key = `${config.component}::${config.name}`;
      if (seen.has(key)) continue;
      seen.add(key);
      configs.push(config);
    }
  }
  return configs;
}

/** Loads built-in variant configs from the JSON snapshot shipped with the package. */
async function loadVariantSnapshot(snapshotPath: string): Promise<VariantConfig[]> {
  const data = await fs.readJson(snapshotPath);
  if (!Array.isArray(data)) {
    throw new Error(`Variant snapshot at ${snapshotPath} is not an array of variant configs.`);
  }
  return data as VariantConfig[];
}

/**
 * Loads Zebkit variant configs (TS discovery in dev, JSON snapshot when installed),
 * validates their overrides against the token maps, resolves class names, and
 * aggregates inline CSS + extra stylesheet imports.
 */
export async function buildZebkitVariants(
  tokens: Record<string, TokenInterface>,
  customVariantPath?: string | string[],
  options: BuildZebkitVariantsOptions = {}
): Promise<BuildZebkitVariantsResult> {
  // Friendly CLI spinner to give the user feedback during variant collection.
  const spinner = ora('Processing Zebkit variants...').start();

  // Registry + CSS state we construct through the run.
  const registry: VariantRegistry = {};
  const variantMetadata = new Map<string, VariantMetadataEntry>();

  try {
    const projectRoot = options.packageRoot ?? path.resolve(__dirname, '../../..');

    const configs = options.snapshotPath
      ? await loadVariantSnapshot(options.snapshotPath)
      : await discoverVariantConfigs();

    // GRAMMAR.md §6: zebkit-shipped variants are token-only. The styles escape
    // hatch exists for consumers (variant JSON overlays); a shipped variant
    // that needs a CSS declaration is a component token-surface gap. Linted
    // pre-filter so the vocabulary stays clean regardless of any config.
    assertShippedVariantsAreTokenOnly(configs);

    const { activeConfigs, excludedShippedVariants } = filterShippedVariants(
      configs,
      options.componentsFilter
    );

    for (const variant of activeConfigs) {
      await registerVariant(variant, tokens, registry, variantMetadata, projectRoot);
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
      await applyVariantOverrides(
        overridePath,
        registry,
        tokens,
        variantMetadata,
        options.componentsFilter,
        excludedShippedVariants
      );
    }

    if (overridePaths.length > 0) {
      ({ inlineCss, extraStylesheets } = buildOutputs());
    }

    warnOnCrossAxisOverlaps(registry);

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

async function loadVariantFile(file: string): Promise<VariantConfig[]> {
  const baseName = path.basename(file);
  // Skip plain type helper files that shouldn't be evaluated.
  if (baseName === 'types.ts') return [];

  try {
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

    return variants.filter(
      (variant) =>
        // Ignore module namespaces or non-object exports without required fields.
        variant &&
        typeof variant === 'object' &&
        ('component' in variant || Array.isArray(rawExport))
    );
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
  variantMetadata: Map<string, VariantMetadataEntry>,
  componentsFilter?: ComponentsFilter,
  excludedShippedVariants?: Map<string, Set<string>>
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
        // Consumer overrides can't resurrect what the components config removed;
        // both warnings name the fix (GRAMMAR.md §9).
        const component = entry.component.toLowerCase();
        const name = entry.name.toLowerCase();
        if (componentsFilter?.excluded.has(component)) {
          console.warn(
            chalk.yellow(
              `Variant override '${entry.component}.${entry.name}' targets component ` +
                `"${entry.component}", which is excluded by the components config. ` +
                `Remove the override or re-include the component. Source: ${path.basename(file)}`
            )
          );
          continue;
        }
        if (excludedShippedVariants?.get(component)?.has(name)) {
          console.warn(
            chalk.yellow(
              `Variant override '${entry.component}.${entry.name}' patches shipped variant ` +
                `"${entry.name}", which is excluded by components.${entry.component}.variants. ` +
                `Add "${entry.name}" to the allowlist or remove the override. Source: ${path.basename(file)}`
            )
          );
          continue;
        }
        mergeVariantOverrideEntry(
          entry,
          registry,
          tokens,
          variantMetadata,
          path.basename(file),
          path.dirname(file)
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
  filterShippedVariants,
  isVariantOverrideFile,
  mergeVariantOverrideEntry,
  normalizeVariantOverrideEntry,
} from './compile-variant-helpers';
export { writeVariantScaffolds } from './write-variant-scaffolds';

/**
 * Advisory cross-axis check. Same-axis variants are alternatives — overlapping
 * tokens there is expected (the dev runtime warns if a user stacks them). But
 * DIFFERENT axes promise composability (`variant="ghost lg"`), so two
 * different-axis variants overriding the same token is a composability promise
 * the CSS can't keep. Never blocking — the vocabulary stays complete.
 */
function warnOnCrossAxisOverlaps(registry: VariantRegistry): void {
  for (const [component, variants] of Object.entries(registry)) {
    const entries = Object.values(variants).filter((entry) => entry.axis);
    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const a = entries[i];
        const b = entries[j];
        if (a.axis === b.axis) continue;
        const overlap = Object.keys(a.overrides ?? {}).filter((key) =>
          Object.prototype.hasOwnProperty.call(b.overrides ?? {}, key)
        );
        if (overlap.length > 0) {
          console.warn(
            chalk.yellow(
              `Variants "${component}.${a.name}" (axis "${a.axis}") and "${component}.${b.name}" (axis "${b.axis}") both set: ${overlap.join(
                ', '
              )}. Different axes promise composability — move the shared token to one axis or align their axes.`
            )
          );
        }
      }
    }
  }
}

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
    ...(variant.axis ? { axis: variant.axis } : {}),
    ...(variant.description ? { description: variant.description } : {}),
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

      // A CSS custom property inherits its already-substituted value, so a
      // derived token declared at :root (e.g. `--zbk-toggle-thumb-size:
      // var(--zbk-toggle-track-height)`) is locked to the base value and will
      // NOT pick up a variant that only redeclares what it references.
      // Re-emit every same-component token that transitively references an
      // overridden one so the chain re-resolves at the variant's scope — the
      // same closure the theme-overlay pipeline uses.
      const closure = computeEmissionClosure(tokens, {
        [tokenKey]: new Set(Object.keys(entry.overrides || {})),
      });
      for (const [key, sourceToken] of Object.entries(sourceTokens)) {
        if (entry.overrides && key in entry.overrides) continue;
        if (!closure.has(`${tokenKey}.${key}`)) continue;
        const raw = sourceToken.value;
        const resolvedValue =
          typeof raw === 'string'
            ? convertDotNotation(
                raw,
                sourceToken.type,
                ZEBKIT_PREFIX,
                tokens,
                false,
                referenceErrors
              )
            : String(raw);
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
