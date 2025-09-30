// tokenProcessor.ts

import fs from "fs/promises";
import path from "path";

interface TokenValue {
  value: string;
  type: string;
  desc?: string;
  weights?: string;
  variableFont?: string
}

interface TokenStyles {
  [key: string]: TokenValue;
}

interface TokenObject {
  [component: string]: {
    styles: TokenStyles;
  };
}

interface AllowedTokenKeys {
  rootAllowedKeys: string[]; // For root-level keys like "iconPosition" and "styles"
  styles?: {
    allowed: string[]; // List of allowed keys within "styles"
    subsets: {
      [key: string]: {
        type: string; // Required type for each key in styles
      };
    };
  };
}

// Function to build a map from all token-keys.ts files in the components and core directories
export async function buildAllowedTokenKeyMap(
  directories: string[]
): Promise<Record<string, AllowedTokenKeys>> {
  const allowedTokenMap: Record<string, AllowedTokenKeys> = {};

  // Helper function to process a token-keys.ts file and merge its contents into the map
  const processTokenKeysFile = async (filePath: string) => {
    try {
      // Dynamically import the TypeScript module
      const tokenKeysModule = await import(filePath);
      const tokenKeysData = tokenKeysModule[Object.keys(tokenKeysModule)[0]]; // Assuming a single export

      // Merge each top-level key (e.g., "zbk-button") into the allowedTokenMap
      for (const key in tokenKeysData) {
        if (tokenKeysData.hasOwnProperty(key)) {
          allowedTokenMap[key] = tokenKeysData[key];
        }
      }
    } catch (error) {
      console.warn(
        `Error processing token-keys.ts at ${filePath}: ${error.message}`
      );
    }
  };

  // Scan each provided directory (core and components directories)
  for (const dir of directories) {
    const items = await fs.readdir(dir, { withFileTypes: true });

    // Check for token-keys.ts at the root level
    const rootTokenKeysPath = path.join(dir, "token-keys.ts");
    await processTokenKeysFile(rootTokenKeysPath);

    // Check for token-keys.ts in subdirectories
    for (const item of items) {
      if (item.isDirectory()) {
        const tokenKeysFilePath = path.join(dir, item.name, "token-keys.ts");
        await processTokenKeysFile(tokenKeysFilePath);
      }
    }
  }

  console.log(allowedTokenMap);
  return allowedTokenMap;
}

// Function to gather tokens from TypeScript files for default tokens or JSON for custom tokens
export async function gatherTokens(
  directory: string,
  isCustomToken: boolean = false
): Promise<TokenObject> {
  const items = await fs.readdir(directory, { withFileTypes: true });
  const tokens: TokenObject = {};

  // Helper function to process a TypeScript or JSON file based on whether it's a custom token
  const processTokenFile = async (filePath: string) => {
    try {
      let tokenData: any;

      if (isCustomToken) {
        // If it's a custom token, load it as JSON
        const tokenFile = await fs.readFile(filePath, "utf-8");
        tokenData = JSON.parse(tokenFile);
      } else {
        // If it's a default token, dynamically import the TypeScript module
        const tokenModule = await import(filePath);
        tokenData = tokenModule[Object.keys(tokenModule)[0]]; // Assuming a single export per file
      }

      // Extract the actual token key (e.g., "zbk-button") from tokenData
      const tokenKey = Object.keys(tokenData)[0];
      const tokenValue = tokenData[tokenKey];

      // Merge token data into the tokens object using the token key
      tokens[tokenKey] = {
        ...tokens[tokenKey], // Merge existing tokens for the same key
        ...tokenValue, // Add new token data
      };
    } catch (error) {
      console.warn(
        `Error processing token file at ${filePath}: ${error.message}`
      );
    }
  };

  // Iterate through items in the directory
  for (const item of items) {
    if (item.isDirectory()) {
      const tokenFilePath = isCustomToken
        ? path.join(directory, item.name, "tokens.json") // Custom tokens are JSON files
        : path.join(directory, item.name, "tokens.ts"); // Default tokens are TypeScript files

      await processTokenFile(tokenFilePath);
    }
  }

  return tokens;
}

