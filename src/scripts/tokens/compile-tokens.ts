import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';
import ora from 'ora';
import { glob } from 'glob';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ZodSchema, z } from 'zod';
import { TokenInterface, TokenGroupExtensions } from '@definitions/tokens';
import { DEFAULT_LAYER, LayerName } from '@definitions/layers';
import { ZEBKIT_PREFIX } from '@config';
import {
  buildFilePayload,
  inferTokenKeyFromFilename,
  isCanonicalTokenOverrideFile,
  isVariantOverrideFile,
  mergeGroupExtensions,
  mergeOverrideObject,
  mergeTokens,
  validateTokenExport,
} from './compile-token-helpers';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface BuildZebkitTokensOptions {
  splitMode?: 'combined' | 'per-module';
  overridePaths?: string[];
  /**
   * Component names excluded by the `components` config. Their token modules
   * never reach this compile (dropped at gather); the set is used here to give
   * overrides that still target them a warning that names the fix.
   */
  excludedComponents?: ReadonlySet<string>;
}

export interface BuildZebkitTokensResult {
  tokens: Record<string, TokenInterface>;
  layers: Record<string, LayerName>;
  /**
   * Per-module set of leaf token names that overrides actually wrote, e.g.
   * `{ 'zbk-accent-primary': Set('default','hover') }`. Empty when no overrides applied.
   * Drives minimal overlay emission (emit only what changed). Overridden group-level
   * scale controls appear here under their control name (e.g. `max-scale`) — they
   * never exist as entries in `tokens`, which is exactly how the emission closure
   * recognizes them as consumed build-time controls.
   */
  overriddenKeys: Record<string, Set<string>>;
  /**
   * Group-level `$extensions["dev.zebkit"]` metadata per module (fluid-scale
   * controls), collected from module `extensions` exports / snapshot JSON and
   * merged with override documents' top-level `$extensions` members. Not tokens;
   * never emitted as CSS custom properties.
   */
  groupExtensions: Record<string, TokenGroupExtensions>;
}

/**
 * Loads Zebkit token modules (each token folder should export `key` and a default token map
 * that matches its sibling `token-schema.ts`), validates them, applies optional overrides,
 * and writes combined/per-module token artifacts. The ZEBKIT_PREFIX is fixed to avoid
 * prompting users for prefixes.
 */
