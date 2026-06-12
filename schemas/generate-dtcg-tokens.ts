#!/usr/bin/env ts-node

import chalk from "chalk";
import fs from "fs-extra";
import path from "node:path";
import { pathToFileURL } from "node:url";

import type { LoadedTokenEntry } from "./token-template-loader.js";
import { loadTokenTemplates } from "./token-template-loader.js";
import { resolveCanonicalTokenReference } from "../types/token-maps.js";

type ParsedArgs = {
  flags: Record<string, string | boolean>;
};

type DtcgToken = {
  $value: unknown;
  $type?: string;
  $description?: string;
  $extensions?: Record<string, unknown>;
};

type DtcgDocument = Record<string, Record<string, DtcgToken>>;

const PALETTE_RELATIVE_PATH = "src/lib/core/color/palette/styles.scss";
const UNSAFE_OBJECT_KEYS = new Set(["__proto__", "constructor", "prototype"]);

const DTCG_TYPE_MAP: Record<string, string> = {
  borderColor: "color",
  borderRadius: "dimension",
  borderWidth: "dimension",
  color: "color",
  dimension: "dimension",
  fontFamily: "fontFamily",
  fontSize: "dimension",
  fontWeight: "fontWeight",
  letterSpacing: "dimension",
  lineHeight: "number",
  rootFontSize: "dimension",
  rootSize: "dimension",
  sizing: "dimension",
  spacing: "dimension",
};

function parseArgs(argv: string[]): ParsedArgs {
  const flags: Record<string, string | boolean> = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) {
      continue;
    }

    const key = arg.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      flags[key] = true;
      continue;
    }

    flags[key] = next;
    index += 1;
  }

  return { flags };
}

function asString(value: string | boolean | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function canonicalizeReferences(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }

  return value.replace(/\{([^}]+)\}/g, (_match, reference: string) => {
    return `{${resolveCanonicalTokenReference(reference)}}`;
  });
}

function convertToken(token: LoadedTokenEntry): DtcgToken {
  const converted: DtcgToken = {
    $value: canonicalizeReferences(token.value),
  };

  const extensions: Record<string, unknown> = {};
  const dtcgType = token.type ? DTCG_TYPE_MAP[token.type] : undefined;
  if (dtcgType) {
    converted.$type = dtcgType;
  } else if (token.type) {
    extensions["plus.uswds.type"] = token.type;
  }

  if (token.description) {
    converted.$description = token.description;
  }
  if (token.a11y !== undefined) {
    extensions["plus.uswds.a11y"] = token.a11y;
  }
  if (token.exposed !== undefined) {
    extensions["plus.uswds.exposed"] = token.exposed;
  }
  if (Object.keys(extensions).length > 0) {
    converted.$extensions = extensions;
  }

  return converted;
}

function deepMerge<T extends Record<string, unknown>>(base: T, overlay: T): T {
  const result: Record<string, unknown> = { ...base };

  for (const [key, value] of Object.entries(overlay)) {
    const existing = result[key];
    if (
      existing &&
      value &&
      typeof existing === "object" &&
      typeof value === "object" &&
      !Array.isArray(existing) &&
      !Array.isArray(value)
    ) {
      result[key] = deepMerge(
        existing as Record<string, unknown>,
        value as Record<string, unknown>
      );
      continue;
    }

    result[key] = value;
  }

  return result as T;
}

function normalizeThemeGroups(themeTokens: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(themeTokens).map(([groupKey, tokens]) => [
      groupKey.startsWith("usa-") ? groupKey.slice(4) : groupKey,
      tokens,
    ])
  );
}

async function loadThemeOverlay(
  packageRoot: string,
  theme: string
): Promise<Record<string, unknown>> {
  if (theme === "base") {
    return {};
  }

  const themePath = path.resolve(
    packageRoot,
    "src/theme-tokens",
    `${theme}-tokens.json`
  );
  if (!(await fs.pathExists(themePath))) {
    throw new Error(`Theme token file not found: ${themePath}`);
  }

  return normalizeThemeGroups(await fs.readJson(themePath));
}

function findReferencedColorTokens(document: DtcgDocument): Set<string> {
  const referenced = new Set<string>();

  for (const group of Object.values(document)) {
    for (const token of Object.values(group)) {
      if (typeof token.$value !== "string") {
        continue;
      }

      const matches = token.$value.matchAll(/\{color\.([^}]+)\}/g);
      for (const match of matches) {
        referenced.add(match[1]);
      }
    }
  }

  return referenced;
}

function isUnsafeObjectKey(key: string): boolean {
  return UNSAFE_OBJECT_KEYS.has(key);
}

