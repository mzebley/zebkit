#!/usr/bin/env tsx
/**
 * Build editor support artifacts for Zebkit.
 *
 * Generates:
 * 1. dist/editor/tokens.schema.json — JSON Schema for *.tokens.json files
 * 2. dist/editor/zebkit.css-data.json — VS Code CSS custom data for autocomplete
 */

import path from 'path';
import fs from 'fs-extra';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const defaultsDir = path.resolve(__dirname, '../dist/cli/defaults');
const editorDir = path.resolve(__dirname, '../dist/editor');

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
 * Generate JSON Schema for token files
 */
async function generateTokenSchema(): Promise<object> {
  const allowedTokenTypes = await extractAllowedTokenTypes();

  return {
    $schema: 'http://json-schema.org/draft-07/schema',
    title: 'Zebkit Token File',
    description: 'Token definitions for Zebkit design system. Each file contains a single namespace object with token entries.',
    type: 'object',
    maxProperties: 1,
    additionalProperties: {
      type: 'object',
      additionalProperties: {
        $ref: '#/definitions/TokenObject',
      },
    },
    definitions: {
      TokenObject: {
        type: 'object',
        required: ['value', 'type', 'description'],
        properties: {
          value: {
            type: ['string', 'number'],
            description: 'Token value (string or number)',
          },
          type: {
            enum: allowedTokenTypes,
            description: 'Token type classification',
          },
          description: {
            type: 'string',
            description: 'Human-readable token description',
          },
          a11y: {
            type: ['boolean', 'string'],
            description: 'Accessibility note or flag',
          },
        },
        additionalProperties: false,
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

    // Generate and write token schema
    console.log('Generating tokens.schema.json...');
    const tokenSchema = await generateTokenSchema();
    const schemaPath = path.join(editorDir, 'tokens.schema.json');
    await fs.writeJson(schemaPath, tokenSchema, { spaces: 2 });
    console.log(`  Written: ${schemaPath}`);

    // Generate and write CSS custom data
    console.log('Generating zebkit.css-data.json...');
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
