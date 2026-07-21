#!/usr/bin/env tsx
/**
 * Build editor support artifacts for Zebkit.
 *
 * Generates:
 * 1. schemas/tokens/{key}.schema.json + dist copies — Authorable token override schemas
 * 2. .vscode/settings.json — Repository token-file schema associations
 * 3. schemas/zebkit.config.schema.json + dist/editor copy — Config completion/validation
 * 4. dist/editor/zebkit.css-data.json — VS Code CSS custom data for autocomplete
 */

import path from 'path';
import fs from 'fs-extra';
import { fileURLToPath } from 'node:url';
import {
  ZEBKIT_CONFIG_SCHEMA,
  ZEBKIT_CONFIG_SCHEMA_FILENAME,
} from '../src/scripts/config-schema';
import {
  tokenScaleIndex,
  type AllowedTokenTypes,
} from '../src/definitions/tokens';
import { ALLOWED_TOKEN_TYPE_VALUES } from '../src/definitions/dtcg';
import { fromDtcgDocument, type ModuleMeta } from '../src/scripts/tokens/dtcg-document';
import { tokenForGroupRoot } from '../src/scripts/editor-schema-paths';
import {
  AUTHORABLE_VALUE_SCHEMAS,
  structuredDimensionSchema,
} from '../src/scripts/editor-value-schemas';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const defaultsDir = path.resolve(__dirname, '../dist/cli/defaults');
const editorDir = path.resolve(__dirname, '../dist/editor');
const schemasDir = path.resolve(editorDir, 'schemas');
const sourceTokenSchemasDir = path.resolve(__dirname, '../schemas/tokens');
const repositorySettingsPath = path.resolve(__dirname, '../.vscode/settings.json');
const sourceConfigSchemaPath = path.resolve(
  __dirname,
  '../schemas',
  ZEBKIT_CONFIG_SCHEMA_FILENAME
);

interface ManifestModule {
  key: string;
  file: string;
}

interface TokenObject {
  $value: string | number | { value: number; unit: string };
  $type: string;
  $description: string;
  $extensions?: Record<string, unknown>;
  [key: string]: unknown;
}

// The flat, group-$type-expanded entries of one module's DTCG snapshot
// (fromDtcgDocument strips the group $type/$extensions metadata into `meta`).
type TokenData = Record<string, TokenObject>;

/** Load a per-module DTCG snapshot and expand it to flat entries + module metadata. */
async function readModuleSnapshot(
  file: string
): Promise<{ entries: TokenData; meta: ModuleMeta }> {
  const doc = await fs.readJson(file);
  const { entries, meta } = fromDtcgDocument(doc as Record<string, unknown>, {
    mode: 'literal',
  });
  return { entries: entries as unknown as TokenData, meta };
}

type JsonSchema = Record<string, unknown>;

const deprecatedSchema: JsonSchema = {
  oneOf: [{ type: 'boolean' }, { type: 'string' }],
};

function fontMetadataProperties() {
  return {
    source: {
      type: 'string',
      enum: ['system', 'google', 'local'],
      description: 'Where this font family is loaded from.',
    },
    fallback: {
      type: 'string',
      enum: ['sans', 'serif', 'mono'],
      description: 'Fallback stack category appended to the authored family.',
    },
    weights: {
      description: 'Static font weights or a variable-font range such as 200..800.',
      oneOf: [
        { type: 'string' },
        { type: 'array', items: { type: ['string', 'number'] }, uniqueItems: true },
      ],
    },
    styles: {
      type: 'array',
      items: { type: 'string', enum: ['normal', 'italic'] },
      uniqueItems: true,
    },
    faces: {
      type: 'array',
      items: {
        type: 'object',
        required: ['src'],
        additionalProperties: false,
        properties: {
          src: { type: 'string' },
          weight: { type: ['string', 'number'] },
          style: { type: 'string', enum: ['normal', 'italic', 'oblique'] },
          display: {
            type: 'string',
            enum: ['auto', 'block', 'swap', 'fallback', 'optional'],
          },
          format: { type: 'string' },
          unicodeRange: { type: 'string' },
        },
      },
    },
    display: {
      type: 'string',
      enum: ['auto', 'block', 'swap', 'fallback', 'optional'],
    },
  };
}

