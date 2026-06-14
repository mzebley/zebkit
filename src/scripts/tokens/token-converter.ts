import chalk from "chalk";
import {
  AllowedTokenTypes,
  TokenInterface,
  GoogleFontTokenInterface,
  GoogleFontTokenObject,
} from "@definitions/tokens";
import { a11yMap } from "@definitions/a11y-map";
import { paletteMap } from "@definitions/palette-map";
import {
  tokenAliasMap,
  areTokensTypesCompatible,
} from "@definitions/token-maps";
import { DEFAULT_LAYER, LAYER_ORDER, LayerName } from "@definitions/layers";
import { ZEBKIT_PREFIX } from "@config";

/**
 * Converts validated Zebkit tokens into CSS custom properties, handling dot-notation links,
 * responsive typography, and optional accessibility modifiers.
 */

function join(tokenKey: string, key: string): string {
  return [tokenKey, key].filter(Boolean).join("-");
}

function tokenTypesCompatibleLoose(
  type1: AllowedTokenTypes | string,
  type2: AllowedTokenTypes | string
): boolean {
  if (
    (type1 === "fontFamily" && type2 === "googleFont") ||
    (type2 === "fontFamily" && type1 === "googleFont")
  ) {
    return true;
  }
  return areTokensTypesCompatible(
    type1 as AllowedTokenTypes,
    type2 as AllowedTokenTypes
  );
}

function validateCssReferencesExist(
  value: string,
  type: AllowedTokenTypes | string,
  globalPrefix: string,
  availableTokens: { [key: string]: TokenInterface | GoogleFontTokenInterface }
): boolean {
  const tokenPath = value.slice(1, -1).split(".");
  const parent = tokenPath[0] as string;
  const child = tokenPath[1] as string;
  let valid = false;
  let invalidType = false;

  if (availableTokens.hasOwnProperty(`${globalPrefix}-${parent}`)) {
    if (availableTokens[`${globalPrefix}-${parent}`].hasOwnProperty(child)) {
      const tokenType =
        availableTokens[`${globalPrefix}-${parent}`][child].type;
      if (tokenTypesCompatibleLoose(type, tokenType)) {
        valid = true;
      } else {
        invalidType = true;
        console.error(
          chalk.red(
            `Invalid token reference: ${value} (type '${type}' cannot reference '${tokenType}').`
          )
        );
      }
    }
  }

  if (!valid && !invalidType) {
    const paletteKeyDirect = child;
    const paletteKeyNested = `${parent}-${child}`;
    const paletteHit =
      typeof child === "string" &&
      typeof parent === "string" &&
      (paletteMap.includes(paletteKeyDirect) || paletteMap.includes(paletteKeyNested));

    if (paletteHit) {
      if (type === "color" || type === "borderColor") {
        valid = true;
      } else {
        invalidType = true;
        console.error(
          chalk.red(
            `Invalid token reference: ${value}. Token type '${type}' is not a color-compatible token.`
          )
        );
      }
    }
  }

  if (!valid && !invalidType && tokenAliasMap.hasOwnProperty(parent)) {
    if (typeof tokenAliasMap[parent] === "string") {
      const tokenType = tokenAliasMap[parent] as AllowedTokenTypes;
      if (tokenTypesCompatibleLoose(type, tokenType)) {
        valid = true;
      } else {
        invalidType = true;
        console.error(
          chalk.red(
            `Invalid token reference: ${value}. Token type '${type}' does not match '${tokenType}'.`
          )
        );
      }
    } else if (
      typeof tokenAliasMap[parent] === "object" &&
      tokenAliasMap[parent] !== null &&
      tokenAliasMap[parent].hasOwnProperty(child)
    ) {
      const tokenType = (
        tokenAliasMap[parent] as Record<string, AllowedTokenTypes>
      )[child];
      if (tokenTypesCompatibleLoose(type, tokenType)) {
        valid = true;
      } else {
        invalidType = true;
        console.error(
          chalk.red(
            `Invalid token reference: ${value}. Token type '${type}' does not match '${tokenType}'.`
          )
        );
      }
    }
  }

  if (!valid && !invalidType) {
    console.error(
      chalk.red(
        `Invalid token reference: ${value}. Ensure the target token or palette color exists.`
      )
    );
  }

  return valid;
}

/**
 * Resolves dot-notation token references into CSS variables.
 */