export async function buildZebkitTokens(
  themeName: string,
  files: string[],
  destinationPath: string,
  customTokenPath: string | undefined,
  outputFormats: string[],
  options: BuildZebkitTokensOptions = {},
  exportFile: boolean
): Promise<BuildZebkitTokensResult> {
  const tokens: Record<string, TokenInterface> = {};
  const layers: Record<string, LayerName> = {};
  const tokenSchemas: Record<string, ZodSchema> = {};
  const overriddenKeys: Record<string, Set<string>> = {};
  const groupExtensions: Record<string, TokenGroupExtensions> = {};
  const splitMode = options.splitMode ?? 'combined';
  const overridePaths = options.overridePaths ?? [];

  const spinner = ora('Processing Zebkit tokens...').start();
  const tokensDir = path.resolve(__dirname, '../../tokens');
  const componentsDir = path.resolve(__dirname, '../../components');
  // Problems that would silently produce incomplete CSS (a broken/missing token
  // module or schema). Collected across the loop, then thrown as one failure so
  // the build exits non-zero instead of shipping a partial theme.
  const fatalErrors: string[] = [];

  try {
    for (const file of files) {
      // JSON mode: pre-compiled defaults loaded by the installed CLI
      if (path.isAbsolute(file) && file.endsWith('.json')) {
        try {
          const data = await fs.readJson(file);
          const { _key, _layer, $extensions, ...tokenData } = data as Record<string, any>;
          const tokenKey: string = _key ?? path.basename(file, '.json');
          const moduleLayer: LayerName = _layer ?? DEFAULT_LAYER;
          tokens[tokenKey] = tokenData as TokenInterface;
          layers[tokenKey] = moduleLayer;
          if ($extensions) {
            mergeGroupExtensions(tokenKey, $extensions, groupExtensions);
          }
        } catch (error) {
          console.error(chalk.red(`Error loading JSON token file ${file}:`), error);
          fatalErrors.push(`Failed to load JSON token file ${file}: ${error}`);
        }
        continue;
      }

      let baseDir = '';
      let relativePath = '';

      if (file.startsWith('tokens/')) {
        baseDir = tokensDir;
        relativePath = file.replace('tokens/', '');
      } else if (file.startsWith('components/')) {
        baseDir = componentsDir;
        relativePath = file.replace('components/', '');
      } else {
        console.warn(chalk.yellow(`Unknown file origin: ${file}`));
        continue;
      }

      const tokenPath = path.join(baseDir, relativePath);
      const folderName = path.dirname(relativePath); // e.g., button/tokens
      const schemaPath = path.join(baseDir, folderName, 'token-schema.ts');

      if (!(await fs.pathExists(tokenPath))) {
        fatalErrors.push(`Token file missing: ${tokenPath}`);
        continue;
      }
      if (!(await fs.pathExists(schemaPath))) {
        fatalErrors.push(`Schema missing for token file: ${schemaPath}`);
        continue;
      }

      try {
        const [tokenModule, schemaModule] = await Promise.all([
          import(pathToFileURL(tokenPath).href),
          import(pathToFileURL(schemaPath).href),
        ]);

        const tokensExport = tokenModule.default ?? tokenModule;
        const tokenSchema = schemaModule['tokenSchema'] as ZodSchema;
        const moduleLayer: LayerName = tokenModule.layer ?? DEFAULT_LAYER;

        const moduleKey =
          tokenModule.key || path.basename(path.dirname(folderName)) || path.basename(folderName);
        const tokenKey = `${ZEBKIT_PREFIX}-${moduleKey}`;

        const schemaErrors = validateTokenExport(tokensExport, tokenSchema);
        if (schemaErrors.length === 0) {
          // Group-level metadata (fluid-scale controls) rides a named `extensions`
          // export next to the default token map.
          if (tokenModule.extensions) {
            mergeGroupExtensions(tokenKey, tokenModule.extensions, groupExtensions);
          }
          // Merge modules that share the same logical key (e.g., primitive + semantic spacing).
          // Copy the imported export rather than aliasing it: token modules are ES singletons
          // cached for the process lifetime, so mutating one (below, or via overrides) would
          // leak keys into later builds in the same process (e.g. the hero-themes loop).
          if (!tokens[tokenKey]) {
            tokens[tokenKey] = { ...tokensExport };
            tokenSchemas[tokenKey] = tokenSchema;
            layers[tokenKey] = moduleLayer;
          } else {
            const existingSchema = tokenSchemas[tokenKey];
            if (
              existingSchema instanceof z.ZodObject &&
              tokenSchema instanceof z.ZodObject
            ) {
              tokenSchemas[tokenKey] = existingSchema.merge(tokenSchema);
            }
            if (layers[tokenKey] && layers[tokenKey] !== moduleLayer) {
              console.warn(
                chalk.yellow(
                  `Token '${tokenKey}' is defined across multiple modules with conflicting layers. Using existing layer '${layers[tokenKey]}'.`
                )
              );
            } else {
              layers[tokenKey] = moduleLayer;
            }
            for (const [prop, value] of Object.entries(tokensExport)) {
              if ((tokens[tokenKey] as any)[prop]) {
                console.warn(
                  chalk.yellow(
                    `Token '${tokenKey}.${prop}' is being overwritten by ${relativePath}. Verify this is intentional.`
                  )
                );
              }
              (tokens[tokenKey] as any)[prop] = value;
            }
          }
        } else {
          fatalErrors.push(`Invalid token structure in file: ${file}\n${schemaErrors.map((issue) => `    ${issue}`).join('\n')}`);
        }
      } catch (error) {
        console.error(chalk.red(`Error importing token file ${file}:`), error);
        fatalErrors.push(`Failed to import token file ${file}: ${error}`);
      }
    }
    if (fatalErrors.length > 0) {
      throw new Error(
        `Token processing failed:\n${fatalErrors.map((e) => `  - ${e}`).join('\n')}`
      );
    }
    spinner.succeed(chalk.green('Token processing complete.'));
  } catch (error) {
    spinner.fail(chalk.red('Failed to process tokens.'));
    throw error;
  }

  const resolvedDestination = path.isAbsolute(destinationPath)
    ? destinationPath
    : path.resolve(process.cwd(), destinationPath);

  // `overridePaths` supply base context (source/variant theme overrides) and are NOT
  // tracked. Only `customTokenPath` is tracked into `overriddenKeys`, so an overlay build
  // can emit just the tokens that overlay itself changed (minimal emission).
  for (const overridePath of overridePaths) {
    await applyCustomOverrides(
      overridePath,
      tokens,
      tokenSchemas,
      groupExtensions,
      undefined,
      options.excludedComponents
    );
  }
  if (customTokenPath) {
    await applyCustomOverrides(
      customTokenPath,
      tokens,
      tokenSchemas,
      groupExtensions,
      overriddenKeys,
      options.excludedComponents
    );
  }

  if (Object.keys(tokens).length === 0) {
    throw new Error(
      'No valid token modules were loaded — the build would emit empty CSS. Check the token source paths.'
    );
  }

  if (exportFile)
    await writeTokensToFile(
      tokens,
      resolvedDestination,
      outputFormats,
      themeName,
      splitMode,
      groupExtensions
    );

  return { tokens, layers, overriddenKeys, groupExtensions };
}

