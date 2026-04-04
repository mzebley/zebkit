#!/usr/bin/env tsx
/**
 * Bundles the zebkit CLI into a single distributable ESM file.
 * Run via `npm run build:cli` before publishing.
 *
 * Externals are runtime dependencies that must be present in node_modules
 * when the CLI runs in the user's project.
 */

import { build } from 'esbuild';
import path from 'path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

await build({
  entryPoints: [path.resolve(__dirname, '../src/cli/index.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node18',
  outfile: path.resolve(__dirname, '../dist/cli/zebkit.mjs'),
  // The shebang makes the file directly executable.
  // The createRequire line polyfills `require()` for bundled CJS packages
  // (fs-extra, graceful-fs, glob, etc.) that use require() for Node built-ins.
  // This is needed because Node.js ESM modules don't have require() by default.
  banner: {
    js: [
      '#!/usr/bin/env node',
      "import { createRequire } from 'module';",
      'const require = createRequire(import.meta.url);',
    ].join('\n'),
  },
  // esbuild reads tsconfig.json and respects path aliases (@config, @definitions/*, etc.)
  tsconfig: path.resolve(__dirname, '../tsconfig.json'),
  // These must be installed as `dependencies` in package.json and resolved
  // from the consumer's node_modules at runtime.
  external: [
    // Runtime CSS processing deps (must be in package `dependencies`)
    'sass',
    'postcss',
    'postcss-preset-env',
    'autoprefixer',
    'cssnano',
    // commander uses CJS internally; marking external lets Node resolve its
    // native ESM export at runtime, avoiding the dynamic-require-in-ESM error.
    'commander',
  ],
  // Suppress the "use" annotation warning for dynamic imports we intentionally keep
  logLevel: 'info',
});

console.log('CLI bundle written to dist/cli/zebkit.mjs');