function zebkitExtensionsSchema(type: string, includeScale: boolean) {
  const vendorProperties: Record<string, any> = {
    a11y: {
      type: ['boolean', 'string'],
      description:
        'Runtime accessibility-modifier opt-in: true uses the default modifier for the token type; a string names a custom modifier variable.',
    },
  };
  if (type === 'fontFamily') {
    vendorProperties.font = {
      type: 'object',
      description: 'Font-loading metadata for this family.',
      additionalProperties: false,
      properties: fontMetadataProperties(),
    };
  }
  if (includeScale) {
    vendorProperties.scale = {
      type: 'object',
      description: 'Generated-scale step metadata (index 0 = base step).',
      additionalProperties: false,
      properties: {
        index: { type: 'integer' },
        valueSource: { type: 'string', enum: ['generated', 'pinned'] },
      },
    };
  }
  return {
    type: 'object',
    additionalProperties: false,
    properties: {
      'dev.zebkit': {
        type: 'object',
        additionalProperties: false,
        properties: vendorProperties,
      },
    },
    patternProperties: {
      '^(?!dev\\.zebkit$).+': {},
    },
  };
}

/**
 * Group-level `$extensions` on a token override document: fluid-scale controls
 * (viewport anchors, base sizes, ratios, spacing `max-scale`) — build-time
 * metadata, never tokens.
 */
function groupExtensionsSchema() {
  const authoredDimension = {
    oneOf: [
      structuredDimensionSchema,
      { type: 'string', pattern: '^-?(?:\\d+|\\d*\\.\\d+)(?:px|rem)$' },
    ],
  };
  return {
    type: 'object',
    additionalProperties: false,
    properties: {
      'dev.zebkit': {
        type: 'object',
        additionalProperties: false,
        properties: {
          scale: {
            type: 'object',
            description:
              'Fluid-scale controls for this module (e.g. min-viewport/max-viewport/min-base/max-base/min-ratio/max-ratio on font-size, max-scale on spacing).',
            additionalProperties: false,
            properties: {
              'min-viewport': authoredDimension,
              'max-viewport': authoredDimension,
              'min-base': authoredDimension,
              'max-base': authoredDimension,
              'min-ratio': { type: 'number', exclusiveMinimum: 0 },
              'max-ratio': { type: 'number', exclusiveMinimum: 0 },
              'max-scale': { type: 'number', exclusiveMinimum: 0 },
            },
          },
        },
      },
    },
    patternProperties: {
      '^(?!dev\\.zebkit$).+': {},
    },
  };
}

function generateTokenDefinition(token: TokenObject): JsonSchema {
  const tokenProperties: Record<string, unknown> = {
    $value: { $ref: `#/definitions/${token.$type}Value` },
    $type: {
      const: token.$type,
    },
    $description: {
      type: 'string',
    },
    $deprecated: { $ref: '#/definitions/deprecated' },
    $extensions: zebkitExtensionsSchema(token.$type, tokenScaleIndex(token) != null),
  };

  return {
    type: 'object',
    description: token.$description,
    required: ['$value'],
    additionalProperties: false,
    properties: tokenProperties,
  };
}

function tokenDefinitionName(token: TokenObject): string {
  const scaleSuffix = tokenScaleIndex(token) == null ? '' : 'Scaled';
  return `${token.$type}${scaleSuffix}Token`;
}

function generateTokenProperty(token: TokenObject): JsonSchema {
  return {
    description: token.$description,
    allOf: [{ $ref: `#/definitions/${tokenDefinitionName(token)}` }],
  };
}

function generateValueDefinitions(
  tokenData: TokenData,
  refsByType: Record<string, string[]>
): Record<string, any> {
  const definitions: Record<string, any> = {};

  const usedTypes = new Set(
    Object.values(tokenData)
      .map((token) => token?.$type)
      .filter((type): type is AllowedTokenTypes =>
        ALLOWED_TOKEN_TYPE_VALUES.includes(type as AllowedTokenTypes)
      )
  );
  for (const type of usedTypes) {
    const key = `${type}Value`;
    definitions[key] = AUTHORABLE_VALUE_SCHEMAS[type];
    if (refsByType[type]?.length) definitions[key].examples = refsByType[type];
  }

  for (const token of Object.values(tokenData)) {
    if (!token?.$type) continue;
    const name = tokenDefinitionName(token);
    definitions[name] ??= generateTokenDefinition(token);
  }

  return definitions;
}

