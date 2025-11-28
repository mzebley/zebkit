import inquirer from "inquirer";
import { rollup, RollupOptions, OutputOptions } from "rollup";
import typescript from "@rollup/plugin-typescript";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import terser from "@rollup/plugin-terser";
import { babel } from "@rollup/plugin-babel";
import dts from "rollup-plugin-dts";
import fs from "fs/promises";
import path from "path";
import chalk from "chalk";
import { pathToFileURL } from "node:url";
import { gatherZebkitFiles } from "@token-scripts/gather-files";
import {
  buildZebkitTokens,
  BuildZebkitTokensOptions,
} from "@token-scripts/compile-tokens";
import type { TokenInterface } from "@definitions/tokens";

const log = {
  info: (msg: string): void => console.log(chalk.blue(msg)),
  success: (msg: string): void => console.log(chalk.green(msg)),
  error: (msg: string): void => console.error(chalk.red(msg)),
  warn: (msg: string): void => console.warn(chalk.yellow(msg)),
  debug: (msg: string): void => console.log(chalk.gray(msg)),
};

// Utility type for component selection
type SelectedComponents = string[];

async function getComponents(): Promise<string[]> {
  const componentsDir = path.join(process.cwd(), "src", "components");
  try {
    const items = await fs.readdir(componentsDir, { withFileTypes: true });
    const components = items
      .filter((item) => item.isDirectory() && !item.name.startsWith("."))
      .map((item) => item.name);
    return components;
  } catch (error) {
    log.warn("No components directory found or error reading it: " + error);
    return [];
  }
}

function extractSettingDefaults(tokens: Record<string, TokenInterface>) {
  const settings: Record<string, Record<string, string | number>> = {};
  for (const [tokenKey, tokenMap] of Object.entries(tokens)) {
    const component = tokenKey.replace(/^zbk-/, "");
    for (const [key, token] of Object.entries(tokenMap)) {
      if (token.type === "setting") {
        if (!settings[component]) settings[component] = {};
        settings[component][key] = token.value;
      }
    }
  }
  return settings;
}

function generateVirtualEntry(
  selectedComponents: SelectedComponents,
  settings: Record<string, Record<string, string | number>>
) {
  const srcDir = path.join(process.cwd(), "src");
  const coreDir = path.join(srcDir, "core");
  const componentsDir = path.join(srcDir, "components");

  const toCamelCase = (str: string): string =>
    str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());

  const toImportSpecifier = (filePath: string): string => {
    const relativePath = path.relative(process.cwd(), filePath).replace(/\\/g, "/");
    return relativePath.startsWith(".") ? relativePath : `./${relativePath}`;
  };

  const componentImports = selectedComponents
    .map((component) => {
      const camel = toCamelCase(component);
      return `import * as ${camel}Module from '${toImportSpecifier(
        path.join(componentsDir, component, "index.ts")
      )}';\n__MODULE_MAP['${component}'] = ${camel}Module;`;
    })
    .join("\n");

  const virtualEntryContent = `
import * as core from '${toImportSpecifier(path.join(coreDir, "index.ts"))}';
const __SETTINGS = ${JSON.stringify(settings, null, 2)};
const __MODULE_MAP = { core };
${componentImports}

function applySettings(target, component) {
  const componentSettings = __SETTINGS[component];
  if (!componentSettings || !target) return;
  Object.values(target).forEach((ctor) => {
    if (ctor && typeof ctor === 'function' && 'defaultOptions' in ctor) {
      const defaults = ctor.defaultOptions || {};
      ctor.defaultOptions = { ...defaults, ...componentSettings };
    }
  });
}

Object.keys(__SETTINGS).forEach((component) => {
  const target = __MODULE_MAP[component] || core;
  applySettings(target, component);
});

export { core };
${selectedComponents
  .map(
    (component) =>
      `export * from '${toImportSpecifier(
        path.join(componentsDir, component, "index.ts")
      )}';`
  )
  .join("\n")}
