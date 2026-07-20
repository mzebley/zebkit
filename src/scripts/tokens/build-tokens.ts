#!/usr/bin/env ts-node

import path from "path";
import inquirer from "inquirer";
import chalk from "chalk";
import fs from "fs-extra";
import { fileURLToPath } from "node:url";
import type { Dirent } from "fs";
import { allowedTokenTypes } from "@definitions/tokens";
import type { TokenInterface } from "@definitions/tokens";
import { isDtcgSpecType } from "@definitions/dtcg";
import { gatherZebkitFiles } from "@token-scripts/gather-files";
import {
  buildZebkitTokens,
  BuildZebkitTokensOptions,
} from "@token-scripts/compile-tokens";
import {
  buildZebkitVariants,
  VariantRegistry,
  writeVariantScaffolds,
} from "@token-scripts/compile-variants";
import {
  convertTokensToCssVars,
  FontHeadRequirements,
} from "@token-scripts/token-converter";
import { resolveTypeScale } from "@token-scripts/build-type-scale";
import { resolveSpaceScale } from "@token-scripts/build-space-scale";
import {
  compileSass,
  CompileSassOptions,
  CompileSassPruneRequest,
  postProcessCss,
} from "@token-scripts/compile-css";
import {
  DEFAULT_PRUNE_CONTENT,
  DEFAULT_PRUNE_KEEP_LAYERS,
  loadZebkitConfig,
  OverlayThemeConfig,
  PruneConfig,
  resolveOverlayRootSelector,
  TokensConfig,
  validateComponentsConfig,
  validateKnownConfigItems,
  validateOverlays,
  validatePruneConfig,
  ZebkitConfig,
} from "../config";
import {
  ComponentsFilter,
  resolveComponentsFilter,
  warnUnknownComponents,
} from "../components-config";
import { getKnownComponents } from "../known-components";
import { extractZbkTokens, loadComponentTokens, scanContent } from "../prune/content-scan";
import { assembleReport } from "../prune/report";
import type { PruneMode } from "../prune/types";
import {
  DEFAULT_THEME_NAME,
  getBuiltInThemeNames,
  getThemePromptChoices,
  resolveBundledThemeTokensDir,
  getBundledThemeVariantOverridesDir,
  resolveSourceThemeOverridePath,
} from "../theme-presets";
import {
  buildTokenLookup,
  computeEmissionClosure,
  extractReferencedColorFamilies,
  resolveActiveBreakpointMap,
  resolveLookupOutputPath,
  slugifyFileSegment,
} from './build-helpers';
import { PALETTE_GLOBALS } from '../../tokens/colors/palette/tokens/palette-definition';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ZEBKIT_PREFIX = "zbk";

// Smart-mode builds drop `palette/styles.scss` (globals + every family) and
// re-add only the referenced families, so the globals are re-emitted inline
// from the same definition the palette SCSS generates from.
const paletteGlobalColors = (selector: string = ":root"): string => `${selector} {
${PALETTE_GLOBALS.map((global) => `  --zbk-color-${global.name}: ${global.value};`).join("\n")}
}`;

export {
  buildEnabledBreakpointsList,
  buildTokenLookup,
  computeEmissionClosure,
  extractReferencedColorFamilies,
  resolveLookupOutputPath,
  slugifyFileSegment,
} from './build-helpers';

/**
 * Interactive entry point for building Zebkit tokens and CSS.
 * Expects each token folder to export `key` and a default token map alongside a `token-schema.ts`.
 */
function displayWelcome() {
  console.log(chalk.cyan("============================"));
  console.log(chalk.cyan("     Zebkit Token Builder    "));
  console.log(chalk.cyan("============================"));
}

export interface RunTokenBuildOptions {
  /** Config to use instead of loading from disk. */
  overrideConfig?: ZebkitConfig;
  /**
   * Root of the zebkit package (installed CLI mode). When provided, SCSS include
   * paths resolve against this directory.
   */
  zebkitPackageRoot?: string;
  /**
   * Directory containing pre-compiled JSON token defaults. When provided, loads
   * tokens from JSON instead of dynamic TS imports (installed CLI mode).
   */
  tokenDefaultsDir?: string;
  /** Explicit config file path (commander's parsed `--config` value). */
  configPath?: string;
  /** Per-invocation flag overrides layered on top of the loaded config. */
  cliOverrides?: {
    basePreset?: string;
    destinationPath?: string;
    /** `--prune`: force-enable pruning for this build (honors config mode). */
    prune?: boolean;
    /** `--prune-out <path>`: force alongside mode, writing the pruned file here. */
    pruneOut?: string;
  };
}

/**
 * Run the full token build pipeline.
 */
