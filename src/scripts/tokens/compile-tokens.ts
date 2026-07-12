import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';
import ora from 'ora';
import { glob } from 'glob';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ZodSchema, z } from 'zod';
import { TokenInterface } from '@definitions/tokens';
import { DEFAULT_LAYER, LayerName } from '@definitions/layers';
import { ZEBKIT_PREFIX } from '@config';
import {
  buildFilePayload,
  inferTokenKeyFromFilename,
  isVariantOverrideFile,
  mergeOverrideObject,
  mergeTokens,
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
   * Drives minimal overlay emission (emit only what changed).
   */
  overriddenKeys: Record<string, Set<string>>;
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
          const { _key, _layer, ...tokenData } = data as Record<string, any>;
          const tokenKey: string = _key ?? path.basename(file, '.json');
          const moduleLayer: LayerName = _layer ?? DEFAULT_LAYER;
          tokens[tokenKey] = tokenData as TokenInterface;
          layers[tokenKey] = moduleLayer;
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

        if (validateTokenExport(tokensExport, tokenSchema)) {
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
          fatalErrors.push(`Invalid token structure in file: ${file}`);
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
    await applyCustomOverrides(overridePath, tokens, tokenSchemas, undefined, options.excludedComponents);
  }
  if (customTokenPath) {
    await applyCustomOverrides(
      customTokenPath,
      tokens,
      tokenSchemas,
      overriddenKeys,
      options.excludedComponents
    );
  }

  if (Object.keys(tokens).length === 0) {
    throw new Error(
      'No valid token modules were loaded — the build would emit empty CSS. Check the token source paths.'
    );
  }

  if (exportFile) await writeTokensToFile(tokens, resolvedDestination, outputFormats, themeName, splitMode);

  return { tokens, layers, overriddenKeys };
}

function validateTokenExport(tokenExport: unknown, schema: ZodSchema): boolean {
  try {
    schema.parse(tokenExport);
    return true;
  } catch (error) {
    console.warn(chalk.yellow('Token export failed schema validation.'));
    return false;
  }
}

async function applyCustomOverrides(
  overridePath: string,
  tokens: Record<string, TokenInterface>,
  tokenSchemas: Record<string, ZodSchema>,
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
      const customTokenData = await fs.readJson(resolvedOverridePath);
      mergeOverrideObject(customTokenData, tokens, tokenSchemas, touched, excludedModuleKeys);
    } else if (stats.isDirectory()) {
      const overrideFiles = await glob('**/*.json', {
        cwd: resolvedOverridePath,
        absolute: true,
        nodir: true,
      });

      for (const file of overrideFiles) {
        const data = await fs.readJson(file);
        const inferredKey = inferTokenKeyFromFilename(file);

        if (Object.keys(data).some((key) => key.startsWith(`${ZEBKIT_PREFIX}-`))) {
          mergeOverrideObject(data, tokens, tokenSchemas, touched, excludedModuleKeys);
        } else if (inferredKey && tokens[inferredKey]) {
          mergeOverrideObject({ [inferredKey]: data }, tokens, tokenSchemas, touched);
        } else if (isVariantOverrideFile(file)) {
          console.info(
            chalk.gray(
              `Detected variant override file '${path.basename(
                file
              )}'. It will be applied during variant processing.`
            )
          );
        } else if (inferredKey && excludedModuleKeys.has(inferredKey)) {
          console.warn(
            chalk.yellow(
              `Override file '${path.basename(file)}' targets component ` +
                `"${inferredKey.slice(ZEBKIT_PREFIX.length + 1)}", which is excluded by the ` +
                `components config. Remove the file or re-include the component.`
            )
          );
        } else {
          console.warn(
            chalk.yellow(`No matching token key for override file: ${path.basename(file)}`)
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

export {
  buildFilePayload,
  inferTokenKeyFromFilename,
  isVariantOverrideFile,
  mergeOverrideObject,
  mergeTokens,
} from './compile-token-helpers';

export async function writeTokensToFile(
  tokens: Record<string, TokenInterface>,
  destinationPath: string,
  outputFormats: string[],
  themeName: string,
  splitMode: BuildZebkitTokensOptions['splitMode']
) {
  const writeSpinner = ora('Writing tokens to file(s)...').start();
  const destinationPaths: string[] = [];
  const normalizedFormats = outputFormats.map((format) => format.toLowerCase());
  const resolvedSplitMode = splitMode ?? 'combined';

  try {
    await fs.ensureDir(destinationPath);

    if (resolvedSplitMode === 'per-module') {
      for (const tokenKey of Object.keys(tokens)) {
        for (const format of normalizedFormats) {
          const { filePath, fileContent } = buildFilePayload(
            format,
            path.join(destinationPath, `${tokenKey}.tokens`),
            tokens[tokenKey]
          );
          await fs.writeFile(filePath, fileContent);
          destinationPaths.push(filePath);
        }
      }
    } else {
      for (const format of normalizedFormats) {
        const { filePath, fileContent } = buildFilePayload(
          format,
          path.join(destinationPath, `${themeName}-tokens`),
          tokens
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
