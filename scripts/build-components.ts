#!/usr/bin/env tsx
/**
 * Builds the zebkit component library for npm distribution.
 *
 * - JS bundle: esbuild (fast, tree-shakeable ESM, lit externalized as peer dep)
 * - Type declarations: rollup-plugin-dts (one bundled .d.ts per public entry,
 *   resolves path aliases)
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

const componentsDir = path.resolve(root, 'src/components');
const distDir = path.resolve(root, 'dist/components');
const entry = path.resolve(componentsDir, 'index.ts');
const outJs = path.resolve(distDir, 'index.js');
const outBrowserJs = path.resolve(root, 'dist/components/zebkit.js');
const tsconfigPath = path.resolve(root, 'tsconfig.json');

// Packages that must be installed by the consumer, not bundled here.
const EXTERNALS = ['lit', 'lit/*', '@lit/*'];

const componentNames = (await fs.readdir(componentsDir, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory() && entry.name !== 'base')
  .map((entry) => entry.name)
  .filter((name) => fs.existsSync(path.resolve(componentsDir, name, 'index.ts')))
  .sort();

const componentEntries = componentNames.map((name) =>
  path.resolve(componentsDir, name, 'index.ts')
);
const declarationEntries = Object.fromEntries([
  ['index', entry],
  ...componentNames.map((name) => [name, path.resolve(componentsDir, name, 'index.ts')]),
]);

await fs.emptyDir(distDir);

const readBundleGraph = async (entryPath: string, visited = new Set<string>()): Promise<string> => {
  if (visited.has(entryPath)) return '';
  visited.add(entryPath);

  const source = await fs.readFile(entryPath, 'utf8');
  const imports = [...source.matchAll(/(?:import|export)\s+(?:[^'";]*?from\s+)?["']([^"']+)["']/g)]
    .map((match) => match[1])
    .filter((specifier) => specifier.startsWith('.'));
  const dependencies = await Promise.all(
    imports.map((specifier) => readBundleGraph(path.resolve(path.dirname(entryPath), specifier), visited))
  );

  return [source, ...dependencies].join('\n');
};

// --- JS bundle ---
console.log('Building component JS bundle...');
await build({
  entryPoints: [entry, ...componentEntries],
  bundle: true,
  platform: 'browser',
  format: 'esm',
  splitting: true,
  outdir: distDir,
  outbase: componentsDir,
  entryNames: '[dir]/index',
  chunkNames: 'chunks/[name]-[hash]',
  external: EXTERNALS,
  tsconfig: tsconfigPath,
  sourcemap: true,
  logLevel: 'info',
});
console.log(`JS bundles written to ${distDir}`);

// --- Self-contained browser bundle ---
// Same entry with lit bundled in, for direct `<script type="module">` /
// dynamic-import use without a bundler (the docs site serves this one).
console.log('Building self-contained browser bundle...');
await build({
  entryPoints: [entry],
  bundle: true,
  platform: 'browser',
  format: 'esm',
  outfile: outBrowserJs,
  minify: true,
  tsconfig: tsconfigPath,
  sourcemap: true,
  logLevel: 'info',
});
console.log(`Browser bundle written to ${outBrowserJs}`);

// --- Type declarations ---
console.log('Building type declarations...');
const dtsBundle = await rollup({
  input: declarationEntries,
  external: [/^lit/, /^@lit/],
  plugins: [
    dts({
      tsconfig: tsconfigPath,
      compilerOptions: { declaration: true },
    }),
  ],
});
await dtsBundle.write({
  dir: distDir,
  format: 'es',
  entryFileNames: (chunk) =>
    chunk.name === 'index' ? 'index.d.ts' : `${chunk.name}/index.d.ts`,
  chunkFileNames: 'chunks/[name]-[hash].d.ts',
});
await dtsBundle.close();
console.log(`Declarations written to ${distDir}`);

// --- Component token roots ---
// The shipped list of `--zbk-*` tokens the components read from their light-DOM
// styles. `zebkit prune` unions these into the token graph when a project uses
// components, so their tokens survive a src-only content scan (hazard 5).
const componentTokens = extractZbkTokens(await readBundleGraph(outJs));
const componentTokensPath = path.resolve(root, 'dist/cli/defaults/component-tokens.json');
await fs.ensureDir(path.dirname(componentTokensPath));
await fs.writeJson(componentTokensPath, componentTokens, { spaces: 2 });
console.log(`Component token roots (${componentTokens.length}) written to ${componentTokensPath}`);
