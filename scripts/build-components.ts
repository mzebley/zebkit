#!/usr/bin/env tsx
/**
 * Builds the zebkit component library for npm distribution.
 *
 * - JS bundle: esbuild (fast, tree-shakeable ESM, lit externalized as peer dep)
 * - Type declarations: rollup-plugin-dts (single bundled .d.ts, resolves path aliases)
 *
 * Run via `npm run build:components` before publishing.
 */

import { build } from 'esbuild';
import { rollup } from 'rollup';
import dts from 'rollup-plugin-dts';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { extractZbkTokens } from '../src/scripts/prune/content-scan';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const entry = path.resolve(root, 'src/components/index.ts');
const outJs = path.resolve(root, 'dist/components/index.js');
const outDts = path.resolve(root, 'dist/components/index.d.ts');
const tsconfigPath = path.resolve(root, 'tsconfig.json');

// Packages that must be installed by the consumer, not bundled here.
const EXTERNALS = ['lit', 'lit/*', '@lit/*'];

// --- JS bundle ---
console.log('Building component JS bundle...');
await build({
  entryPoints: [entry],
  bundle: true,
  platform: 'browser',
  format: 'esm',
  outfile: outJs,
  external: EXTERNALS,
  tsconfig: tsconfigPath,
  sourcemap: true,
  logLevel: 'info',
});
console.log(`JS bundle written to ${outJs}`);

// --- Type declarations ---
console.log('Building type declarations...');
const dtsBundle = await rollup({
  input: entry,
  external: [/^lit/, /^@lit/],
  plugins: [
    dts({
      tsconfig: tsconfigPath,
      compilerOptions: { declaration: true },
    }),
  ],
});
await dtsBundle.write({ file: outDts, format: 'es' });
await dtsBundle.close();
console.log(`Declarations written to ${outDts}`);

// --- Component token roots ---
// The shipped list of `--zbk-*` tokens the components read from their shadow
// styles. `zebkit prune` unions these into the token graph when a project uses
// components, so their tokens survive a src-only content scan (hazard 5).
const componentTokens = extractZbkTokens(await fs.readFile(outJs, 'utf8'));
const componentTokensPath = path.resolve(root, 'dist/cli/defaults/component-tokens.json');
await fs.ensureDir(path.dirname(componentTokensPath));
await fs.writeJson(componentTokensPath, componentTokens, { spaces: 2 });
console.log(`Component token roots (${componentTokens.length}) written to ${componentTokensPath}`);
