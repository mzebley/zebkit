import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Resolve everything from the script's own location so the script works
// regardless of cwd (doc-site/ via npm, or the repo root directly).
const docsDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const repoRoot = path.resolve(docsDir, '..');

const staticDir = path.join(docsDir, 'static', 'zebkit');
const targetDir = path.join(docsDir, 'src', 'lib', 'data', 'generated');

// The component bundle the docs serve at /zebkit/zebkit.js comes straight from
// the library build (`npm run build:components`).
const componentsDist = path.join(repoRoot, 'dist', 'components');

const tokenFiles = [
  'token-lookup.json',
  'allowed-token-types.json'
];

async function copyComponentBundle() {
  // zebkit.js is the self-contained browser bundle (lit included).
  await copyFile(componentsDist, 'zebkit.js', path.join(staticDir, 'zebkit.js'));
  await copyFile(componentsDist, 'zebkit.js.map', path.join(staticDir, 'zebkit.js.map'));
}

async function copyFile(sourceDir, filename, targetPath) {
  const sourcePath = path.join(sourceDir, filename);
  try {
    await fs.copyFile(sourcePath, targetPath);
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return;
    }
    throw error;
  }
}

async function run() {
  await fs.mkdir(targetDir, { recursive: true });
  await fs.mkdir(staticDir, { recursive: true });

  await Promise.all(
    tokenFiles.map((filename) => copyFile(staticDir, filename, path.join(targetDir, filename)))
  );

  await copyComponentBundle();
}

run().catch((error) => {
  console.error('Failed to copy token json files:', error);
  process.exit(1);
});