async function applyCustomOverrides(
  overridePath: string,
  tokens: Record<string, TokenInterface>,
  tokenSchemas: Record<string, ZodSchema>,
  groupExtensions: Record<string, TokenGroupExtensions>,
  touched?: Record<string, Set<string>>,
  excludedComponents?: ReadonlySet<string>
) {
  const spinner = ora('Processing custom token overrides...').start();
  const resolvedOverridePath = path.isAbsolute(overridePath)
    ? overridePath
    : path.resolve(process.cwd(), overridePath);

  try {
    if (!(await fs.pathExists(resolvedOverridePath))) {
      spinner.warn(
        chalk.yellow(`Custom token overrides path not found: ${resolvedOverridePath}. Skipping.`)
      );
      return;
    }

    const excludedModuleKeys = new Set(
      [...(excludedComponents ?? [])].map((component) => `${ZEBKIT_PREFIX}-${component}`)
    );

    const stats = await fs.stat(resolvedOverridePath);
    if (stats.isFile()) {
      await applyTokenOverrideFile(
        resolvedOverridePath,
        tokens,
        tokenSchemas,
        groupExtensions,
        touched,
        excludedModuleKeys
      );
    } else if (stats.isDirectory()) {
      const overrideFiles = await glob('**/*.json', {
        cwd: resolvedOverridePath,
        absolute: true,
        nodir: true,
      });

      for (const file of overrideFiles) {
        if (isVariantOverrideFile(file)) {
          console.info(
            chalk.gray(
              `Detected variant override file '${path.basename(
                file
              )}'. It will be applied during variant processing.`
            )
          );
        } else {
          await applyTokenOverrideFile(
            file,
            tokens,
            tokenSchemas,
            groupExtensions,
            touched,
            excludedModuleKeys
          );
        }
      }
    } else {
      console.warn(chalk.yellow('Custom overrides path is not a file or directory.'));
    }
    spinner.succeed(chalk.green('Custom token overrides processed.'));
  } catch (error) {
    // A named overrides path that cannot be read (malformed JSON, IO failure) is
    // fatal: continuing would silently ship CSS without the user's overrides.
    spinner.fail(chalk.red(`Failed to process custom token overrides at ${resolvedOverridePath}.`));
    throw error;
  }
}

