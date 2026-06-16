#!/usr/bin/env ts-node

import path from "path";
import inquirer from "inquirer";
import chalk from "chalk";
import fs from "fs-extra";
import { fileURLToPath } from "node:url";
import type { Dirent } from "fs";
import { allowedTokenTypes } from "@definitions/tokens";
import type { TokenInterface } from "@definitions/tokens";
import { gatherZebkitFiles } from "@token-scripts/gather-files";
import {
  buildZebkitTokens,
  BuildZebkitTokensOptions,
} from "@token-scripts/compile-tokens";
import {
  buildZebkitVariants,
  VariantRegistry,
} from "@token-scripts/compile-variants";
import { convertTokensToCssVars } from "@token-scripts/token-converter";
import { resolveTypeScale } from "@token-scripts/build-type-scale";
import { resolveSpaceScale } from "@token-scripts/build-space-scale";
import { compileSass, CompileSassOptions } from "@token-scripts/compile-css";
import {
  loadZebkitConfig,
  TokensConfig,
  ZebkitConfig,
} from "../config";
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
  extractReferencedColorFamilies,
  resolveActiveBreakpointMap,
  resolveLookupOutputPath,
  slugifyFileSegment,
} from './build-helpers';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ZEBKIT_PREFIX = "zbk";

const paletteGlobalColors = (selector: string = ":root"): string => `${selector} {
  --zbk-color-global-black: #131313;
  --zbk-color-global-white: #fefefe;
  --zbk-color-global-transparent: transparent;
}`;