// Function to validate tokens using the pre-built allowed token key map
export async function validateTokensUsingMap(
  tokens: TokenObject,
  allowedTokenMap: Record<string, AllowedTokenKeys>
): Promise<void> {
  // Loop through the token keys in the tokens object
  console.log(tokens);
  for (const tokenKey in tokens) {
    if (!allowedTokenMap.hasOwnProperty(tokenKey)) {
      throw new Error(
        `Invalid top-level token key: "${tokenKey}". It is not allowed.`
      );
    }

    const allowedKeys = allowedTokenMap[tokenKey];
    const componentTokens = tokens[tokenKey];
    const { styles } = componentTokens;

    // 1. Validate root-level keys
    const rootAllowedKeys = allowedKeys.rootAllowedKeys;
    for (const rootKey in componentTokens) {
      if (!rootAllowedKeys.includes(rootKey)) {
        throw new Error(
          `Invalid root key "${rootKey}" in "${tokenKey}". Expected one of: ${rootAllowedKeys.join(
            ", "
          )}`
        );
      }
    }

    // 2. Validate "styles" keys if they exist
    if (styles) {
      const allowedStyles = allowedKeys.styles?.allowed;
      const subsets = allowedKeys.styles?.subsets;

      if (!allowedStyles || !subsets) {
        throw new Error(
          `Allowed keys for styles not defined for "${tokenKey}".`
        );
      }

      for (const styleKey in styles) {
        if (!allowedStyles.includes(styleKey)) {
          throw new Error(
            `Invalid style key "${styleKey}" in "${tokenKey}". Expected one of: ${allowedStyles.join(
              ", "
            )}`
          );
        }

        // Validate based on the subset (type checking, etc.)
        const subset = subsets[styleKey];
        const token = styles[styleKey];

        if (!token.value) {
          throw new Error(
            `Missing "value" for style key "${styleKey}" in "${tokenKey}".`
          );
        }

        if (token.type !== subset.type) {
          throw new Error(
            `Invalid type for style key "${styleKey}" in "${tokenKey}". Expected "${subset.type}", got "${token.type}".`
          );
        }
      }
    }
  }
}

// Function to merge default and custom tokens
export function mergeTokens(
  defaultTokens: TokenObject,
  customTokens: TokenObject
): TokenObject {
  const mergedTokens: TokenObject = { ...defaultTokens };

  for (const component in customTokens) {
    if (mergedTokens[component]) {
      mergedTokens[component].styles = {
        ...mergedTokens[component].styles,
        ...customTokens[component].styles,
      };
    } else {
      mergedTokens[component] = customTokens[component];
    }
  }

  return mergedTokens;
}

