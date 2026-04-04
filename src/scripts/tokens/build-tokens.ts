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
import { compileSass, CompileSassOptions } from "@token-scripts/compile-css";
import { loadZebkitConfig, TokensConfig, ZebkitConfig } from "../config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ZEBKIT_PREFIX = "zbk";

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

    const themeAnswers = tokensConfig
      ? {
          theme: tokensConfig.theme ?? "default",
          customTokenPath: tokensConfig.customTokenPath,
          customThemeName: tokensConfig.customThemeName,
        }
      : await inquirer.prompt([
          {
            type: "list",
            name: "theme",
            message: "Select the theme for your tokens:",
            choices: ["default", "quiet-boutique", "dark-boutique", "custom"],
            default: "default",
          },
          {
            type: "input",
            name: "customTokenPath",
            message: "Path to custom token overrides file or folder:",
            when: (answers) => answers.theme === "custom",
            validate: (input) => (input ? true : "Path cannot be empty."),
          },
          {
            type: "input",
            name: "customThemeName",
            message: "Name for your custom theme:",
            when: (answers) => answers.theme === "custom",
            default: "custom",
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

    let customTokenPath: string | undefined;
    let themeName = themeAnswers.theme;

    switch (themeAnswers.theme) {
      case "quiet-boutique":
        customTokenPath = path.resolve(
          __dirname,
          "../../themes/quiet-boutique"
        );
        break;
      case "dark-boutique":
        customTokenPath = path.resolve(__dirname, "../../themes/dark-boutique");
        break;
      case "custom":
        customTokenPath = themeAnswers.customTokenPath;
        themeName = themeAnswers.customThemeName || "custom";
        break;
      default:
        customTokenPath = undefined;
        themeName = "default";
    }

    if (customTokenPath && !(await fs.pathExists(customTokenPath))) {
      console.warn(
        chalk.yellow(
          `Custom token path not found at ${customTokenPath}. Skipping overrides.`
        )
      );
      customTokenPath = undefined;
    }

    const gatherOptions = zebkitPackageRoot
      ? {
          coreDir: path.join(zebkitPackageRoot, "src", "core"),
          componentsDir: path.join(zebkitPackageRoot, "src", "components"),
          tokenDefaultsDir,
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
      { splitMode: resolvedSplitMode },
      exportTokens
    );

    const cssVars = convertTokensToCssVars(tokens, { layers });
    const tokenLookupOutputPath = resolveLookupOutputPath(
      tokensConfig?.tokenLookupOutputPath,
      resolvedDestinationPath
    );

    const {
      registry: variantRegistry,
      inlineCss,
      extraStylesheets,
    } = await buildZebkitVariants(tokens, customTokenPath);
    if (writeVariantRegistry) {
      await writeVariantRegistryFiles(
        variantRegistry,
        resolvedDestinationPath,
        themeName,
        resolvedSplitMode
      );
    }

    const allStylesheets = [...files.stylesheets, ...extraStylesheets];

    const sassOptions: CompileSassOptions = {
      stylesheets: allStylesheets,
      cssVars,
      destination: resolvedDestinationPath,
      projectName: themeName,
      sassVariables: {
        assetFilePath: { value: assetFilePath, modify: true },
        cssVarPrefix: { value: ZEBKIT_PREFIX, modify: false },
      },
      variantCss: inlineCss,
      zebkitPackageRoot,
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
      console.log(chalk.yellow("\nPrompt cancelled by user."));
      process.exit(0);
    } else {
      console.error(chalk.red("An error occurred:"), error);
      process.exit(1);
    }
  }
}

function resolveLookupOutputPath(
  configuredPath: string | undefined,
  destinationPath: string
): string {
  if (configuredPath) {
    return path.isAbsolute(configuredPath)
      ? configuredPath
      : path.resolve(process.cwd(), configuredPath);
  }
  return path.join(destinationPath, "token-lookup.json");
}

function buildTokenLookup(
  tokens: Record<string, TokenInterface>
): Record<string, string> {
  const lookup: Record<string, string> = {};
  const prefix = `${ZEBKIT_PREFIX}-`;

  for (const [tokenKey, tokenProperties] of Object.entries(tokens)) {
    const moduleName = tokenKey.startsWith(prefix)
      ? tokenKey.slice(prefix.length)
      : tokenKey;

    if (!tokenProperties) continue;

    for (const propertyKey of Object.keys(tokenProperties)) {
      const cssVar = `--${[tokenKey, propertyKey].filter(Boolean).join("-")}`;
      const reference = `${moduleName}.${propertyKey}`;
      lookup[reference] = cssVar;
      lookup[`{${reference}}`] = cssVar;
    }
  }

  return lookup;
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

function slugifyFileSegment(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-");
}