export async function runTokenBuild(
  options: RunTokenBuildOptions = {}
): Promise<void> {
  displayWelcome();
  const buildStart = Date.now();

  try {
    const { overrideConfig, zebkitPackageRoot, tokenDefaultsDir, configPath, cliOverrides } =
      options;
    if (overrideConfig) {
      validateKnownConfigItems(overrideConfig);
      validateOverlays(overrideConfig.tokens?.overlays);
      validatePruneConfig(overrideConfig.tokens?.prune);
    }

    const loadedConfig = overrideConfig
      ? { config: overrideConfig, path: "(provided)" }
      : await loadZebkitConfig(configPath);
    let tokensConfig: TokensConfig | undefined = loadedConfig?.config.tokens;
    if (loadedConfig && loadedConfig.path !== "(provided)") {
      console.log(chalk.green(`Using config from ${loadedConfig.path}`));
    }

    // Declared component intent: excluded components and shipped-variant allowlists.
    // Filters at gather time; prune (evidence-based) runs after and only removes more.
    const componentsConfig = loadedConfig?.config.components;
    validateComponentsConfig(componentsConfig);
    const componentsFilter: ComponentsFilter = resolveComponentsFilter(componentsConfig);
    if (componentsConfig && Object.keys(componentsConfig).length > 0) {
      warnUnknownComponents(componentsConfig, await getKnownComponents(tokenDefaultsDir));
    }

    // Flag overrides (`--theme`, `--dest`) layer on top of the loaded config. When no
    // config exists they establish one, which intentionally skips the interactive
    // prompts for anything they don't cover (defaults apply).
    if (cliOverrides?.basePreset || cliOverrides?.destinationPath) {
      tokensConfig = {
        ...(tokensConfig ?? {}),
        ...(cliOverrides.basePreset ? { basePreset: cliOverrides.basePreset } : {}),
        ...(cliOverrides.destinationPath
          ? { destinationPath: cliOverrides.destinationPath }
          : {}),
      };
    }

    const builtInThemeNames = getThemePromptChoices(
      await getBuiltInThemeNames(zebkitPackageRoot)
    );

    const { destinationPath, assetFilePath } = tokensConfig
      ? {
          destinationPath: tokensConfig.destinationPath ?? "./dist",
          assetFilePath: tokensConfig.assetFilePath ?? "/assets/",
        }
      : await inquirer.prompt([
          {
            type: "input",
            name: "destinationPath",
            message: "Destination directory for exported files:",
            default: "./dist",
          },
          {
            type: "input",
            name: "assetFilePath",
            message:
              "Path to your project assets (used for compiled CSS asset URLs):",
            default: "/assets/",
          },
        ]);

    const resolvedDestinationPath = path.isAbsolute(destinationPath)
      ? destinationPath
      : path.resolve(process.cwd(), destinationPath);

    const configuredTheme = tokensConfig?.basePreset ?? DEFAULT_THEME_NAME;

    const themeAnswers = tokensConfig
      ? {
          theme: configuredTheme,
          customTokenPath: tokensConfig.tokenPath,
          customThemeName: tokensConfig.themeName,
        }
      : await inquirer.prompt([
          {
            type: "list",
            name: "theme",
            message: "Select the base theme for your tokens:",
            choices: builtInThemeNames,
            default: DEFAULT_THEME_NAME,
          },
          {
            type: "input",
            name: "customTokenPath",
            message:
              "Optional path to custom token overrides file or folder (leave blank to skip):",
          },
          {
            type: "input",
            name: "customThemeName",
            message: "Output theme name:",
            default: (answers: { theme?: string }) =>
              answers.theme || DEFAULT_THEME_NAME,
          },
        ]);

    const { exportTokens } = tokensConfig
      ? { exportTokens: tokensConfig.exportTokens ?? false }
      : await inquirer.prompt([
          {
            type: "confirm",
            name: "exportTokens",
            message: "Export token artifacts (JSON/TS/JS)?",
            default: false,
          },
        ]);

    let splitMode: BuildZebkitTokensOptions["splitMode"] = "combined";
    let outputFormats: string[] = [];
    let writeAllowedTokenTypesFlag: boolean =
      tokensConfig?.writeAllowedTokenTypes ?? false;
    let writeTokenLookupFlag: boolean = tokensConfig?.writeTokenLookup ?? false;

    if (exportTokens) {
      if (tokensConfig?.splitMode && tokensConfig?.outputFormats?.length) {
        splitMode = tokensConfig.splitMode;
        outputFormats = tokensConfig.outputFormats;
      } else {
        const tokenExportAnswers = await inquirer.prompt([
          {
            type: "list",
            name: "splitMode",
            message: "Choose file splitting mode:",
            choices: [
              { name: "combined (one file per format)", value: "combined" },
              {
                name: "per-module (one file per token module)",
                value: "per-module",
              },
            ],
            default: "combined",
          },
          {
            type: "checkbox",
            name: "outputFormats",
            message: "Select output format(s):",
            choices: [
              { name: "JSON", value: "JSON", checked: true },
              { name: "TypeScript", value: "TypeScript" },
              { name: "JavaScript", value: "JavaScript" },
            ],
            validate: (input) =>
              input.length > 0 ? true : "You must select at least one format.",
          },
          {
            type: "confirm",
            name: "writeTokenLookup",
            message: "Export token alias lookup JSON file?",
            default: false,
          },
          {
            type: "confirm",
            name: "writeAllowedTokenTypes",
            message: "Export allowed token types JSON file?",
            default: false,
          },
        ]);
        splitMode = tokenExportAnswers.splitMode;
        outputFormats = tokenExportAnswers.outputFormats;
        writeAllowedTokenTypesFlag = tokenExportAnswers.writeAllowedTokenTypes;
        writeTokenLookupFlag = tokenExportAnswers.writeTokenLookup;
      }
    }

    const writeVariantRegistry = exportTokens
      ? tokensConfig?.writeVariantRegistry ??
        (
          await inquirer.prompt([
            {
              type: "confirm",
              name: "writeVariantRegistry",
              message: "Write variant registry JSON output?",
              default: false,
            },
          ])
        ).writeVariantRegistry
      : false;

    const baseThemeName = builtInThemeNames.includes(themeAnswers.theme)
      ? themeAnswers.theme
      : DEFAULT_THEME_NAME;
    const themeName = themeAnswers.customThemeName || baseThemeName;
    let customTokenPath = themeAnswers.customTokenPath?.trim() || undefined;
    const overridePaths: string[] = [];

    if (!builtInThemeNames.includes(themeAnswers.theme)) {
      console.warn(
        chalk.yellow(
          `Unknown theme "${themeAnswers.theme}". Falling back to ${DEFAULT_THEME_NAME}.`
        )
      );
    }

    if (!zebkitPackageRoot) {
      const sourceThemeOverridePath = resolveSourceThemeOverridePath(baseThemeName);
      if (sourceThemeOverridePath) {
        overridePaths.push(sourceThemeOverridePath);
      }
    }

    if (customTokenPath && !(await fs.pathExists(customTokenPath))) {
      // Building without the overrides the user asked for would silently emit
      // the base theme — fail loudly instead.
      throw new Error(`Custom token path not found at ${customTokenPath}.`);
    }

    const selectedTokenDefaultsDir =
      zebkitPackageRoot && tokenDefaultsDir
        ? resolveBundledThemeTokensDir(
            baseThemeName,
            tokenDefaultsDir,
            zebkitPackageRoot
          )
        : undefined;

    if (
      selectedTokenDefaultsDir &&
      !(await fs.pathExists(selectedTokenDefaultsDir))
    ) {
      console.warn(
        chalk.yellow(
          `Bundled base theme "${baseThemeName}" was not found at ${selectedTokenDefaultsDir}. Falling back to ${tokenDefaultsDir}.`
        )
      );
    }

    const gatherOptions = {
      ...(zebkitPackageRoot
        ? {
            tokensDir: path.join(zebkitPackageRoot, "src", "tokens"),
            componentsDir: path.join(zebkitPackageRoot, "src", "components"),
            tokenDefaultsDir:
              selectedTokenDefaultsDir &&
              (await fs.pathExists(selectedTokenDefaultsDir))
                ? selectedTokenDefaultsDir
                : tokenDefaultsDir,
          }
        : {}),
      excludedComponents: componentsFilter.excluded,
    };

    const files = await gatherZebkitFiles(gatherOptions);

    const resolvedSplitMode =
      splitMode as BuildZebkitTokensOptions["splitMode"];

    const { tokens, layers, groupExtensions, externalModules } = await buildZebkitTokens(
      themeName,
      files.tokenFiles,
      resolvedDestinationPath,
      customTokenPath,
      outputFormats,
      {
        splitMode: resolvedSplitMode,
        overridePaths,
        excludedComponents: componentsFilter.excluded,
        exportStrict: tokensConfig?.exportStrict ?? false,
      },
      exportTokens
    );

    // The base theme always emits at `:root`; overlays (built later) carry their own
    // scoped selectors.
    // Resolve the generated font-size and spacing scales (fluid by default; static opt-out)
    // before emitting CSS vars. Operates on copies so exported artifacts keep their
    // authorable form; downstream consumers (variants, color/lookup) use original tokens.
    // Both read their controls from the group-level `$extensions` metadata.
    const useStaticTypeScale =
      tokensConfig?.typeScale?.static === true ||
      tokensConfig?.typeScale?.fluid === false;
    const useStaticSpaceScale =
      tokensConfig?.spaceScale?.static === true ||
      tokensConfig?.spaceScale?.fluid === false;
    let cssVarTokens = resolveSpaceScale(tokens, {
      mode: useStaticSpaceScale ? "static" : "fluid",
      groupExtensions,
    });
    cssVarTokens = resolveTypeScale(cssVarTokens, {
      mode: useStaticTypeScale ? "static" : "fluid",
      groupExtensions,
    });
    // Breakpoints feed the SCSS responsive system at build time; only surface them
    // as `--zbk-breakpoint-*` custom properties when explicitly opted in. Either
    // way, drop disabled (null-valued) entries so they never emit a `null` var.
    const breakpointKey = `${ZEBKIT_PREFIX}-breakpoint`;
    if (cssVarTokens[breakpointKey]) {
      if (tokensConfig?.extendedTokens?.emitBreakpointVars === true) {
        const enabledOnly: TokenInterface = {};
        for (const [name, entry] of Object.entries(cssVarTokens[breakpointKey])) {
          if ((entry as { $value?: unknown })?.$value != null) enabledOnly[name] = entry;
        }
        cssVarTokens = { ...cssVarTokens, [breakpointKey]: enabledOnly };
      } else {
        cssVarTokens = { ...cssVarTokens };
        delete cssVarTokens[breakpointKey];
      }
    }
    const fontStrategy = tokensConfig?.fonts?.strategy ?? "import";
    // Emission-external modules (the primitive palette) stay in the reference
    // map so `{color.*}` targets validate, but their CSS rides the generated
    // palette SCSS — never the converter.
    const referenceTokens = cssVarTokens;
    if (externalModules.size > 0) {
      cssVarTokens = { ...cssVarTokens };
      for (const externalKey of externalModules) delete cssVarTokens[externalKey];
    }
    const {
      css: cssVars,
      fontHead,
      errors: conversionErrors,
    } = convertTokensToCssVars(cssVarTokens, {
      layers,
      fontStrategy,
      assetFilePath,
      referenceTokens,
    });
    failOnConversionErrors(conversionErrors);
    const tokenLookupOutputPath = resolveLookupOutputPath(
      tokensConfig?.tokenLookupOutputPath,
      resolvedDestinationPath
    );

    const bundledVariantOverridePath =
      zebkitPackageRoot && baseThemeName !== DEFAULT_THEME_NAME
        ? getBundledThemeVariantOverridesDir(zebkitPackageRoot, baseThemeName)
        : undefined;

    // Installed CLI mode: built-in variants come from the JSON snapshot written by
    // build:defaults (the TS variant modules don't ship with the package).
    let variantSnapshotPath: string | undefined;
    if (zebkitPackageRoot && tokenDefaultsDir) {
      const candidate = path.join(tokenDefaultsDir, "variants.json");
      if (await fs.pathExists(candidate)) {
        variantSnapshotPath = candidate;
      } else {
        console.warn(
          chalk.yellow(
            `Built-in variant snapshot not found at ${candidate}; built-in variants will be missing. ` +
              `Re-run \`npm run build:defaults\` in the zebkit package.`
          )
        );
      }
    }

    const {
      registry: variantRegistry,
      inlineCss,
      extraStylesheets,
    } = await buildZebkitVariants(
      tokens,
      [
        ...(bundledVariantOverridePath &&
        (await fs.pathExists(bundledVariantOverridePath))
          ? [bundledVariantOverridePath]
          : []),
        ...overridePaths,
        ...(customTokenPath ? [customTokenPath] : []),
      ],
      {
        snapshotPath: variantSnapshotPath,
        packageRoot: zebkitPackageRoot,
        componentsFilter,
      }
    );
    if (writeVariantRegistry) {
      await writeVariantRegistryFiles(
        variantRegistry,
        resolvedDestinationPath,
        themeName,
        resolvedSplitMode
      );
    }

    // Editable variant definitions ride along with the token exports — same
    // splitMode/format knobs, authorable shape (round-trips as override input).
    if (exportTokens) {
      await writeVariantScaffolds(
        variantRegistry,
        resolvedDestinationPath,
        outputFormats,
        themeName,
        resolvedSplitMode ?? "combined"
      );
    }

    let allStylesheets = [...files.stylesheets, ...extraStylesheets];

    // Smart color filtering: only include palette families referenced in the token chain.
    let additionalModuleUses = "";
    let finalVariantCss = inlineCss;
    if (tokensConfig?.extendedTokens?.colors === "smart") {
      const referencedFamilies = extractReferencedColorFamilies(tokens);
      allStylesheets = allStylesheets.filter((sheet) => {
        const isPaletteEntry =
          sheet.includes("colors/palette/styles.scss") ||
          sheet.includes("colors\\palette\\styles.scss");
        return !isPaletteEntry;
      });
      additionalModuleUses = [...referencedFamilies]
        .sort()
        .map(
          (family, i) =>
            `@use 'tokens/colors/palette/${family}' as zbk_smart_palette_${i};\n`
        )
        .join("");
      finalVariantCss = `${inlineCss}\n${paletteGlobalColors()}`;
    }

    const activeBreakpoints = resolveActiveBreakpointMap(
      tokens,
      tokensConfig?.extendedTokens?.breakpoints
    );

    const minify = tokensConfig?.minify !== false;

    const configDir =
      loadedConfig && loadedConfig.path !== "(provided)"
        ? path.dirname(loadedConfig.path)
        : process.cwd();
    const resolvedPrune = await resolvePruneRequest({
      pruneConfig: tokensConfig?.prune,
      cliPrune: cliOverrides?.prune,
      cliPruneOut: cliOverrides?.pruneOut,
      destination: resolvedDestinationPath,
      themeName,
      minify,
      configDir,
      packageRoot: zebkitPackageRoot ?? path.resolve(__dirname, "../../.."),
    });

    // Compute overlays BEFORE the base compile. Overlays redeclare tokens scoped
    // under `[data-zbk-theme]` and reference base `:root` tokens the base theme may
    // never use — so the base prune must seed reachability from them, or it drops
    // tokens the overlays depend on. (Computed here, written after the base.)
    const overlays = tokensConfig?.overlays ?? [];
    const overlayOutputs: OverlayOutput[] = [];
    if (overlays.length > 0) {
      const overlayContextPaths = [
        ...overridePaths,
        ...(customTokenPath ? [customTokenPath] : []),
      ];
      for (const overlay of overlays) {
        const output = await computeOverlayCss(overlay, {
          baseTokenFiles: files.tokenFiles,
          contextOverridePaths: overlayContextPaths,
          parentDestination: resolvedDestinationPath,
          parentFontStrategy: fontStrategy,
          assetFilePath,
          useStaticTypeScale,
          useStaticSpaceScale,
          minify,
          excludedComponents: componentsFilter.excluded,
        });
        if (output) overlayOutputs.push(output);
      }
    }

    if (resolvedPrune) {
      const roots = new Set(resolvedPrune.request.engineOptions.tokenRoots);
      for (const output of overlayOutputs) {
        for (const token of extractZbkTokens(output.css)) roots.add(token);
      }
      resolvedPrune.request.engineOptions.tokenRoots = roots;
    }

    const sassOptions: CompileSassOptions = {
      stylesheets: allStylesheets,
      cssVars,
      destination: resolvedDestinationPath,
      projectName: themeName,
      sassVariables: {
        assetFilePath: { value: assetFilePath, modify: true },
        cssVarPrefix: { value: ZEBKIT_PREFIX, modify: false },
      },
      variantCss: finalVariantCss,
      zebkitPackageRoot,
      activeBreakpoints,
      additionalModuleUses,
      minify,
      prune: resolvedPrune?.request,
    };

    const compileResult = await compileSass(sassOptions);

    if (resolvedPrune && compileResult.prune) {
      await writePruneReport(
        compileResult.prune,
        resolvedPrune,
        readZebkitVersion(zebkitPackageRoot)
      );
    }

    // For non-import strategies, write the sidecar `<head>` snippet (preconnect + stylesheet/
    // preload tags) the consumer pastes into their document head.
    if (
      (fontStrategy === "link" || fontStrategy === "preload") &&
      (fontHead.stylesheets.length > 0 || fontHead.preloads.length > 0)
    ) {
      const snippetPath = path.join(
        resolvedDestinationPath,
        `zbk-${slugifyFileSegment(themeName)}.fonts.html`
      );
      await fs.writeFile(snippetPath, buildFontHeadHtml(fontHead));
      console.log(chalk.green(`Font head snippet written to ${snippetPath}`));
    }

    if (writeTokenLookupFlag) {
      const lookupMap = buildTokenLookup(tokens);
      await writeTokenLookupFile(tokenLookupOutputPath, lookupMap);
    }

    if (writeAllowedTokenTypesFlag) {
      const allowedTypesPath = path.join(
        resolvedDestinationPath,
        "allowed-token-types.json"
      );
      await writeAllowedTokenTypes(allowedTypesPath, [
        ...allowedTokenTypes.options,
      ]);
    }

    // Write the overlays computed before the base compile. Each is a minimal,
    // selector-scoped stylesheet redeclaring only the tokens its `tokenPath`
    // overrides — no palettes, utilities, reset, or variants (those exist globally
    // from the base CSS above).
    for (const output of overlayOutputs) {
      await writeOverlayOutput(output);
    }

    console.log(
      chalk.cyan(`\nBuild complete in ${((Date.now() - buildStart) / 1000).toFixed(1)}s.`)
    );
  } catch (error: any) {
    if (error?.name === "ExitPromptError") {
      console.log(chalk.yellow("\nBuild cancelled."));
      return;
    }
    // Print here (closest to the failure), then rethrow so callers — the CLI
    // and the npm script entry — exit non-zero instead of shipping a bad build.
    console.error(chalk.red("Build failed:"), error instanceof Error ? error.message : error);
    throw error;
  }
}