export function cssVariableConverter(tokenObject: TokenObject): string {
  let cssVariables = "";
  let importVariable = "";

  // Iterate over each top-level token key (e.g., "zbk-button", "zbk-colors")
  for (const tokenKey in tokenObject) {
    if (tokenObject.hasOwnProperty(tokenKey)) {
      const { styles } = tokenObject[tokenKey]; // Access the "styles" object
      if (!styles) {
        console.warn(`No styles found for ${tokenKey}`);
        continue;
      }

      // Process each style key (e.g., "btn-line-height")
      for (const key in styles) {
        if (styles.hasOwnProperty(key)) {
          const { value, type } = styles[key];
          let isValid = true;
          let extraCSS = "";
          let cssValue = value;

          if (value.startsWith("$")) {
            // Convert to CSS variable reference
            cssValue = `var(--zbk-${value.slice(1)})`;
          } else {
            // Basic validation based on type
            if (type === "sizing") {
              const validSizing = ["auto", "min-content", "max-content"];
              isValid =
                validSizing.includes(value) ||
                /^\d*\.?\d+(px|em|rem|%|vw|vh|svh|svw|dvh|dvw)$/.test(value);
            } // Font family logic
            else if (type === "fontFamily") {
              // Expectation is for a Google CSS font family definition, IE `"Noto Serif", serif`
              const fontFamily = value
                .split(",")[0]
                .replace(/['"]/g, "")
                .trim(); // Strip quotes and commas
              let googleFontFamily = fontFamily.replace(/\s+/g, "+"); // Replace spaces with '+'

              // Check for requested weights
              
              if (styles[key].weights) {
                // Convert to Google font API syntax
                // wght@300;400;500 for static font
                // wght@100...500 for variable font
                const weights = styles[key].weights.split(",");
                let weightDefs = ":wght@";
                if (styles[key].variableFont === "true") {
                  if (weights.length === 1) {
                    weightDefs += weights[0] + ";"
                  } else {
                    weightDefs += weights[0] + "..";
                    weightDefs += weights[weights.length - 1];
                  }
                } else {
                  weights.forEach((value, index) => {
                    weightDefs += value;
                    if (index !== weights.length - 1) weightDefs += ";";
                  });
                }
                googleFontFamily += weightDefs;
              }

              // Check if this font is already added to the import variable to avoid duplicates
              if (!importVariable.includes(googleFontFamily)) {
                importVariable += `family=${googleFontFamily}&`;
              }
            } else if (type === "lineHeight") {
              cssValue = `calc(${value} * var(--zbk-line-height-modifier, 1))`;
            } else if (type === "typescale") {
              extraCSS = `  --zbk-${key.replace("-base", "")}: clamp(calc( ( (var(--zbk-${key}) + var(--zbk-viewport-modifier, 1)) * (1 - var(--zbk-font-size-spread, .2)) ) *  var(--zbk-${key.replace("-base", "")}-modifier, 1)), calc( ( var(--zbk-${key}) + var(--zbk-viewport-modifier, 1) ) *  var(--zbk-${key.replace("-base", "")}-modifier, 1)), calc( ( (var(--zbk-${key}) + var(--zbk-viewport-modifier, 1)) * (1 + var(--zbk-font-size-spread, .2)) ) *  var(--zbk-${key.replace("-base", "")}-modifier, 1)));\n`;
            }
          }

          if (!isValid) {
            throw new Error(`Invalid ${type} value for ${key}: ${value}`);
          }

          // Append to the CSS variable output
          cssVariables += `  --zbk-${key}: ${cssValue};\n`;
          if (extraCSS) cssVariables += extraCSS;
        }
      }
    }
  }

  // Finalize the Google font import URL (if any font families were found)
  if (importVariable) {
    importVariable = `@import url('https://fonts.googleapis.com/css2?${importVariable}display=swap');\n`;
  }

  const root = `:root {\n${cssVariables}}`;
  // Prepend the import to the CSS variable output
  const finalCSS = `${importVariable}${root}`;

  return finalCSS;
}

// Function to generate token templates and save them as JSON files
export async function generateTokenTemplates(
  tokens: TokenObject,
  outputDir: string
): Promise<void> {
  try {
    // Ensure the directory exists
    await fs.mkdir(outputDir, { recursive: true });

    // Loop through each token and save it as a JSON file
    for (const tokenKey in tokens) {
      if (tokens.hasOwnProperty(tokenKey)) {
        const tokenData = tokens[tokenKey];
        const jsonFilePath = path.join(outputDir, `${tokenKey}.json`);

        // Convert the token data to JSON and write it to the file
        const jsonContent = JSON.stringify({ [tokenKey]: tokenData }, null, 2);
        await fs.writeFile(jsonFilePath, jsonContent, "utf-8");

        console.log(`Token template generated: ${jsonFilePath}`);
      }
    }
  } catch (error) {
    console.error(`Error generating token templates: ${error.message}`);
  }
}
