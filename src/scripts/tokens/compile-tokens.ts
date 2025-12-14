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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface BuildZebkitTokensOptions {
  splitMode?: 'combined' | 'per-module';
}

export interface BuildZebkitTokensResult {
  tokens: Record<string, TokenInterface>;
  layers: Record<string, LayerName>;
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
  const splitMode = options.splitMode ?? 'combined';

  const spinner = ora('Processing Zebkit tokens...').start();
  const coreDir = path.resolve(__dirname, '../../core');
  const componentsDir = path.resolve(__dirname, '../../components');

  try {
    for (const file of files) {
      let baseDir = '';
      let relativePath = '';

      if (file.startsWith('core/')) {
        baseDir = coreDir;
        relativePath = file.replace('core/', '');
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
        console.warn(chalk.yellow(`Token file missing: ${tokenPath}`));
        continue;
      }
      if (!(await fs.pathExists(schemaPath))) {
        console.warn(chalk.yellow(`Schema missing for token file: ${schemaPath}`));
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
          // Merge modules that share the same logical key (e.g., primitive + semantic spacing)
          if (!tokens[tokenKey]) {
            tokens[tokenKey] = tokensExport;
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
          console.warn(chalk.yellow(`Invalid token structure in file: ${file}`));
        }
      } catch (error) {
        console.error(chalk.red(`Error importing token file ${file}:`), error);
      }
    }
    spinner.succeed(chalk.green('Token processing complete.'));
  } catch (error) {
    spinner.fail(chalk.red('Failed to process tokens.'));
    console.error(error);
  }

  const resolvedDestination = path.isAbsolute(destinationPath)
    ? destinationPath
    : path.resolve(process.cwd(), destinationPath);

  if (customTokenPath) {
    await applyCustomOverrides(customTokenPath, tokens, tokenSchemas);
  }

  if (Object.keys(tokens).length === 0) {
    console.error(chalk.bgYellow('No valid tokens to write.'));
    return { tokens, layers };
  }

  if (exportFile) await writeTokensToFile(tokens, resolvedDestination, outputFormats, themeName, splitMode);

  return { tokens, layers };
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
  tokenSchemas: Record<string, ZodSchema>
) {
  const spinner = ora('Processing custom token overrides...').start();
  const resolvedOverridePath = path.isAbsolute(overridePath)
    ? overridePath
    : path.resolve(process.cwd(), overridePath);

  try {
    if (!(await fs.pathExists(resolvedOverridePath))) {
      spinner.fail(chalk.red('Custom token overrides path not found.'));
      return;
    }

    const stats = await fs.stat(resolvedOverridePath);
    if (stats.isFile()) {
      const customTokenData = await fs.readJson(resolvedOverridePath);
      mergeOverrideObject(customTokenData, tokens, tokenSchemas);
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
          mergeOverrideObject(data, tokens, tokenSchemas);
        } else if (inferredKey && tokens[inferredKey]) {
          mergeOverrideObject({ [inferredKey]: data }, tokens, tokenSchemas);
        } else if (isVariantOverrideFile(file)) {
          console.info(
            chalk.gray(
              `Detected variant override file '${path.basename(
                file
              )}'. It will be applied during variant processing.`
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
    spinner.fail(chalk.red('Failed to process custom token overrides.'));
    console.error(error);
  }
}

function inferTokenKeyFromFilename(filePath: string): string | undefined {
  const baseName = path.basename(filePath, path.extname(filePath));
  if (!baseName) return undefined;

  const knownSuffixes = ['.tokens'];
  let normalized = baseName;

  for (const suffix of knownSuffixes) {
    if (normalized.endsWith(suffix)) {
      normalized = normalized.slice(0, -suffix.length);
      break;
    }
  }

  if (!normalized) return undefined;

  return normalized.startsWith(`${ZEBKIT_PREFIX}-`)
    ? normalized
    : `${ZEBKIT_PREFIX}-${normalized}`;
}

function isVariantOverrideFile(filePath: string): boolean {
  const baseName = path.basename(filePath, path.extname(filePath));
  return /-variants$/i.test(baseName) || /\.variant\./i.test(path.basename(filePath));
}

function mergeOverrideObject(
  overrideData: Record<string, any>,
  tokens: Record<string, TokenInterface>,
  tokenSchemas: Record<string, ZodSchema>
) {
  const validKeys = Object.keys(tokens);
  for (const key of Object.keys(overrideData)) {
    if (!validKeys.includes(key)) {
      console.warn(chalk.yellow(`Custom tokens contain an unrecognized key '${key}'. Skipping.`));
      continue;
    }

    const tokenSchema = tokenSchemas[key];
    if (!tokenSchema) {
      console.warn(chalk.yellow(`No schema found for '${key}'. Cannot validate custom tokens.`));
      continue;
    }

    try {
      const mergedTokens = mergeTokens(tokens[key], overrideData[key], tokenSchema, key);
      tokens[key] = mergedTokens;
    } catch (error) {
      console.warn(
        chalk.yellow(`Custom tokens for '${key}' are invalid. Using default tokens.`)
      );
    }
  }
}

function mergeTokens(
  defaultTokens: TokenInterface,
  customTokens: Record<string, any>,
  schema: ZodSchema,
  keyPath: string
): TokenInterface {
  const merged: TokenInterface = { ...defaultTokens };

  for (const key in customTokens) {
    if (!Object.prototype.hasOwnProperty.call(customTokens, key)) continue;

    if (!defaultTokens.hasOwnProperty(key)) {
      console.warn(
        chalk.yellow(`Extra key '${keyPath}.${key}' not found in default tokens. Ignoring.`)
      );
      continue;
    }

    const customValue = customTokens[key];
    const subSchema = schema instanceof z.ZodObject ? schema.shape[key] : undefined;
    if (!subSchema) {
      console.warn(
        chalk.yellow(`Invalid key '${keyPath}.${key}' not defined in schema. Ignoring.`)
      );
      continue;
    }

    try {
      const overrideValue =
        typeof customValue === 'object' &&
        customValue !== null &&
        !Array.isArray(customValue) &&
        'value' in customValue
          ? (customValue as Record<string, any>).value
          : customValue;

      if (typeof overrideValue !== 'string' && typeof overrideValue !== 'number') {
        console.warn(
          chalk.yellow(
            `Custom token for '${keyPath}.${key}' does not contain a valid 'value'. Using default token.`
          )
        );
        continue;
      }

      const nextToken = {
        ...defaultTokens[key],
        value: overrideValue,
      };

      (subSchema as ZodSchema).parse(nextToken);
      merged[key] = nextToken;
    } catch (error) {
      console.warn(
        chalk.yellow(`Invalid value for '${keyPath}.${key}'. Using default value.`)
      );
      merged[key] = defaultTokens[key];
    }
  }

  return merged;
}

async function writeTokensToFile(
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
    console.error(error);
  }
}

function buildFilePayload(
  format: string,
  basePath: string,
  payload: unknown
): { filePath: string; fileContent: string } {
  switch (format) {
    case 'json':
      return {
        filePath: `${basePath}.json`,
        fileContent: JSON.stringify(payload, null, 2),
      };
    case 'typescript':
      return {
        filePath: `${basePath}.ts`,
        fileContent: `export default ${JSON.stringify(payload, null, 2)};\n`,
      };
    case 'javascript':
      return {
        filePath: `${basePath}.js`,
        fileContent: `module.exports = ${JSON.stringify(payload, null, 2)};\n`,
      };
    default:
      throw new Error(`Unsupported format: ${format}`);
  }
}