interface ResolvedPrune {
  request: CompileSassPruneRequest;
  contentFiles: number;
  candidateCount: number;
  safelistEntries: number;
  reportEnabled: boolean;
}

/**
 * Resolves whether/how to prune this build and scans project content for the
 * candidate set. Returns undefined when pruning isn't enabled (config or flag).
 * `--prune-out` forces alongside mode; otherwise the config mode wins (build
 * default: replace, the production disposition).
 */
async function resolvePruneRequest(params: {
  pruneConfig: PruneConfig | undefined;
  cliPrune?: boolean;
  cliPruneOut?: string;
  destination: string;
  themeName: string;
  minify: boolean;
  configDir: string;
  packageRoot: string;
}): Promise<ResolvedPrune | undefined> {
  const {
    pruneConfig,
    cliPrune,
    cliPruneOut,
    destination,
    themeName,
    minify,
    configDir,
    packageRoot,
  } = params;
  const enabled = cliPruneOut != null || cliPrune === true || pruneConfig?.enabled === true;
  if (!enabled) return undefined;

  const cfg = pruneConfig ?? {};
  const mode: PruneMode = cliPruneOut != null ? "alongside" : cfg.output?.mode ?? "replace";

  let outPath: string | undefined;
  if (mode === "alongside") {
    const raw = cliPruneOut ?? cfg.output?.path?.trim();
    if (raw) {
      outPath = path.isAbsolute(raw) ? raw : path.resolve(process.cwd(), raw);
    }
  }

  const contentGlobs =
    cfg.content && cfg.content.length > 0 ? cfg.content : DEFAULT_PRUNE_CONTENT;
  const inputCssPath = path.join(
    destination,
    `zbk-${slugifyFileSegment(themeName)}${minify ? ".min" : ""}.css`
  );
  const componentTokens = await loadComponentTokens(packageRoot);
  const scan = await scanContent({
    contentGlobs,
    cwd: configDir,
    inputCssPath,
    componentTokens,
  });
  const safelist = cfg.safelist ?? [];

  return {
    request: {
      mode,
      outPath,
      engineOptions: {
        candidates: scan.candidates,
        tokenRoots: scan.tokenRoots,
        safelist,
        blocklist: cfg.blocklist ?? [],
        tokens: cfg.tokens !== false,
        keepLayers: cfg.keepLayers ?? DEFAULT_PRUNE_KEEP_LAYERS,
      },
    },
    contentFiles: scan.files,
    candidateCount: scan.candidates.size,
    safelistEntries: safelist.length,
    reportEnabled: cfg.report !== false,
  };
}