/** Unwrapped `zbk-*.tokens.json` files authored by consumers and repository themes. */
function generateTokenSchema(
  module: ManifestModule,
  tokenData: TokenData,
  refsByType: Record<string, string[]>
): object {
  const definitions = generateValueDefinitions(tokenData, refsByType);
  definitions.deprecated = deprecatedSchema;
  definitions.groupType = {
    type: 'string',
    enum: [...ALLOWED_TOKEN_TYPE_VALUES],
  };
  definitions.groupExtensions = groupExtensionsSchema();
  const groupMetadata = {
    $type: { $ref: '#/definitions/groupType' },
    $description: { type: 'string' },
    $deprecated: { $ref: '#/definitions/deprecated' },
    $extensions: { $ref: '#/definitions/groupExtensions' },
  };
  const entries = Object.fromEntries(
    Object.entries(tokenData).filter(
      ([name, entry]) =>
        !name.startsWith('$') && !name.startsWith('_') && entry?.$type
    )
  );
  const knownPrefixes = new Set<string>();
  for (const name of Object.keys(entries)) {
    const parts = name.split('-');
    for (let length = 1; length <= parts.length; length += 1) {
      knownPrefixes.add(parts.slice(0, length).join('-'));
    }
  }
  const groupPrefixes = new Set(
    [...knownPrefixes].filter((prefix) =>
      Object.keys(entries).some((name) => name.startsWith(`${prefix}-`))
    )
  );

  const groupDefinitionName = (prefix: string) => `group:${prefix}`;
  const groupRef = (prefix: string) => ({
    $ref: `#/definitions/${groupDefinitionName(prefix)}`,
  });
  const pathNode = (prefix: string): JsonSchema => {
    const token = entries[prefix];
    const group = groupPrefixes.has(prefix);
    if (token && group) {
      return { anyOf: [generateTokenProperty(token), groupRef(prefix)] };
    }
    return token ? generateTokenProperty(token) : groupRef(prefix);
  };

  for (const prefix of groupPrefixes) {
    const properties: Record<string, JsonSchema> = { ...groupMetadata };
    const rootToken = tokenForGroupRoot(entries, prefix);
    if (rootToken) {
      properties.$root = generateTokenProperty(rootToken);
    }
    for (const descendant of knownPrefixes) {
      if (!descendant.startsWith(`${prefix}-`)) continue;
      const childPath = descendant.slice(prefix.length + 1);
      properties[childPath] = pathNode(descendant);
    }
    definitions[groupDefinitionName(prefix)] = {
      type: 'object',
      minProperties: 1,
      additionalProperties: false,
      properties,
    };
  }

  const properties: Record<string, JsonSchema> = { ...groupMetadata };
  for (const prefix of knownPrefixes) properties[prefix] = pathNode(prefix);
  if (entries.root) properties.$root = generateTokenProperty(entries.root);

  return {
    $schema: 'http://json-schema.org/draft-07/schema',
    title: `Zebkit ${module.key} Token Overrides`,
    description: `Authorable overrides for the ${module.key} token module.`,
    type: 'object',
    additionalProperties: false,
    definitions,
    properties,
  };
}

/**
 * Map token type to CSS syntax hint
 */
function getTokenTypeSyntax(type: string): string | undefined {
  const syntaxMap: Record<string, string> = {
    'color': '<color>',
    'dimension': '<length>',
    'cssDimension': '<length-percentage>',
    'fontFamily': '<family-name>',
    'fontWeight': '<number>',
    'number': '<number>',
    'strokeStyle': '<line-style>',
    'shadow': '<shadow>',
    'duration': '<time>',
    'cubicBezier': '<easing-function>',
    'transitionProperty': '<single-transition-property>#',
    'transitionTimingFunction': '<easing-function>',
  };

  return syntaxMap[type];
}

/**
 * Generate VS Code CSS Custom Data
 */
async function generateCssCustomData(): Promise<object> {
  const manifestPath = path.join(defaultsDir, 'manifest.json');
  const manifest = await fs.readJson(manifestPath) as { modules: ManifestModule[] };

  const properties: Array<{
    name: string;
    description: string;
    syntax?: string;
  }> = [];

  for (const module of manifest.modules) {
    const tokenFilePath = path.join(defaultsDir, module.file);
    const { entries: tokenFile } = await readModuleSnapshot(tokenFilePath);

    // Iterate over the module's leaf token entries (group $type already expanded).
    for (const [tokenName, tokenObj] of Object.entries(tokenFile)) {
      const token = tokenObj as TokenObject;
      const cssVarName = `--zbk-${module.key.replace('zbk-', '')}-${tokenName}`;
      const description = `${token.$description} [${module.key.replace('zbk-', '')}]`;

      const syntax = getTokenTypeSyntax(token.$type);
      const property: any = {
        name: cssVarName,
        description,
      };

      if (syntax) {
        property.syntax = syntax;
      }

      properties.push(property);
    }
  }

  return {
    version: 1.1,
    properties,
  };
}

