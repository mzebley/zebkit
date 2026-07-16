import { fileURLToPath } from 'node:url';
import path from 'path';

/**
 * Returns the root directory of the zebkit package.
 *
 * In the installed CLI bundle (dist/cli/zebkit.mjs), import.meta.url resolves to
 * node_modules/zebkit/dist/cli/zebkit.mjs, so two levels up is node_modules/zebkit/.
 *
 * In dev (tsx src/cli/index.ts), import.meta.url resolves to src/cli/index.ts,
 * so two levels up is the repo root — which is also the right answer.
 */
export function getZebkitPackageRoot(): string {
  const dir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(dir, '../..');
}

/**
 * Returns the directory containing pre-compiled JSON token defaults.
 * In the installed CLI bundle (dist/cli/zebkit.mjs), this resolves to dist/cli/defaults/.
 * In dev, run `npm run build:defaults` first to populate dist/cli/defaults/.
 */
export function getZebkitDefaultsDir(): string {
  const dir = path.dirname(fileURLToPath(import.meta.url));
  // The bundle lives at dist/cli/zebkit.mjs; defaults are in the same dir at dist/cli/defaults/
  return path.resolve(dir, 'defaults');
}

/**
 * Returns the directory containing bundled built-in theme token snapshots.
 * In the installed CLI bundle this resolves to dist/cli/presets/.
 */
export function getZebkitPresetsDir(): string {
  const dir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(dir, 'presets');
}

/**
 * Returns the directory containing the bundled agent context (per-component
 * markdown + llms.txt). In the installed CLI bundle this resolves to
 * dist/cli/context/ (copied from doc-site/static/zebkit/context/ at build time).
 */
export function getZebkitContextDir(): string {
  const dir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(dir, 'context');
}
