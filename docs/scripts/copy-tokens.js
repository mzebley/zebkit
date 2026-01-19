import { promises as fs } from 'node:fs';
import path from 'node:path';

const staticDir = path.resolve('static', 'zebkit');
const publicDir = path.resolve('public', 'zebkit');
const targetDir = path.resolve('src', 'lib', 'data', 'generated');

const tokenFiles = [
  'default-tokens.json',
  'token-lookup.json',
  'allowed-token-types.json'
];
const staticAssets = ['zebkit.js', 'zebkit.js.map'];

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

  await Promise.all(
    staticAssets.map((filename) =>
      copyFile(publicDir, filename, path.join(staticDir, filename))
    )
  );
}

run().catch((error) => {
  console.error('Failed to copy token json files:', error);
  process.exit(1);
});