export async function readColorPaletteEntries(packageRoot: string): Promise<Array<[string, string]>> {
  const palettePath = path.resolve(packageRoot, PALETTE_RELATIVE_PATH);

  if (!(await fs.pathExists(palettePath))) {
    return [];
  }

  const paletteSource = await fs.readFile(palettePath, "utf8");
  const matches = paletteSource.matchAll(
    /--#\{\$cssVarPrefix\}-color-([a-z0-9-]+):\s*([^;]+);/g
  );

  return Array.from(matches, ([, tokenName, value]) => {
    if (isUnsafeObjectKey(tokenName)) {
      throw new Error(
        `Unsafe raw color palette token name "${tokenName}" in ${palettePath}.`
      );
    }

    return [tokenName, value.trim()];
  });
}

async function addReferencedPaletteTokens(
  document: DtcgDocument,
  packageRoot: string
): Promise<void> {
  const referencedColorTokens = findReferencedColorTokens(document);
  if (referencedColorTokens.size === 0) {
    return;
  }

  const paletteEntries = await readColorPaletteEntries(packageRoot);
  if (paletteEntries.length === 0) {
    throw new Error(
      `No raw color palette entries were found. Expected ${PALETTE_RELATIVE_PATH} to exist and contain --#{$cssVarPrefix}-color-* entries.`
    );
  }

  const paletteEntryMap = new Map(paletteEntries);
  if (referencedColorTokens.has("transparent") && !paletteEntryMap.has("transparent")) {
    paletteEntryMap.set("transparent", paletteEntryMap.get("global-transparent") ?? "transparent");
  }

  document.color ??= {};
  for (const [tokenName, value] of paletteEntryMap) {
    if (isUnsafeObjectKey(tokenName)) {
      throw new Error(`Unsafe raw color palette token name "${tokenName}".`);
    }

    if (
      !referencedColorTokens.has(tokenName) ||
      Object.prototype.hasOwnProperty.call(document.color, tokenName)
    ) {
      continue;
    }

    document.color[tokenName] = {
      $value: value,
      $type: "color",
      $description: `USWDS raw color palette value: ${tokenName}`,
      $extensions: {
        "plus.uswds.source": "raw-palette",
      },
    };
  }
}

export async function buildDtcgTokenDocument(options: {
  packageRoot?: string;
  theme?: string;
} = {}): Promise<DtcgDocument> {
  const packageRoot = options.packageRoot ?? process.cwd();
  const theme = options.theme ?? "base";
  const templates = await loadTokenTemplates(packageRoot);
  const canonicalTokens: Record<string, unknown> = {};

  for (const template of templates) {
    canonicalTokens[template.key] = template.tokens;
  }

  const themeOverlay = await loadThemeOverlay(packageRoot, theme);
  const mergedTokens = deepMerge(canonicalTokens, themeOverlay);
  const document: DtcgDocument = {};

  for (const [groupKey, groupTokens] of Object.entries(mergedTokens)) {
    if (!groupTokens || typeof groupTokens !== "object" || Array.isArray(groupTokens)) {
      continue;
    }

    document[groupKey] = {};
    for (const [tokenKey, token] of Object.entries(groupTokens)) {
      if (!token || typeof token !== "object" || Array.isArray(token)) {
        continue;
      }

      document[groupKey][tokenKey] = convertToken(token as LoadedTokenEntry);
    }
  }

  await addReferencedPaletteTokens(document, packageRoot);

  return document;
}

export async function generateDtcgTokenArtifacts(options: {
  packageRoot?: string;
  theme?: string;
  outputDir?: string;
} = {}): Promise<{ filePath: string; theme: string }> {
  const packageRoot = options.packageRoot ?? process.cwd();
  const theme = options.theme ?? "base";
  const outputDir = path.resolve(packageRoot, options.outputDir ?? "dist/dtcg");
  const document = await buildDtcgTokenDocument({ packageRoot, theme });
  const filePath = path.join(outputDir, `uswds-plus.${theme}.tokens.json`);

  await fs.ensureDir(outputDir);
  await fs.writeJson(filePath, document, { spaces: 2 });

  return { filePath, theme };
}

export async function run(): Promise<void> {
  const { flags } = parseArgs(process.argv.slice(2));
  const result = await generateDtcgTokenArtifacts({
    theme: asString(flags.theme) ?? "base",
    outputDir: asString(flags["output-dir"]),
  });

  console.log(chalk.green(`DTCG token export (${result.theme}): ${result.filePath}`));
}

const currentModulePath =
  typeof __filename === "string" ? __filename : process.argv[1];

if (
  process.argv[1] &&
  currentModulePath &&
  pathToFileURL(process.argv[1]).href === pathToFileURL(currentModulePath).href
) {
  run().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(message));
    process.exitCode = 1;
  });
}