async function applyTokenOverrideFile(
  file: string,
  tokens: Record<string, TokenInterface>,
  tokenSchemas: Record<string, ZodSchema>,
  groupExtensions: Record<string, TokenGroupExtensions>,
  touched: Record<string, Set<string>> | undefined,
  excludedModuleKeys: ReadonlySet<string>
): Promise<void> {
  if (!isCanonicalTokenOverrideFile(file)) {
    const basename = path.basename(file);
    const stem = basename.replace(/\.json$/i, '').replace(/\.tokens$/i, '');
    const suggested = stem.startsWith(`${ZEBKIT_PREFIX}-`)
      ? `${stem}.tokens.json`
      : `${ZEBKIT_PREFIX}-${stem}.tokens.json`;
    throw new Error(
      `Invalid token override filename '${basename}'. ` +
        `Token override files must use 'zbk-<module>.tokens.json'; rename it to '${suggested}'.`
    );
  }

  const data = await fs.readJson(file);
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error(`Token override file '${path.basename(file)}' must contain a JSON object.`);
  }
  if (Object.keys(data).some((key) => key.startsWith(`${ZEBKIT_PREFIX}-`))) {
    throw new Error(
      `Token override file '${path.basename(file)}' must contain an unwrapped token object. ` +
        `Remove the outer '${inferTokenKeyFromFilename(file)}' key.`
    );
  }

  const inferredKey = inferTokenKeyFromFilename(file)!;
  if (tokens[inferredKey]) {
    // A top-level `$extensions` member carries group-level scale-control
    // overrides; it is not a token entry. Overridden control names are recorded
    // into `touched` so overlay emission re-emits the modules they shape.
    const { $extensions: groupOverride, ...entryData } = data as Record<string, unknown>;
    if (groupOverride) {
      mergeGroupExtensions(inferredKey, groupOverride, groupExtensions, touched);
    }
    mergeOverrideObject({ [inferredKey]: entryData }, tokens, tokenSchemas, touched);
    return;
  }
  if (excludedModuleKeys.has(inferredKey)) {
    console.warn(
      chalk.yellow(
        `Override file '${path.basename(file)}' targets component ` +
          `"${inferredKey.slice(ZEBKIT_PREFIX.length + 1)}", which is excluded by the ` +
          `components config. Remove the file or re-include the component.`
      )
    );
    return;
  }
  throw new Error(
    `Token override file '${path.basename(file)}' does not match a token module in this build.`
  );
}

export {
  buildFilePayload,
  inferTokenKeyFromFilename,
  isCanonicalTokenOverrideFile,
  isVariantOverrideFile,
  mergeGroupExtensions,
  mergeOverrideObject,
  mergeTokens,
} from './compile-token-helpers';

export async function writeTokensToFile(
  tokens: Record<string, TokenInterface>,
  destinationPath: string,
  outputFormats: string[],
  themeName: string,
  splitMode: BuildZebkitTokensOptions['splitMode'],
  groupExtensions: Record<string, TokenGroupExtensions> = {}
) {
  const writeSpinner = ora('Writing tokens to file(s)...').start();
  const destinationPaths: string[] = [];
  const normalizedFormats = outputFormats.map((format) => format.toLowerCase());
  const resolvedSplitMode = splitMode ?? 'combined';

  // Group-level metadata rides inside each module object as a `$extensions`
  // member (the DTCG group shape), alongside the token entries.
  const modulePayload = (tokenKey: string): Record<string, unknown> =>
    groupExtensions[tokenKey]
      ? { $extensions: groupExtensions[tokenKey], ...tokens[tokenKey] }
      : tokens[tokenKey];

  try {
    await fs.ensureDir(destinationPath);

    if (resolvedSplitMode === 'per-module') {
      for (const tokenKey of Object.keys(tokens)) {
        for (const format of normalizedFormats) {
          const { filePath, fileContent } = buildFilePayload(
            format,
            path.join(destinationPath, `${tokenKey}.tokens`),
            modulePayload(tokenKey)
          );
          await fs.writeFile(filePath, fileContent);
          destinationPaths.push(filePath);
        }
      }
    } else {
      const combined = Object.fromEntries(
        Object.keys(tokens).map((tokenKey) => [tokenKey, modulePayload(tokenKey)])
      );
      for (const format of normalizedFormats) {
        const { filePath, fileContent } = buildFilePayload(
          format,
          path.join(destinationPath, `${themeName}-tokens`),
          combined
        );
        await fs.writeFile(filePath, fileContent);
        destinationPaths.push(filePath);
      }
    }

    writeSpinner.succeed(chalk.green('All tokens have been written successfully.'));
    console.log(chalk.green(`Tokens written to: ${destinationPaths.join(', ')}`));
  } catch (error) {
    writeSpinner.fail(chalk.red('Failed to write tokens to file(s).'));
    throw error;
  }
}
