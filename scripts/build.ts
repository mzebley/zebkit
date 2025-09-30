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
import sass from "sass";
import postcss from "postcss";
import autoprefixer from "autoprefixer";
import cssnano from "cssnano";

import * as tokenProcessor from "./tokenProcessor";

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

async function compileSass(
  scssFiles: string[],
  cssOutput: string
): Promise<void> {
  const srcDir = path.join(process.cwd(), "src");
  let result = "";

  for (const file of scssFiles) {
    const compiled = sass.compile(file, {
      loadPaths: [srcDir],
    });
    result += compiled.css;
  }

  const postCssResult = await postcss([autoprefixer(), cssnano()]).process(
    result,
    { from: undefined }
  );
  await fs.writeFile(cssOutput, postCssResult.css);
}

async function generateConfigs(
  selectedComponents: SelectedComponents,
  jsOutput: string
): Promise<[RollupOptions, RollupOptions, string[]]> {
  const srcDir = path.join(process.cwd(), "src");
  const coreDir = path.join(srcDir, "core");
  const componentsDir = path.join(srcDir, "components");

  const toCamelCase = (str: string): string =>
    str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());

  const virtualEntryContent = `
import * as core from '${path.join(coreDir, "index.ts")}';
${selectedComponents
  .map(
    (component) =>
      `import * as ${toCamelCase(component)}Module from '${path.join(
        componentsDir,
        component,
        "index.ts"
      )}';`
  )
  .join("\n")}

export { core };
${selectedComponents
  .map(
    (component) => `
export const ${toCamelCase(component)} = ${toCamelCase(component)}Module;
export * from '${path.join(componentsDir, component, "index.ts")}';
`
  )
  .join("\n")}
`;

  const scssFiles = [
    path.join(coreDir, "styles.scss"),
    ...selectedComponents.map((component) =>
      path.join(componentsDir, component, "styles.scss")
    ),
  ];

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

  return [mainConfig, dtsConfig, scssFiles];
}

async function main(): Promise<void> {
  try {
    log.info("Starting build process...");

    // Gather components
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
      log.info("No components found. Proceeding with core only.");
    }

    // Ask for output paths
    const {
      jsOutput,
      cssOutput,
      customTokensPath,
      generateTemplates,
      templateDirectory,
    } = await inquirer.prompt([
      {
        type: "input",
        name: "jsOutput",
        message: "Enter the path for the JavaScript output file:",
        default: "zebkit.js",
      },
      {
        type: "input",
        name: "cssOutput",
        message: "Enter the path for the CSS output file:",
        default: "zebkit.css",
      },
      {
        // TODO: If file, grab file by name. If folder, grab all JSON files from folder
        type: "input",
        name: "customTokensPath",
        message: "Enter the path to your custom token files (optional):",
        default: "",
      },
      {
        type: "confirm",
        name: "generateTemplates",
        message: "Do you want to generate token templates?",
        default: false,
      },
      {
        type: "input",
        name: "templateDirectory",
        message: "Enter the directory to save token templates:",
        when: (answers) => answers.generateTemplates,
        default: "dist/token-templates",
      },
    ]);

    log.info(`Selected components: ${selectedComponents.join(", ") || "None"}`);
    log.info(`JavaScript output: ${jsOutput}`);
    log.info(`CSS output: ${cssOutput}`);
    if (generateTemplates) {
      log.info(`Token templates will be saved to: ${templateDirectory}`);
    }
    if (customTokensPath) {
      log.info(`Custom tokens path: ${customTokensPath}`);
    }

    // Build the allowed token key map from TypeScript files and generate templates
    const coreDir = path.join(process.cwd(), "src", "core");
    const componentsDir = path.join(process.cwd(), "src", "components");

    const directoriesToScanCandidates = [coreDir, componentsDir];
    const directoriesToScan: string[] = [];
    for (const directory of directoriesToScanCandidates) {
      try {
        await fs.access(directory);
        directoriesToScan.push(directory);
      } catch (error: any) {
        log.warn(
          `Token directory not found, skipping: ${directory} (${error?.message ?? error})`
        );
      }
    }

    const allowedTokenMap = await tokenProcessor.buildAllowedTokenKeyMap(
      directoriesToScan
    );

    const coreTokens = await tokenProcessor.gatherTokens(coreDir); // Default tokens are TypeScript files
    const componentTokens = await tokenProcessor.gatherTokens(componentsDir); // Default tokens are TypeScript files

    // Validate the gathered tokens against the allowed token key map
    await tokenProcessor.validateTokensUsingMap(coreTokens, allowedTokenMap);
    await tokenProcessor.validateTokensUsingMap(
      componentTokens,
      allowedTokenMap
    );

    // Merge core tokens with component tokens (component tokens take precedence)
    let mergedTokens = tokenProcessor.mergeTokens(coreTokens, componentTokens);

    // Optionally generate token templates
    if (generateTemplates) {
      await tokenProcessor.generateTokenTemplates(
        mergedTokens,
        templateDirectory
      );
    }

    const tokenCssOutputPath = path.join(
      path.dirname(cssOutput),
      "zebkit-vars.css"
    );

    // Gather and merge custom tokens if provided
    if (customTokensPath) {
      const customTokens = await tokenProcessor.gatherTokens(
        customTokensPath,
        true
      ); // Custom tokens are JSON files
      await tokenProcessor.validateTokensUsingMap(
        customTokens,
        allowedTokenMap
      );
      mergedTokens = tokenProcessor.mergeTokens(mergedTokens, customTokens);
    }

    // Convert merged tokens to CSS variables
    const tokenCssContent = tokenProcessor.cssVariableConverter(mergedTokens);
    await fs.writeFile(tokenCssOutputPath, tokenCssContent);

    // Generate rollup configs
    const [mainConfig, dtsConfig, scssFiles] = await generateConfigs(
      selectedComponents,
      jsOutput
    );

    log.info("Starting build process...");

    // Run Rollup and compile Sass
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
      compileSass(scssFiles, cssOutput),
    ]);

    log.success("Build completed successfully!");
    log.success(`JavaScript bundle: ${jsOutput}`);
    log.success(`CSS bundle: ${cssOutput}`);
    log.success(`Source map: ${jsOutput}.map`);
    log.success(`TypeScript declarations: ${jsOutput.replace(".js", ".d.ts")}`);
    if (customTokensPath)
      log.success(`Token CSS variables generated: ${tokenCssOutputPath}`);
    if (generateTemplates)
      log.success(`Token template files generated: ${templateDirectory}`);
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