/** Shapes and (unless disabled) writes the prune report next to the pruned CSS. */
async function writePruneReport(
  outcome: NonNullable<Awaited<ReturnType<typeof compileSass>>["prune"]>,
  resolved: ResolvedPrune,
  zebkitVersion: string
): Promise<void> {
  const report = assembleReport(outcome.engineResult, {
    zebkitVersion,
    inputPath: outcome.outputPath,
    inputCss: outcome.canonicalCss,
    outputPath: outcome.outputPath,
    outputCss: outcome.prunedCss,
    mode: outcome.mode,
    contentFiles: resolved.contentFiles,
    candidateCount: resolved.candidateCount,
    safelistEntries: resolved.safelistEntries,
  });

  if (report.warnings.length > 0) {
    console.log(
      chalk.yellow(
        `Prune kept ${report.warnings.length} selector(s) on unsupported attribute operators (see report).`
      )
    );
  }

  if (!resolved.reportEnabled) return;
  const reportPath = outcome.outputPath.replace(/(\.min)?\.css$/, ".prune-report.json");
  await fs.writeJson(reportPath, report, { spaces: 2 });
  console.log(chalk.green(`Prune report written to ${reportPath}`));
}

function readZebkitVersion(packageRoot?: string): string {
  try {
    const root = packageRoot ?? path.resolve(__dirname, "../../..");
    const pkg = fs.readJsonSync(path.join(root, "package.json"));
    return typeof pkg.version === "string" ? pkg.version : "0.0.0";
  } catch {
    return "0.0.0";
  }
}