`;

  return virtualEntryContent;
}

async function generateConfigs(
  selectedComponents: SelectedComponents,
  jsOutput: string,
  settings: Record<string, Record<string, string | number>>
): Promise<[RollupOptions, RollupOptions]> {
  const virtualEntryContent = generateVirtualEntry(selectedComponents, settings);

  const mainConfig: RollupOptions = {
    input: "virtual-entry.js",
    output: {
      file: jsOutput,
      format: "esm",
      sourcemap: true,
    },
    plugins: [
      {
        name: "virtual-entry",
        resolveId(source: string): string | null {
          if (source === "virtual-entry.js") {
            return source;
          }
          return null;
        },
        load(id: string): string | null {
          if (id === "virtual-entry.js") {
            return virtualEntryContent;
          }
          return null;
        },
      },
      resolve({ extensions: [".js", ".ts"] }),
      commonjs(),
      typescript({
        tsconfig: "./tsconfig.json",
        outDir: path.dirname(jsOutput),
      }),
      babel({
        babelHelpers: "bundled",
        presets: [
          [
            "@babel/preset-env",
            {
              useBuiltIns: "usage",
              corejs: 3,
              targets: "> 0.25%, not dead",
            },
          ],
        ],
        exclude: "node_modules/**",
      }),
      terser(),
    ],
  };

  const dtsConfig: RollupOptions = {
    input: "virtual-entry.js",
    output: {
      file: jsOutput.replace(".js", ".d.ts"),
      format: "es",
    },
    plugins: [
      {
        name: "virtual-entry",
        resolveId(source: string): string | null {
          if (source === "virtual-entry.js") {
            return source;
          }
          return null;
        },
        load(id: string): string | null {
          if (id === "virtual-entry.js") {
            return virtualEntryContent;
          }
          return null;
        },
      },
      dts(),
    ],
  };

  return [mainConfig, dtsConfig];
}

async function main(): Promise<void> {
  try {
    log.info("Starting component build process...");

    const components = await getComponents();

    let selectedComponents: SelectedComponents = [];
    if (components.length > 0) {
      const answers = await inquirer.prompt([
        {
          type: "checkbox",
          name: "selectedComponents",
          message: "Select the components you want to include:",
          choices: components,
        },
      ]);
      selectedComponents = answers.selectedComponents;
    } else {
      log.info("No optional components found. Proceeding with core only.");
    }

    let { jsOutput } = await inquirer.prompt([
      {
        type: "input",
        name: "jsOutput",
        message: "Enter the path for the JavaScript output file:",
        default: "zebkit.js",
      },
    ]);

    // Normalize output to a file path
    if (!path.extname(jsOutput)) {
      const normalized = jsOutput.endsWith(path.sep)
        ? jsOutput
        : `${jsOutput}${path.sep}`;
      jsOutput = path.join(normalized, "zebkit.js");
    }

    log.info(`Selected components: ${selectedComponents.join(", ") || "None"}`);
    log.info(`JavaScript output: ${jsOutput}`);

    // Build settings from token files (core + selected components), no token artifacts written
    const files = await gatherZebkitFiles(selectedComponents);
    const { tokens } = await buildZebkitTokens(
      "component-build",
      files.tokenFiles,
      path.dirname(jsOutput),
      undefined,
      [],
      { splitMode: "combined" as BuildZebkitTokensOptions["splitMode"] }
    );
    const settingDefaults = extractSettingDefaults(tokens);

    const [mainConfig, dtsConfig] = await generateConfigs(
      selectedComponents,
      jsOutput,
      settingDefaults
    );

    log.info("Running Rollup...");

    // Run Rollup for JS and DTS
    await Promise.all([
      (async () => {
        const mainBundle = await rollup(mainConfig);
        const output = mainConfig.output as OutputOptions;
        await mainBundle.write(output);
        await mainBundle.close();
      })(),
      (async () => {
        const dtsBundle = await rollup(dtsConfig);
        const output = dtsConfig.output as OutputOptions;
        await dtsBundle.write(output);
        await dtsBundle.close();
      })(),
    ]);

    log.success("Component build completed successfully!");
    log.success(`JavaScript bundle: ${jsOutput}`);
    log.success(`Source map: ${jsOutput}.map`);
    log.success(`TypeScript declarations: ${jsOutput.replace(".js", ".d.ts")}`);
  } catch (error: any) {
    log.error(`Build failed: ${error.message}`);
    if (error.frame) {
      log.error("Error details:");
      log.error(error.frame);
    }
    if (error.stack) {
      log.debug("Stack trace:");
      log.debug(error.stack);
    }
    process.exit(1);
  }
}

main();
