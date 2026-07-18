import chalk from "chalk";
import {
  AllowedTokenTypes,
  TokenInterface,
  FontSource,
  FontFallback,
  FontFaceObject,
  tokenA11y,
  tokenFontMeta,
  tokenValueToString,
} from "@definitions/tokens";
import {
  FONT_FALLBACK_STACKS,
  FontFallbackCategory,
} from "@definitions/font-fallbacks";
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

function validateCssReferencesExist(
  value: string,
  type: AllowedTokenTypes | string,
  globalPrefix: string,
  availableTokens: { [key: string]: TokenInterface },
  errors?: string[]
): boolean {
  const report = (message: string) => {
    console.error(chalk.red(message));
    errors?.push(message);
  };
  const tokenPath = value.slice(1, -1).split(".");
  if (tokenPath.length !== 2) {
    report(
      `Invalid token reference: ${value}. References must be exactly '{module.entry}' (two dot-separated segments).`
    );
    return false;
  }
  const parent = tokenPath[0] as string;
  const child = tokenPath[1] as string;
  let valid = false;
  let invalidType = false;

  if (availableTokens.hasOwnProperty(`${globalPrefix}-${parent}`)) {
    if (availableTokens[`${globalPrefix}-${parent}`].hasOwnProperty(child)) {
      const tokenType =
        availableTokens[`${globalPrefix}-${parent}`][child].$type;
      if (areTokensTypesCompatible(type as AllowedTokenTypes, tokenType as AllowedTokenTypes)) {
        valid = true;
      } else {
        invalidType = true;
        report(
          `Invalid token reference: ${value} (type '${type}' cannot reference '${tokenType}').`
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
        report(
          `Invalid token reference: ${value}. Token type '${type}' is not a color-compatible token.`
        );
      }
    }
  }

  if (!valid && !invalidType && tokenAliasMap.hasOwnProperty(parent)) {
    if (typeof tokenAliasMap[parent] === "string") {
      const tokenType = tokenAliasMap[parent] as AllowedTokenTypes;
      if (areTokensTypesCompatible(type as AllowedTokenTypes, tokenType as AllowedTokenTypes)) {
        valid = true;
      } else {
        invalidType = true;
        report(
          `Invalid token reference: ${value}. Token type '${type}' does not match '${tokenType}'.`
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
      if (areTokensTypesCompatible(type as AllowedTokenTypes, tokenType as AllowedTokenTypes)) {
        valid = true;
      } else {
        invalidType = true;
        report(
          `Invalid token reference: ${value}. Token type '${type}' does not match '${tokenType}'.`
        );
      }
    }
  }

  if (!valid && !invalidType) {
    report(
      `Invalid token reference: ${value}. Ensure the target token or palette color exists.`
    );
  }

  return valid;
}

/**
 * Resolves dot-notation token references into CSS variables. Invalid references
 * resolve to the literal string "undefined" AND are appended to `errors` when
 * provided — callers must treat a non-empty `errors` as a fatal build failure so
 * `--x: undefined;` never ships.
 */
export function convertDotNotation(
  value: string,
  type: AllowedTokenTypes | string,
  globalPrefix: string,
  availableTokens: { [key: string]: TokenInterface },
  byPass = false,
  errors?: string[]
): string {
  if (
    typeof value === "string" &&
    value.startsWith("{") &&
    value.endsWith("}")
  ) {
    const valid =
      byPass ||
      validateCssReferencesExist(value, type, globalPrefix, availableTokens, errors);

    if (valid) {
      const variableName = value.slice(1, -1).replace(/\./g, "-");
      return `var(--${globalPrefix}-${variableName})`;
    }
    return "undefined";
  }
  return value;
}

/** How Google Fonts are delivered. `import` (default) emits a render-blocking `@import` in the
 * CSS; `link`/`preload` emit nothing in CSS and surface a head snippet via `fontHead`; `manual`
 * emits nothing remote (the consumer wires fonts up themselves). */
export type FontStrategy = "import" | "link" | "preload" | "manual";

// Options to control where and how CSS variables are emitted.
export interface CssVarGenerationOptions {
  layers?: Record<string, LayerName>;
  selector?: string;
  defaultLayer?: LayerName;
  /** Google Fonts delivery strategy. Defaults to `import`. */
  fontStrategy?: FontStrategy;
  /** Base path that bare local `@font-face` `src` filenames resolve against. Defaults to `/assets/`. */
  assetFilePath?: string;
  /**
   * Token set used to validate `{x.y}` references, when it differs from the tokens being
   * emitted. Overlay (minimal) builds emit only a changed subset but must still resolve
   * references against the full merged theme (e.g. `{font-family.body}` → `var(...)`).
   * Defaults to the emitted `tokens`.
   */
  referenceTokens?: { [key: string]: TokenInterface };
}

/** Structured `<head>` requirements for `link`/`preload` font strategies, used to write the
 * sidecar HTML snippet. Empty when the strategy is `import` or `manual`. */
export interface FontHeadRequirements {
  preconnect: string[];
  stylesheets: string[];
  preloads: string[];
}

export interface CssVarConversionResult {
  css: string;
  fontImports: string[];
  fontFaces: string[];
  fontHead: FontHeadRequirements;
  /**
   * Fatal conversion problems (invalid references, malformed token objects).
   * Non-empty means the emitted CSS contains `undefined` values — callers must
   * fail the build rather than ship it.
   */
  errors: string[];
}

/**
 * Converts validated token maps into CSS custom properties, plus the font loading artifacts
 * (Google `@import`s, `@font-face` blocks, and head requirements) derived from font tokens.
 */
export const convertTokensToCssVars = (
  tokens: { [key: string]: TokenInterface },
  options: CssVarGenerationOptions = {}
): CssVarConversionResult => {
  const {
    layers = {},
    selector = ":root",
    defaultLayer = DEFAULT_LAYER,
    fontStrategy = "import",
    assetFilePath,
    referenceTokens,
  } = options;
  // References resolve against the full theme when emitting a subset; otherwise the emitted set.
  const refTokens = (referenceTokens ?? tokens) as Record<string, TokenInterface>;
  const perLayer: Record<LayerName, string> = {
    theme: "",
    base: "",
    components: "",
    utilities: "",
  };
  const fontImports: Set<string> = new Set();
  const fontFaces: Set<string> = new Set();
  const headPreconnect: Set<string> = new Set();
  const headStylesheets: Set<string> = new Set();
  const headPreloads: Set<string> = new Set();
  const errors: string[] = [];

  Object.entries(tokens).forEach(([key, tokenProperties]) => {
    const layer = layers[key] ?? defaultLayer;
    let currentStyles = `${selector} {\n`;
    Object.entries(tokenProperties).forEach(([propertyKey, item]) => {
      const cssVariableKey = join(key, propertyKey);

      // Font-family tokens get bespoke handling: normalize the shape, append the fallback stack,
      // and emit the relevant loading artifact (Google request or `@font-face`) based on `source`.
      if (isFontToken(item)) {
        const norm = normalizeFontToken(item as Record<string, unknown>);
        const rawValue = norm.value;
        const isReference = rawValue.startsWith("{") && rawValue.endsWith("}");

        let cssVariableValue: string;
        if (isReference) {
          // Pure alias — resolve to a var(); never append a fallback (the target carries its own).
          cssVariableValue = convertDotNotation(
            rawValue,
            "fontFamily",
            ZEBKIT_PREFIX,
            refTokens,
            false,
            errors
          );
        } else {
          cssVariableValue = applyFallback(rawValue, norm.fallback);
          if (norm.source === "google") {
            const url = buildGoogleFontUrl(norm);
            if (url) {
              const href = `${url}&display=swap`;
              if (fontStrategy === "import") {
                fontImports.add(`@import url('${href}');`);
              } else if (fontStrategy === "link" || fontStrategy === "preload") {
                headPreconnect.add("https://fonts.googleapis.com");
                headPreconnect.add("https://fonts.gstatic.com");
                headStylesheets.add(href);
                if (fontStrategy === "preload") headPreloads.add(href);
              }
              // `manual`: emit nothing remote.
            }
          } else if (norm.source === "local") {
            for (const block of buildFontFaceBlocks(norm, assetFilePath)) {
              fontFaces.add(block);
            }
          }
        }

        currentStyles += `--${cssVariableKey}: ${cssVariableValue};\n`;
        return;
      }

      if (item && typeof item === "object" && "$value" in item) {
        // Structured dimensions serialize to their canonical CSS string here;
        // plain strings (including references) and numbers pass through.
        let cssVariableValue: string | number = convertDotNotation(
          tokenValueToString(item.$value),
          item.$type as AllowedTokenTypes,
          ZEBKIT_PREFIX,
          refTokens,
          false,
          errors
        );

        const baseValue = String(cssVariableValue);

        if ("$type" in item && (item.$type === "rootFontSize" || item.$type === "rootSize")) {
          // Pre-resolved by `resolveTypeScale` / `resolveSpaceScale` (fluid clamp or static
          // value, with a11y modifiers already baked in). Emit the value verbatim.
          cssVariableValue = baseValue;
        } else {
          let a11yValue = tokenA11y(item);
          if (typeof a11yValue === "boolean") {
            a11yValue = a11yValue ? a11yMap[item.$type as string] : undefined;
          }
          if (a11yValue) {
            cssVariableValue = `calc(${cssVariableValue} * var(${a11yValue}))`;
          }
        }

        currentStyles += `--${cssVariableKey}: ${cssVariableValue};\n`;
      } else {
        const message = `Invalid token object for ${cssVariableKey}.`;
        console.error(chalk.red(message));
        errors.push(message);
      }
    });
    currentStyles += "}\n";
    perLayer[layer] += currentStyles;
  });

  const importLines = Array.from(fontImports);
  const faceBlocks = Array.from(fontFaces);

  let css = "";
  if (importLines.length) css += `${importLines.join("\n")}\n`;
  if (faceBlocks.length) css += `${faceBlocks.join("\n")}\n`;
  css += "@layer theme, base, components, utilities;\n\n";

  for (const layer of LAYER_ORDER) {
    const body = perLayer[layer];
    if (!body) continue;
    css += `@layer ${layer} {\n${body}}\n\n`;
  }

  return {
    css,
    fontImports: importLines,
    fontFaces: faceBlocks,
    fontHead: {
      preconnect: Array.from(headPreconnect),
      stylesheets: Array.from(headStylesheets),
      preloads: Array.from(headPreloads),
    },
    errors,
  };
};

/** Normalized font token, source-agnostic, used by the converter's font handling. */
interface NormalizedFontToken {
  value: string;
  source: FontSource;
  fallback?: FontFallback;
  weights?: string | Array<string | number>;
  styles?: Array<"normal" | "italic">;
  faces?: FontFaceObject[];
  display?: string;
}

function isFontToken(item: unknown): boolean {
  return (
    !!item &&
    typeof item === "object" &&
    "$type" in item &&
    (item as { $type?: unknown }).$type === "fontFamily"
  );
}

/** Reads a font token's fields (loading metadata lives under `$extensions["dev.zebkit"].font`)
 * into a source-agnostic shape, defaulting `source` to `system`. */
function normalizeFontToken(item: Record<string, unknown>): NormalizedFontToken {
  const font = tokenFontMeta(item) ?? {};
  return {
    value: String(item.$value ?? ""),
    source: (font.source as FontSource) ?? "system",
    fallback: font.fallback as FontFallback | undefined,
    weights: font.weights as NormalizedFontToken["weights"],
    styles: font.styles as NormalizedFontToken["styles"],
    faces: font.faces as FontFaceObject[] | undefined,
    display: font.display as string | undefined,
  };
}

/** First family in a value, stripped of quotes and fallbacks (e.g. `"Inter", sans` -> `Inter`). */
function familyName(value: string): string {
  return String(value || "")
    .split(",")[0]
    .replace(/['"]/g, "")
    .trim();
}

/** Appends the canonical fallback stack for a category to a concrete family value. */
function applyFallback(value: string, fallback?: FontFallback): string {
  if (!fallback) return value;
  const stack = FONT_FALLBACK_STACKS[fallback as FontFallbackCategory];
  return stack ? `${value}, ${stack}` : value;
}

/** Weight tokens for the css2 axis: a range string stays a single token, an array is preserved. */
function normalizeWeightTokens(weights: NormalizedFontToken["weights"]): string[] {
  if (Array.isArray(weights)) {
    return weights.map((w) => String(w).trim()).filter(Boolean);
  }
  if (typeof weights === "string" && weights.trim()) {
    return [weights.trim()];
  }
  return [];
}

/** Builds the Google Fonts css2 URL (without `&display=swap`) for a normalized token. */
function buildGoogleFontUrl(norm: NormalizedFontToken): string | null {
  const family = familyName(norm.value);
  if (!family) return null;

  const fam = family.replace(/\s+/g, "+");
  const italic = Array.isArray(norm.styles) && norm.styles.includes("italic");
  const weightTokens = normalizeWeightTokens(norm.weights);

  let axis = "";
  if (weightTokens.length) {
    if (italic) {
      // ital-major ordering: all upright weights, then all italics.
      const tuples = [
        ...weightTokens.map((w) => `0,${w}`),
        ...weightTokens.map((w) => `1,${w}`),
      ];
      axis = `:ital,wght@${tuples.join(";")}`;
    } else {
      axis = `:wght@${weightTokens.join(";")}`;
    }
  } else if (italic) {
    axis = `:ital@0;1`;
  }

  return `https://fonts.googleapis.com/css2?family=${fam}${axis}`;
}

const FONT_FORMAT_BY_EXT: Record<string, string> = {
  woff2: "woff2",
  woff: "woff",
  ttf: "truetype",
  otf: "opentype",
  eot: "embedded-opentype",
  svg: "svg",
};

function inferFontFormat(src: string): string | undefined {
  const ext = src.split("?")[0].split(".").pop()?.toLowerCase();
  return ext ? FONT_FORMAT_BY_EXT[ext] : undefined;
}

/** Bare filenames resolve against `assetFilePath`; `/`, `http(s)://`, `//`, and `.` are verbatim. */
function resolveFontSrc(src: string, assetFilePath?: string): string {
  if (/^(https?:)?\/\//.test(src) || src.startsWith("/") || src.startsWith(".")) {
    return src;
  }
  const base = assetFilePath ?? "/assets/";
  const normalizedBase = base.endsWith("/") ? base : `${base}/`;
  return `${normalizedBase}${src}`;
}

/** Builds one `@font-face` block per face for a local (self-hosted) font token. */
function buildFontFaceBlocks(
  norm: NormalizedFontToken,
  assetFilePath?: string
): string[] {
  const family = familyName(norm.value);
  if (!family || !Array.isArray(norm.faces)) return [];

  return norm.faces.map((face) => {
    const url = resolveFontSrc(face.src, assetFilePath);
    const format = face.format ?? inferFontFormat(face.src);
    const srcLine = format ? `url("${url}") format("${format}")` : `url("${url}")`;

    const lines = [`  font-family: "${family}";`, `  src: ${srcLine};`];
    if (face.weight != null) lines.push(`  font-weight: ${face.weight};`);
    if (face.style) lines.push(`  font-style: ${face.style};`);
    lines.push(`  font-display: ${face.display ?? norm.display ?? "swap"};`);
    if (face.unicodeRange) lines.push(`  unicode-range: ${face.unicodeRange};`);

    return `@font-face {\n${lines.join("\n")}\n}`;
  });
}
