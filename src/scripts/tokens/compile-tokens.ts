import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';
import ora from 'ora';
import { glob } from 'glob';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ZodSchema, z } from 'zod';
import { TokenInterface, TokenGroupExtensions, tokenModuleSchema } from '@definitions/tokens';
import { DEFAULT_LAYER, LayerName } from '@definitions/layers';
import { ZEBKIT_PREFIX } from '@config';
import {
  fromDtcgDocument,
  toDtcgDocuments,
  toStrictDtcgDocument,
  type DroppedToken,
} from './dtcg-document';
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
  /**
   * Also emit spec-only strict-mode token documents + a drop-manifest alongside
   * the full export (decision D9). Only meaningful when `exportFile` is set.
   */
  exportStrict?: boolean;
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
  /**
   * Modules whose CSS custom properties are emitted outside the token converter
   * (the primitive palette rides the generated palette SCSS). They participate
   * in reference validation and exports but must be excluded from CSS var
   * emission, editor override schemas, and `zebkit pull`. Declared via a
   * `cssEmission = "external"` module export / `_cssEmission` snapshot sidecar.
   */
  externalModules: Set<string>;
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
  const externalModules = new Set<string>();
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
      // JSON mode: pre-compiled DTCG documents loaded by the installed CLI. The
      // module key is the filename; layer / cssEmission / scale ride the group
      // `$extensions["dev.zebkit"]` block, and a hoisted group `$type` expands
      // back onto the entries (see fromDtcgDocument).
      if (path.isAbsolute(file) && file.endsWith('.json')) {
        try {
          const data = await fs.readJson(file);
          const tokenKey: string = path.basename(file, '.json');
          const { entries, meta } = fromDtcgDocument(data as Record<string, unknown>);
          tokens[tokenKey] = entries;
          layers[tokenKey] = meta.layer;
          if (meta.cssEmission === 'external') {
            externalModules.add(tokenKey);
          }
          if (meta.groupExtensions) {
            mergeGroupExtensions(tokenKey, meta.groupExtensions, groupExtensions);
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
      // A bespoke `token-schema.ts` is optional (Phase 3 schema consolidation):
      // modules without one validate against the generic DTCG entry-record
      // schema; only modules with structural constraints (breakpoint, type-scale,
      // font-family) keep a hand-written schema.
      const hasBespokeSchema = await fs.pathExists(schemaPath);

      try {
        const tokenModule = await import(pathToFileURL(tokenPath).href);
        const tokenSchema: ZodSchema = hasBespokeSchema
          ? ((await import(pathToFileURL(schemaPath).href))['tokenSchema'] as ZodSchema)
          : tokenModuleSchema;

        const tokensExport = tokenModule.default ?? tokenModule;
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
          if (tokenModule.cssEmission === 'external') {
            externalModules.add(tokenKey);
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
      options.excludedComponents,
      externalModules
    );
  }
  if (customTokenPath) {
    await applyCustomOverrides(
      customTokenPath,
      tokens,
      tokenSchemas,
      groupExtensions,
      overriddenKeys,
      options.excludedComponents,
      externalModules
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
      groupExtensions,
      layers,
      externalModules,
      options.exportStrict ?? false
    );

  return { tokens, layers, overriddenKeys, groupExtensions, externalModules };
}

async function applyCustomOverrides(
  overridePath: string,
  tokens: Record<string, TokenInterface>,
  tokenSchemas: Record<string, ZodSchema>,
  groupExtensions: Record<string, TokenGroupExtensions>,
  touched?: Record<string, Set<string>>,
  excludedComponents?: ReadonlySet<string>,
  externalModules?: ReadonlySet<string>
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
        excludedModuleKeys,
        externalModules
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
            excludedModuleKeys,
            externalModules
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
  excludedModuleKeys: ReadonlySet<string>,
  externalModules?: ReadonlySet<string>
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
  if (externalModules?.has(inferredKey)) {
    throw new Error(
      `Token override file '${path.basename(file)}' targets the primitive palette, ` +
        `whose CSS is generated from its token module — entry-level overrides are not supported. ` +
        `Re-theme primitives at runtime via the --zbk-color-<family>-hue/-saturation custom properties, ` +
        `or change the palette definition in zebkit itself.`
    );
  }
  if (tokens[inferredKey]) {
    // Read the override as a DTCG document: flatten nested groups (joining path
    // segments with `-`), expand a hoisted group `$type` onto its entries, and
    // reject `$ref` / `$extends` (D6) with an actionable error. A group-level
    // `$extensions` block carries scale-control overrides — not token entries —
    // whose names are recorded into `touched` so overlay emission re-emits the
    // modules they shape.
    const { entries, meta } = fromDtcgDocument(data as Record<string, unknown>);
    if (meta.groupExtensions) {
      mergeGroupExtensions(inferredKey, meta.groupExtensions, groupExtensions, touched);
    }
    mergeOverrideObject({ [inferredKey]: entries }, tokens, tokenSchemas, touched);
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
  groupExtensions: Record<string, TokenGroupExtensions> = {},
  layers: Record<string, LayerName> = {},
  externalModules: ReadonlySet<string> = new Set(),
  strict = false
) {
  const writeSpinner = ora('Writing tokens to file(s)...').start();
  const destinationPaths: string[] = [];
  const normalizedFormats = outputFormats.map((format) => format.toLowerCase());
  const resolvedSplitMode = splitMode ?? 'combined';

  // Each module serializes to a DTCG document: a hoisted group `$type` when the
  // module is homogeneous, plus a group-level `$extensions["dev.zebkit"]` block
  // carrying the module's layer, emission mode, and fluid-scale controls.
  const documents = toDtcgDocuments({ tokens, layers, groupExtensions, externalModules });

  try {
    await fs.ensureDir(destinationPath);

    if (resolvedSplitMode === 'per-module') {
      for (const tokenKey of Object.keys(tokens)) {
        for (const format of normalizedFormats) {
          const { filePath, fileContent } = buildFilePayload(
            format,
            path.join(destinationPath, `${tokenKey}.tokens`),
            documents[tokenKey]
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
          documents
        );
        await fs.writeFile(filePath, fileContent);
        destinationPaths.push(filePath);
      }
    }

    if (strict) {
      destinationPaths.push(
        ...(await writeStrictTokenExport(
          documents,
          destinationPath,
          normalizedFormats,
          themeName,
          resolvedSplitMode
        ))
      );
    }

    writeSpinner.succeed(chalk.green('All tokens have been written successfully.'));
    console.log(chalk.green(`Tokens written to: ${destinationPaths.join(', ')}`));
  } catch (error) {
    writeSpinner.fail(chalk.red('Failed to write tokens to file(s).'));
    throw error;
  }
}

/**
 * Strict-mode export (decision D9): alongside the full export, write spec-only
 * DTCG documents — every proprietary-typed token dropped — for tools that
 * hard-fail on an unknown `$type`, plus a `<theme>.drop-manifest.json` recording
 * exactly which tokens were shed per module. Returns the paths written.
 */
async function writeStrictTokenExport(
  documents: Record<string, Record<string, unknown>>,
  destinationPath: string,
  normalizedFormats: string[],
  themeName: string,
  splitMode: 'combined' | 'per-module'
): Promise<string[]> {
  const written: string[] = [];
  const strictDocuments: Record<string, Record<string, unknown>> = {};
  const dropManifest: Record<string, DroppedToken[]> = {};

  for (const [key, doc] of Object.entries(documents)) {
    const { document, dropped } = toStrictDtcgDocument(doc);
    strictDocuments[key] = document;
    if (dropped.length > 0) dropManifest[key] = dropped;
  }

  if (splitMode === 'per-module') {
    for (const key of Object.keys(strictDocuments)) {
      for (const format of normalizedFormats) {
        const { filePath, fileContent } = buildFilePayload(
          format,
          path.join(destinationPath, `${key}.strict.tokens`),
          strictDocuments[key]
        );
        await fs.writeFile(filePath, fileContent);
        written.push(filePath);
      }
    }
  } else {
    for (const format of normalizedFormats) {
      const { filePath, fileContent } = buildFilePayload(
        format,
        path.join(destinationPath, `${themeName}-tokens.strict`),
        strictDocuments
      );
      await fs.writeFile(filePath, fileContent);
      written.push(filePath);
    }
  }

  const manifestPath = path.join(destinationPath, `${themeName}.drop-manifest.json`);
  await fs.writeJson(manifestPath, { theme: themeName, dropped: dropManifest }, { spaces: 2 });
  written.push(manifestPath);
  return written;
}