/**
 * Main build function
 */
async function buildEditor() {
  console.log('Building editor support artifacts...');

  try {
    await fs.ensureDir(editorDir);
    await fs.emptyDir(schemasDir);
    await fs.emptyDir(sourceTokenSchemasDir);
    await fs.ensureDir(path.dirname(repositorySettingsPath));

    const manifestPath = path.join(defaultsDir, 'manifest.json');
    const manifest = await fs.readJson(manifestPath) as { modules: ManifestModule[] };

    // PASS 1: Build map of token type -> list of reference strings
    console.log('Scanning token modules for references...');
    const refsByType: Record<string, string[]> = {};

    for (const module of manifest.modules) {
      const tokenFilePath = path.join(defaultsDir, module.file);
      const { entries: tokenData } = await readModuleSnapshot(tokenFilePath);

      // Extract namespace from module key: "zbk-brand" -> "brand", "zbk-app" -> "app"
      const namespace = module.key.replace('zbk-', '');

      for (const [tokenName, tokenObj] of Object.entries(tokenData)) {
        const token = tokenObj as TokenObject;
        const tokenType = token.$type;

        if (!refsByType[tokenType]) {
          refsByType[tokenType] = [];
        }

        const reference = `{${namespace}.${tokenName}}`;
        refsByType[tokenType].push(reference);
      }
    }

    // Log summary of references found
    for (const [type, refs] of Object.entries(refsByType)) {
      console.log(`  Found ${refs.length} ${type} references`);
    }

    // PASS 2: Generate the one canonical schema used by every *.tokens.json file.
    console.log('\nGenerating per-module schemas...');

    const repositorySchemaAssociations: Array<{ fileMatch: string[]; url: string }> = [];

    for (const module of manifest.modules) {
      const tokenFilePath = path.join(defaultsDir, module.file);
      const { entries: tokenData } = await readModuleSnapshot(tokenFilePath);

      const tokenSchema = generateTokenSchema(module, tokenData, refsByType);
      const schemaFileName = `${module.key}.schema.json`;
      const distSchemaPath = path.join(schemasDir, schemaFileName);
      const sourceSchemaPath = path.join(sourceTokenSchemasDir, schemaFileName);
      await fs.writeJson(distSchemaPath, tokenSchema, { spaces: 2 });
      await fs.writeJson(sourceSchemaPath, tokenSchema, { spaces: 2 });
      console.log(`  Written: ${distSchemaPath}`);

      repositorySchemaAssociations.push({
        fileMatch: [`/theme/**/${module.key}.tokens.json`],
        url: `./schemas/tokens/${schemaFileName}`,
      });
    }

    await fs.writeJson(
      repositorySettingsPath,
      { 'json.schemas': repositorySchemaAssociations },
      { spaces: 2 }
    );
    console.log(`  Written: ${repositorySettingsPath}`);

    // The tracked source copy powers this repository's own configs; the dist copy ships
    // with the package. Both come from the runtime schema object used by config.ts.
    console.log('\nGenerating Zebkit config schema...');
    const distConfigSchemaPath = path.join(schemasDir, ZEBKIT_CONFIG_SCHEMA_FILENAME);
    await fs.writeJson(sourceConfigSchemaPath, ZEBKIT_CONFIG_SCHEMA, { spaces: 2 });
    await fs.writeJson(distConfigSchemaPath, ZEBKIT_CONFIG_SCHEMA, { spaces: 2 });
    console.log(`  Written: ${sourceConfigSchemaPath}`);
    console.log(`  Written: ${distConfigSchemaPath}`);

    // Generate and write CSS custom data
    console.log('\nGenerating zebkit.css-data.json...');
    const cssData = await generateCssCustomData();
    const cssDataPath = path.join(editorDir, 'zebkit.css-data.json');
    await fs.writeJson(cssDataPath, cssData, { spaces: 2 });
    console.log(`  Written: ${cssDataPath}`);

    console.log('\nEditor artifacts built successfully.');
  } catch (error) {
    console.error('Failed to build editor artifacts:', error);
    process.exit(1);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  void buildEditor();
}
