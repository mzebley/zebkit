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
import { tokenScaleIndex } from '../src/definitions/tokens';

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

interface TokenData {
  _key: string;
  _layer: string;
  [key: string]: unknown;
}

/**
 * Extract allowedTokenTypes enum values from src/definitions/tokens.ts
 */
async function extractAllowedTokenTypes(): Promise<string[]> {
  const tokensDefPath = path.resolve(__dirname, '../src/definitions/tokens.ts');
  const source = await fs.readFile(tokensDefPath, 'utf-8');

  const match = source.match(/allowedTokenTypes = z\.enum\(\[([\s\S]*?)\]\)/);
  if (!match) {
    throw new Error('Could not extract allowedTokenTypes from tokens.ts');
  }

  const enumContent = match[1];
  const values = enumContent.match(/'([^']+)'/g) || [];
  return values.map(v => v.replace(/'/g, ''));
}

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

function zebkitExtensionsSchema(token: TokenObject) {
  const vendorProperties: Record<string, any> = {
    a11y: {
      type: ['boolean', 'string'],
      description:
        'Runtime accessibility-modifier opt-in: true uses the default modifier for the token type; a string names a custom modifier variable.',
    },
  };
  if (token.$type === 'fontFamily') {
    vendorProperties.font = {
      type: 'object',
      description: 'Font-loading metadata for this family.',
      additionalProperties: false,
      properties: fontMetadataProperties(),
    };
  }
  if (tokenScaleIndex(token) != null) {
    vendorProperties.scale = {
      type: 'object',
      description: 'Generated-scale step metadata (index 0 = base step).',
      additionalProperties: false,
      properties: {
        index: { type: 'number' },
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
  };
}

/**
 * Group-level `$extensions` on a token override document: fluid-scale controls
 * (viewport anchors, base sizes, ratios, spacing `max-scale`) — build-time
 * metadata, never tokens.
 */
function groupExtensionsSchema() {
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
            additionalProperties: {
              oneOf: [{ type: ['string', 'number'] }, structuredDimensionSchema],
            },
          },
        },
      },
    },
  };
}

function generateTokenProperties(
  tokenData: TokenData
): Record<string, any> {
  const properties: Record<string, any> = {};

  for (const [tokenName, tokenObj] of Object.entries(tokenData)) {
    // Skip _key/_layer metadata and the group-level $extensions member.
    if (tokenName.startsWith('_') || tokenName.startsWith('$')) continue;

    const token = tokenObj as TokenObject;
    const tokenProperties: Record<string, any> = {
      $value: { $ref: `#/definitions/${token.$type}Value` },
      $type: {
        const: token.$type,
      },
      $description: {
        type: 'string',
      },
      $extensions: zebkitExtensionsSchema(token),
    };

    properties[tokenName] = {
      type: 'object',
      description: token.$description,
      required: ['$value'],
      additionalProperties: false,
      properties: tokenProperties,
    };
  }

  return properties;
}

/** Structured DTCG dimension value: `{value, unit}` with unit limited to px/rem. */
const structuredDimensionSchema = {
  type: 'object',
  required: ['value', 'unit'],
  additionalProperties: false,
  properties: {
    value: { type: 'number' },
    unit: { type: 'string', enum: ['px', 'rem'] },
  },
};

/** `dimension` values may be structured `{value, unit}` objects (override
 * documents may also carry raw strings, substituted verbatim by the merge). */
function acceptsStructuredDimension(type: string): boolean {
  return type === 'dimension';
}

function generateValueDefinitions(
  tokenData: TokenData,
  refsByType: Record<string, string[]>
): Record<string, any> {
  const definitions: Record<string, any> = {};

  for (const tokenObj of Object.values(tokenData)) {
    if (!tokenObj || typeof tokenObj !== 'object' || !('$type' in tokenObj)) continue;
    const type = String((tokenObj as TokenObject).$type);
    const key = `${type}Value`;
    if (definitions[key]) continue;

    definitions[key] = acceptsStructuredDimension(type)
      ? { oneOf: [{ type: ['string', 'number'] }, structuredDimensionSchema] }
      : { type: ['string', 'number'] };
    if (refsByType[type]?.length) definitions[key].examples = refsByType[type];
  }

  return definitions;
}

/** Unwrapped `zbk-*.tokens.json` files authored by consumers and repository themes. */
function generateTokenSchema(
  module: ManifestModule,
  tokenData: TokenData,
  refsByType: Record<string, string[]>
): object {
  return {
    $schema: 'http://json-schema.org/draft-07/schema',
    title: `Zebkit ${module.key} Token Overrides`,
    description: `Authorable overrides for the ${module.key} token module.`,
    type: 'object',
    additionalProperties: false,
    definitions: generateValueDefinitions(tokenData, refsByType),
    properties: {
      $extensions: groupExtensionsSchema(),
      ...generateTokenProperties(tokenData),
    },
  };
}

/**
 * Map token type to CSS syntax hint
 */
function getTokenTypeSyntax(type: string): string | undefined {
  const syntaxMap: Record<string, string> = {
    'color': '<color>',
    'borderColor': '<color>',
    'dimension': '<length>',
    'cssDimension': '<length-percentage>',
    'fontFamily': '<family-name>',
    'fontWeight': '<number>',
    'lineHeight': '<number> | <length>',
    'opacity': '<number>',
    'transition': '<string>',
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
    const tokenFile = await fs.readJson(tokenFilePath) as TokenData;

    // Iterate over token entries, skipping metadata fields
    for (const [tokenName, tokenObj] of Object.entries(tokenFile)) {
      // Skip _key/_layer metadata and the group-level $extensions member.
      if (tokenName.startsWith('_') || tokenName.startsWith('$')) continue;

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

    // Extract allowed token types once
    const allowedTokenTypes = await extractAllowedTokenTypes();

    // PASS 1: Build map of token type -> list of reference strings
    console.log('Scanning token modules for references...');
    const refsByType: Record<string, string[]> = {};

    for (const module of manifest.modules) {
      const tokenFilePath = path.join(defaultsDir, module.file);
      const tokenData = await fs.readJson(tokenFilePath) as TokenData;

      // Extract namespace from module key: "zbk-brand" -> "brand", "zbk-app" -> "app"
      const namespace = module.key.replace('zbk-', '');

      for (const [tokenName, tokenObj] of Object.entries(tokenData)) {
        // Skip _key/_layer metadata and the group-level $extensions member.
        if (tokenName.startsWith('_') || tokenName.startsWith('$')) continue;

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
      const tokenData = await fs.readJson(tokenFilePath) as TokenData;

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

buildEditor();
