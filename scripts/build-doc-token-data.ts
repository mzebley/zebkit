#!/usr/bin/env tsx

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'fs-extra';
import {
  projectDocsTokenData,
  projectPrimitivePalette,
} from '../src/scripts/tokens/docs-token-data';
import { fromDtcgDocument } from '../src/scripts/tokens/dtcg-document';
import {
  deriveDirectTokenCssDestinations,
  propagateTokenCssDestinations,
} from '../src/scripts/tokens/css-token-destinations';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = path.join(
  repoRoot,
  'doc-site',
  'static',
  'zebkit',
  'default-tokens.json'
);
const outputDir = path.join(
  repoRoot,
  'doc-site',
  'src',
  'lib',
  'data',
  'generated'
);

async function main(): Promise<void> {
  const combined = (await fs.readJson(sourcePath)) as Record<
    string,
    Record<string, unknown>
  >;
  const tokenMaps = Object.fromEntries(
    Object.entries(combined).map(([moduleId, document]) => [
      moduleId.startsWith('zbk-') ? moduleId : `zbk-${moduleId}`,
      fromDtcgDocument(document, { mode: 'literal' }).entries,
    ])
  );
  const directDestinations = await deriveDirectTokenCssDestinations(
    tokenMaps,
    path.join(repoRoot, 'src')
  );
  const registry = projectDocsTokenData(
    combined,
    propagateTokenCssDestinations(tokenMaps, directDestinations)
  );
  const serialized = JSON.stringify(registry);
  const invalidSentinel = ['[object Object]', 'NaN', 'undefined'].find((value) =>
    serialized.includes(value)
  );
  if (invalidSentinel) {
    throw new Error(`Docs token projection contains invalid value '${invalidSentinel}'.`);
  }

  await fs.ensureDir(outputDir);
  await fs.writeJson(path.join(outputDir, 'default-tokens.json'), registry, {
    spaces: 2,
  });
  await fs.writeJson(
    path.join(outputDir, 'primitive-palette.json'),
    projectPrimitivePalette(registry),
    { spaces: 2 }
  );
}

main().catch((error) => {
  console.error('Failed to build docs token data:', error);
  process.exitCode = 1;
});
