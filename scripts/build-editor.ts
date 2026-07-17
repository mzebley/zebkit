#!/usr/bin/env tsx
/**
 * Build editor support artifacts for Zebkit.
 *
 * Generates:
 * 1. dist/editor/schemas/{key}.schema.json — Per-module JSON Schemas for token files
 * 2. schemas/zebkit.config.schema.json + dist/editor copy — Config completion/validation
 * 3. dist/editor/zebkit.css-data.json — VS Code CSS custom data for autocomplete
 */

import path from 'path';
import fs from 'fs-extra';
import { fileURLToPath } from 'node:url';
import {
  ZEBKIT_CONFIG_SCHEMA,
  ZEBKIT_CONFIG_SCHEMA_FILENAME,
} from '../src/scripts/config-schema';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const defaultsDir = path.resolve(__dirname, '../dist/cli/defaults');
const editorDir = path.resolve(__dirname, '../dist/editor');
const schemasDir = path.resolve(editorDir, 'schemas');
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
  value: string | number;
  type: string;
  description: string;
  a11y?: boolean | string;
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

/**
 * Generate per-module JSON Schema for a specific token file
 */
function generateModuleSchema(
  module: ManifestModule,
  tokenData: TokenData,
  refsByType: Record<string, string[]>
): object {
  // Build properties for each token key
  const properties: Record<string, any> = {};

  for (const [tokenName, tokenObj] of Object.entries(tokenData)) {
    if (tokenName.startsWith('_')) continue; // Skip _key, _layer

    const token = tokenObj as TokenObject;
    const valueSchema: any = {
      type: ['string', 'number'],
    };

    // Add examples for matching token type references
    const examples = refsByType[token.type];
    if (examples && examples.length > 0) {
      valueSchema.examples = examples;
    }

    properties[tokenName] = {
      type: 'object',
      description: token.description,
      required: ['value', 'type', 'description'],
      additionalProperties: false,
      properties: {
        value: valueSchema,
        type: {
          const: token.type,
        },
        description: {
          type: 'string',
        },
        a11y: {
          type: ['boolean', 'string'],
        },
      },
    };
  }

  // Build the module schema
  return {
    $schema: 'http://json-schema.org/draft-07/schema',
    title: `Zebkit ${module.key} Tokens`,
    type: 'object',
    required: [module.key],
    additionalProperties: false,
    properties: {
      [module.key]: {
        type: 'object',
        additionalProperties: false,
        properties,
      },
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
    'fontSize': '<length>',
    'rootFontSize': '<length>',
    'spacing': '<length>',
    'dimension': '<length>',
    'rootSize': '<length>',
    'sizing': '<length>',
    'borderWidth': '<length>',
    'borderRadius': '<length>',
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
      if (tokenName.startsWith('_')) continue; // Skip _key, _layer

      const token = tokenObj as TokenObject;
      const cssVarName = `--zbk-${module.key.replace('zbk-', '')}-${tokenName}`;
      const description = `${token.description} [${module.key.replace('zbk-', '')}]`;

      const syntax = getTokenTypeSyntax(token.type);
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
    await fs.ensureDir(schemasDir);

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
        if (tokenName.startsWith('_')) continue; // Skip _key, _layer

        const token = tokenObj as TokenObject;
        const tokenType = token.type;

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

    // PASS 2: Generate and write per-module schemas
    console.log('\nGenerating per-module schemas...');

    for (const module of manifest.modules) {
      const tokenFilePath = path.join(defaultsDir, module.file);
      const tokenData = await fs.readJson(tokenFilePath) as TokenData;

      const moduleSchema = generateModuleSchema(module, tokenData, refsByType);
      const schemaPath = path.join(schemasDir, `${module.key}.schema.json`);
      await fs.writeJson(schemaPath, moduleSchema, { spaces: 2 });
      console.log(`  Written: ${schemaPath}`);
    }

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
