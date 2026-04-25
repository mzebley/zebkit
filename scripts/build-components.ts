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
import path from 'path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const entry = path.resolve(root, 'src/core/index.ts');
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