/** Throws when token→CSS conversion produced invalid values (never ship `undefined`). */
function failOnConversionErrors(errors: string[]): void {
  if (errors.length === 0) return;
  throw new Error(
    `Token conversion failed with ${errors.length} error(s):\n${errors
      .map((e) => `  - ${e}`)
      .join("\n")}`
  );
}

interface BuildOverlayCssOptions {
  /** Base theme token module files (shared across base + every overlay). */
  baseTokenFiles: string[];
  /** Untracked base-context overrides (source theme overrides + base `tokenPath`). */
  contextOverridePaths: string[];
  /** Base theme destination; used when the overlay omits its own `destinationPath`. */
  parentDestination: string;
  /** Base theme font strategy; used when the overlay omits its own `fonts.strategy`. */
  parentFontStrategy: NonNullable<TokensConfig["fonts"]>["strategy"];
  assetFilePath: string;
  useStaticTypeScale: boolean;
  useStaticSpaceScale: boolean;
  /** Minify the overlay stylesheet (follows the base theme's `tokens.minify`). */
  minify: boolean;
  /** Components excluded by the components config; overlay overrides targeting them warn. */
  excludedComponents?: ReadonlySet<string>;
}

/** A computed overlay stylesheet, ready to write. */
interface OverlayOutput {
  themeName: string;
  outFile: string;
  /** Post-processed CSS. Scanned for `--zbk-*` to seed the base prune's token roots. */
  css: string;
  fontSnippet?: { path: string; html: string };
}