export function convertDotNotation(
  value: string,
  type: AllowedTokenTypes | string,
  globalPrefix: string,
  availableTokens: { [key: string]: TokenInterface | GoogleFontTokenInterface },
  byPass = false
): string {
  if (
    typeof value === "string" &&
    value.startsWith("{") &&
    value.endsWith("}")
  ) {
    const valid =
      byPass ||
      validateCssReferencesExist(value, type, globalPrefix, availableTokens);

    if (valid) {
      const variableName = value.slice(1, -1).replace(/\./g, "-");
      return `var(--${globalPrefix}-${variableName})`;
    }
    return "undefined";
  }
  return value;
}

// Options to control where and how CSS variables are emitted.
export interface CssVarGenerationOptions {
  layers?: Record<string, LayerName>;
  selector?: string;
  defaultLayer?: LayerName;
}

/**
 * Converts validated token maps into a CSS custom properties string.
 */
export const convertTokensToCssVars = (
  tokens: { [key: string]: TokenInterface | GoogleFontTokenInterface },
  options: CssVarGenerationOptions = {}
): string => {
  const { layers = {}, selector = ":root", defaultLayer = DEFAULT_LAYER } = options;
  const perLayer: Record<LayerName, string> = {
    theme: "",
    base: "",
    components: "",
    utilities: "",
  };
  const fontImports: Set<string> = new Set();

  Object.entries(tokens).forEach(([key, tokenProperties]) => {
    const layer = layers[key] ?? defaultLayer;
    let currentStyles = `${selector} {\n`;
    Object.entries(tokenProperties).forEach(([propertyKey, item]) => {
      const cssVariableKey = join(key, propertyKey);

      // Build-time settings (e.g. fluid type-scale controls) are consumed during
      // compilation and must never be emitted as CSS variables.
      if (item && typeof item === "object" && "type" in item && item.type === "setting") {
        return;
      }

      if (item && typeof item === "object" && "value" in item) {
        let cssVariableValue: string | number = item.value as string | number;

        if ("type" in item && item.type === "googleFont") {
          const importString = buildGoogleFontImport(
            item as GoogleFontTokenObject
          );
          if (importString) {
            fontImports.add(importString);
          }
        } else {
          cssVariableValue = convertDotNotation(
            String(item.value),
            item.type as AllowedTokenTypes,
            ZEBKIT_PREFIX,
            tokens as Record<string, TokenInterface>
          );
        }

        const baseValue = String(cssVariableValue);

        if ("type" in item && (item.type === "rootFontSize" || item.type === "rootSize")) {
          // Pre-resolved by `resolveTypeScale` / `resolveSpaceScale` (fluid clamp or static
          // value, with a11y modifiers already baked in). Emit the value verbatim.
          cssVariableValue = baseValue;
        } else if ("a11y" in item && "type" in item) {
          let a11yValue = item["a11y"];
          if (typeof a11yValue === "boolean") {
            a11yValue = a11yMap[item.type as string];
          }
          if (a11yValue) {
            cssVariableValue = `calc(${cssVariableValue} * var(${a11yValue}))`;
          }
        }

        currentStyles += `--${cssVariableKey}: ${cssVariableValue};\n`;
      } else {
        console.error(chalk.red(`Invalid token object for ${cssVariableKey}.`));
      }
    });
    currentStyles += "}\n";
    perLayer[layer] += currentStyles;
  });

  const imports = Array.from(fontImports).join("\n");
  let css = imports ? `${imports}\n` : "";
  css += "@layer theme, base, components, utilities;\n\n";

  for (const layer of LAYER_ORDER) {
    const body = perLayer[layer];
    if (!body) continue;
    css += `@layer ${layer} {\n${body}}\n\n`;
  }

  return css;
};

function buildGoogleFontImport(item: GoogleFontTokenObject): string | null {
  const family = String(item.value || "")
    .split(",")[0]
    .replace(/['"]/g, "")
    .trim();
  if (!family) return null;

  let url = `family=${family.replace(/\s+/g, "+")}`;
  const weights = (item.weights || "").trim();
  if (weights) {
    const cleaned = weights
      .split(",")
      .map((w) => w.trim())
      .filter(Boolean);
    if (cleaned.length) {
      if (item.variable) {
        // Variable font range: first..last or single value
        if (cleaned.length === 1) {
          url += `:wght@${cleaned[0]}`;
        } else {
          url += `:wght@${cleaned[0]}..${cleaned[cleaned.length - 1]}`;
        }
      } else {
        url += `:wght@${cleaned.join(";")}`;
      }
    }
  }

  return `@import url('https://fonts.googleapis.com/css2?${url}&display=swap');\n`;
}