export {
  buildEnabledBreakpointsList,
  buildTokenLookup,
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

async function getComponents(componentsDir?: string): Promise<string[]> {
  const dir = componentsDir ?? path.resolve(__dirname, "../../components");
  if (!(await fs.pathExists(dir))) return [];

  const items = await fs.readdir(dir, { withFileTypes: true });
  return items
    .filter((item: Dirent) => item.isDirectory() && !item.name.startsWith("."))
    .map((item: Dirent) => item.name);
}

/**
 * Run the full token build pipeline.
 *
 * @param overrideConfig - Optional config to use instead of loading from disk.
 * @param zebkitPackageRoot - Root of the zebkit package (for installed CLI mode).
 *   When provided, SCSS include paths resolve against this directory.
 * @param tokenDefaultsDir - Directory containing pre-compiled JSON token defaults.
 *   When provided, loads tokens from JSON instead of dynamic TS imports (installed CLI mode).
 */
export async function runTokenBuild(
  overrideConfig?: ZebkitConfig,
  zebkitPackageRoot?: string,
  tokenDefaultsDir?: string
): Promise<void> {
  displayWelcome();

  const loadedConfig = overrideConfig
    ? { config: overrideConfig, path: "(provided)" }
    : await loadZebkitConfig();
  const tokensConfig: TokensConfig | undefined = loadedConfig?.config.tokens;
  if (loadedConfig && loadedConfig.path !== "(provided)") {
    console.log(chalk.green(`Using config from ${loadedConfig.path}`));
  }

  const componentsDir = zebkitPackageRoot
    ? path.join(zebkitPackageRoot, "src", "components")
    : undefined;
  const builtInThemeNames = getThemePromptChoices(
    await getBuiltInThemeNames(zebkitPackageRoot)
  );

  try {
    const components = await getComponents(componentsDir);
    const includeAllComponents = tokensConfig?.includeAllComponents;
    const selectedComponents = includeAllComponents
      ? components
      : tokensConfig?.selectedComponents
      ? tokensConfig.selectedComponents.filter((component) => {
          const exists = components.includes(component);
          if (!exists) {
            console.warn(
              chalk.yellow(
                `Component "${component}" not found. Ignoring this entry from config.`
              )
            );
          }
          return exists;
        })
      : components.length > 0
      ? (
          await inquirer.prompt([
            {
              type: "checkbox",
              name: "selectedComponents",
              message: "Select components to include:",
              choices: components,
            },
          ])
        ).selectedComponents
      : [];

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

    const configuredTheme =
      tokensConfig?.theme === "custom"
        ? DEFAULT_THEME_NAME
        : tokensConfig?.theme ?? DEFAULT_THEME_NAME;

    if (tokensConfig?.theme === "custom") {
      console.warn(
        chalk.yellow(
          'Config value "theme": "custom" is deprecated. Using "default" as the base theme and applying customTokenPath as an override layer.'
        )
      );
    }

    const themeAnswers = tokensConfig
      ? {
          theme: configuredTheme,
          customTokenPath: tokensConfig.customTokenPath,
          customThemeName: tokensConfig.customThemeName,
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
            default: (answers) => answers.theme || DEFAULT_THEME_NAME,
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
      console.warn(
        chalk.yellow(
          `Custom token path not found at ${customTokenPath}. Skipping overrides.`
        )
      );
      customTokenPath = undefined;
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

    const gatherOptions = zebkitPackageRoot
      ? {
          coreDir: path.join(zebkitPackageRoot, "src", "core"),
          componentsDir: path.join(zebkitPackageRoot, "src", "components"),
          tokenDefaultsDir:
            selectedTokenDefaultsDir &&
            (await fs.pathExists(selectedTokenDefaultsDir))
              ? selectedTokenDefaultsDir
              : tokenDefaultsDir,
        }
      : undefined;

    const files = await gatherZebkitFiles(selectedComponents, gatherOptions);

    const resolvedSplitMode =
      splitMode as BuildZebkitTokensOptions["splitMode"];

    const { tokens, layers } = await buildZebkitTokens(
      themeName,
      files.tokenFiles,
      resolvedDestinationPath,
      customTokenPath,
      outputFormats,
      { splitMode: resolvedSplitMode, overridePaths },
      exportTokens
    );

    const rootSelector = tokensConfig?.rootSelector;
    // Resolve the generated font-size and spacing scales (fluid by default; static opt-out)
    // before emitting CSS vars. Operates on copies so exported artifacts keep their
    // authorable form; downstream consumers (variants, color/lookup) use original tokens.
    // Spacing runs first: it reads the shared viewport anchors from the font-size module,
    // which the type-scale pass then strips.
    const useStaticTypeScale =
      tokensConfig?.typeScale?.static === true ||
      tokensConfig?.typeScale?.fluid === false;
    const useStaticSpaceScale =
      tokensConfig?.spaceScale?.static === true ||
      tokensConfig?.spaceScale?.fluid === false;
    let cssVarTokens = resolveSpaceScale(tokens, {
      mode: useStaticSpaceScale ? "static" : "fluid",
    });
    cssVarTokens = resolveTypeScale(cssVarTokens, {
      mode: useStaticTypeScale ? "static" : "fluid",
    });
    // Breakpoints feed the SCSS responsive system at build time; only surface them
    // as `--zbk-breakpoint-*` custom properties when explicitly opted in. Either
    // way, drop disabled (null-valued) entries so they never emit a `null` var.
    const breakpointKey = `${ZEBKIT_PREFIX}-breakpoint`;
    if (cssVarTokens[breakpointKey]) {
      if (tokensConfig?.extendedTokens?.emitBreakpointVars === true) {
        const enabledOnly: TokenInterface = {};
        for (const [name, entry] of Object.entries(cssVarTokens[breakpointKey])) {
          if ((entry as { value?: unknown })?.value != null) enabledOnly[name] = entry;
        }
        cssVarTokens = { ...cssVarTokens, [breakpointKey]: enabledOnly };
      } else {
        cssVarTokens = { ...cssVarTokens };
        delete cssVarTokens[breakpointKey];
      }
    }
    const cssVars = convertTokensToCssVars(cssVarTokens, { layers, selector: rootSelector });
    const tokenLookupOutputPath = resolveLookupOutputPath(
      tokensConfig?.tokenLookupOutputPath,
      resolvedDestinationPath
    );

    const bundledVariantOverridePath =
      zebkitPackageRoot && baseThemeName !== DEFAULT_THEME_NAME
        ? getBundledThemeVariantOverridesDir(zebkitPackageRoot, baseThemeName)
        : undefined;

    const {
      registry: variantRegistry,
      inlineCss,
      extraStylesheets,
    } = await buildZebkitVariants(tokens, [
      ...(bundledVariantOverridePath &&
      (await fs.pathExists(bundledVariantOverridePath))
        ? [bundledVariantOverridePath]
        : []),
      ...overridePaths,
      ...(customTokenPath ? [customTokenPath] : []),
    ]);
    if (writeVariantRegistry) {
      await writeVariantRegistryFiles(
        variantRegistry,
        resolvedDestinationPath,
        themeName,
        resolvedSplitMode
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
            `@use 'core/colors/palette/${family}' as zbk_smart_palette_${i};\n`
        )
        .join("");
      finalVariantCss = `${inlineCss}\n${paletteGlobalColors(rootSelector)}`;
    }

    const activeBreakpoints = resolveActiveBreakpointMap(
      tokens,
      tokensConfig?.extendedTokens?.breakpoints
    );

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
    };

    await compileSass(sassOptions);

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
  } catch (error: any) {
    if (error?.name === "ExitPromptError") {
      console.log(chalk.yellow("\nBuild cancelled."));
      return;
    } else {
      console.error(chalk.red("An error occurred:"), error);
      process.exit(1);
    }
  }
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

async function writeAllowedTokenTypes(
  outputPath: string,
  types: string[]
): Promise<void> {
  try {
    await fs.ensureDir(path.dirname(outputPath));
    await fs.writeJson(outputPath, types, { spaces: 2 });
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
      `zbk-${themeName.toLowerCase()}-variants.json`
    );
    await fs.writeJson(combinedPath, registry, { spaces: 2 });
  }
}