/**
 * Computes one scoped overlay theme stylesheet WITHOUT writing it. Merges the overlay's
 * `tokenPath` on top of the full base context (so fluid scales and `var()` references
 * resolve), then emits ONLY the tokens the overlay changed, scoped under its selector.
 * Returns null when the overlay emits nothing. Kept separate from writing so the base
 * `:root` prune can seed reachability from the tokens overlays reference.
 */
async function computeOverlayCss(
  overlay: OverlayThemeConfig,
  options: BuildOverlayCssOptions
): Promise<OverlayOutput | null> {
  const selector = resolveOverlayRootSelector(overlay);
  console.log(
    chalk.cyan(`Building overlay theme "${overlay.themeName}" → ${selector}`)
  );

  if (!(await fs.pathExists(overlay.tokenPath))) {
    // Overlays are explicitly configured; a missing tokenPath means the theme
    // the user asked for would silently not ship.
    throw new Error(
      `Overlay "${overlay.themeName}": tokenPath not found at ${overlay.tokenPath}.`
    );
  }

  const destination = overlay.destinationPath
    ? path.isAbsolute(overlay.destinationPath)
      ? overlay.destinationPath
      : path.resolve(process.cwd(), overlay.destinationPath)
    : options.parentDestination;

  // Merge base context + overlay overrides. `overriddenKeys` reflects only the overlay's
  // tokenPath (context paths are applied untracked inside buildZebkitTokens).
  const { tokens, layers, overriddenKeys, groupExtensions, externalModules } =
    await buildZebkitTokens(
      overlay.themeName,
      options.baseTokenFiles,
      destination,
      overlay.tokenPath,
      [],
      {
        splitMode: "combined",
        overridePaths: options.contextOverridePaths,
        excludedComponents: options.excludedComponents,
      },
      false
    );

  if (Object.keys(overriddenKeys).length === 0) {
    console.warn(
      chalk.yellow(
        `Overlay "${overlay.themeName}": no tokens were overridden. Nothing to emit.`
      )
    );
    return null;
  }

  // Resolve scales on the full merged map (anchors present) before filtering.
  let scaled = resolveSpaceScale(tokens, {
    mode: options.useStaticSpaceScale ? "static" : "fluid",
    groupExtensions,
  });
  scaled = resolveTypeScale(scaled, {
    mode: options.useStaticTypeScale ? "static" : "fluid",
    groupExtensions,
  });

  // Emit the transitive closure of the overridden tokens, not just the leaves. A CSS custom
  // property inherits its already-substituted value, so an alias declared at :root
  // (e.g. `--zbk-font-family-heading: var(--zbk-font-family-alt)`) is locked to the base value
  // and will NOT pick up an overlay that only redeclares the leaf (`--zbk-font-family-alt`).
  // Re-emitting every token that (transitively) references an overridden one — scoped under the
  // overlay selector — makes the whole chain re-resolve in-scope. Still per-entry minimal.
  const closure = computeEmissionClosure(scaled, overriddenKeys);
  const emitted: Record<string, TokenInterface> = {};
  for (const [moduleKey, resolvedModule] of Object.entries(scaled)) {
    // Palette entries can never be closure seeds (their overrides are rejected)
    // and carry no references, but keep emission-external modules out of
    // overlays defensively — their CSS only ever comes from the palette SCSS.
    if (externalModules.has(moduleKey)) continue;
    const picked: TokenInterface = {};
    for (const [entry, value] of Object.entries(resolvedModule)) {
      if (closure.has(`${moduleKey}.${entry}`)) picked[entry] = value;
    }
    if (Object.keys(picked).length > 0) emitted[moduleKey] = picked;
  }

  if (Object.keys(emitted).length === 0) {
    console.warn(
      chalk.yellow(
        `Overlay "${overlay.themeName}": overridden tokens did not survive scale resolution. Nothing to emit.`
      )
    );
    return null;
  }

  const fontStrategy = overlay.fonts?.strategy ?? options.parentFontStrategy;
  const { css, fontHead, errors: overlayConversionErrors } = convertTokensToCssVars(emitted, {
    layers,
    selector,
    fontStrategy,
    assetFilePath: options.assetFilePath,
    // Emit only the changed subset, but resolve `{x.y}` references against the full theme.
    referenceTokens: scaled,
  });
  failOnConversionErrors(overlayConversionErrors);

  // Overlays get the same postcss pass as the base bundle (autoprefixer +
  // optional cssnano) but keep the `zbk-<name>.css` filename either way — the
  // overlay link href shouldn't change with the minify setting.
  const processed = await postProcessCss(css, options.minify);
  const outFile = path.join(destination, `zbk-${slugifyFileSegment(overlay.themeName)}.css`);

  const emitsFontSnippet =
    (fontStrategy === "link" || fontStrategy === "preload") &&
    (fontHead.stylesheets.length > 0 || fontHead.preloads.length > 0);

  return {
    themeName: overlay.themeName,
    outFile,
    css: processed,
    fontSnippet: emitsFontSnippet
      ? {
          path: path.join(destination, `zbk-${slugifyFileSegment(overlay.themeName)}.fonts.html`),
          html: buildFontHeadHtml(fontHead),
        }
      : undefined,
  };
}

/** Writes a computed overlay stylesheet (and its optional font-head snippet). */
async function writeOverlayOutput(output: OverlayOutput): Promise<void> {
  await fs.ensureDir(path.dirname(output.outFile));
  await fs.writeFile(output.outFile, output.css);
  console.log(chalk.green(`Overlay "${output.themeName}" written to ${output.outFile}`));
  if (output.fontSnippet) {
    await fs.writeFile(output.fontSnippet.path, output.fontSnippet.html);
    console.log(chalk.green(`Overlay font head snippet written to ${output.fontSnippet.path}`));
  }
}

/**
 * Builds the sidecar `<head>` HTML snippet for `link`/`preload` font strategies. Google's
 * gstatic preconnect requires `crossorigin`; preloads precede the stylesheet links.
 */
function buildFontHeadHtml(fontHead: FontHeadRequirements): string {
  const lines: string[] = [
    "<!-- Zebkit font tags. Paste into your document <head>, before your stylesheet. -->",
  ];
  for (const origin of fontHead.preconnect) {
    const crossorigin = origin.includes("gstatic") ? " crossorigin" : "";
    lines.push(`<link rel="preconnect" href="${origin}"${crossorigin}>`);
  }
  for (const href of fontHead.preloads) {
    lines.push(`<link rel="preload" as="style" href="${href}">`);
  }
  for (const href of fontHead.stylesheets) {
    lines.push(`<link rel="stylesheet" href="${href}">`);
  }
  return `${lines.join("\n")}\n`;
}

async function writeTokenLookupFile(
  outputPath: string,
  lookup: Record<string, string>
): Promise<void> {
  try {
    await fs.ensureDir(path.dirname(outputPath));
    await fs.writeJson(outputPath, lookup, { spaces: 2 });
    console.log(chalk.green(`Token lookup written to ${outputPath}`));
  } catch (error) {
    console.error(chalk.red("Failed to write token lookup map."), error);
    throw error;
  }
}

/**
 * Write the allowed `$type` vocabulary with spec/proprietary provenance marked
 * (plan decision D4/Phase 4): `spec` are DTCG 2025.10 types every conformant
 * tool understands; `proprietary` are zebkit's registry (`cssDimension`,
 * `display`, …) that a strict-mode export drops. Consumers that hard-fail on
 * unknown types read `spec`; the split is derived from the enum via
 * `isDtcgSpecType`, so it can never drift from what the build emits.
 */
async function writeAllowedTokenTypes(
  outputPath: string,
  types: string[]
): Promise<void> {
  try {
    await fs.ensureDir(path.dirname(outputPath));
    const provenance = {
      spec: types.filter((type) => isDtcgSpecType(type)),
      proprietary: types.filter((type) => !isDtcgSpecType(type)),
    };
    await fs.writeJson(outputPath, provenance, { spaces: 2 });
    console.log(chalk.green(`Allowed token types written to ${outputPath}`));
  } catch (error) {
    console.error(chalk.red("Failed to write allowed token types."), error);
    throw error;
  }
}

async function writeVariantRegistryFiles(
  registry: VariantRegistry,
  destinationPath: string,
  themeName: string,
  splitMode: BuildZebkitTokensOptions["splitMode"]
): Promise<void> {
  await fs.ensureDir(destinationPath);

  if (splitMode === "per-module") {
    for (const [component, variants] of Object.entries(registry)) {
      for (const [variantName, entry] of Object.entries(variants)) {
        const componentSlug = slugifyFileSegment(component);
        const variantSlug = slugifyFileSegment(variantName);
        const fileName = `${ZEBKIT_PREFIX}-${componentSlug}.variant.${variantSlug}.json`;
        const filePath = path.join(destinationPath, fileName);
        await fs.writeJson(filePath, entry, { spaces: 2 });
      }
    }
  } else {
    const combinedPath = path.join(
      destinationPath,
      `zbk-${slugifyFileSegment(themeName)}-variants.json`
    );
    await fs.writeJson(combinedPath, registry, { spaces: 2 });
  }
}
