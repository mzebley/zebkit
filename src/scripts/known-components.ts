// Component vocabulary discovery. Kept apart from components-config.ts so the
// pure filter logic stays importable from jest (this module uses import.meta).

import path from 'path';
import fs from 'fs-extra';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * The component vocabulary. Dev mode reads src/components directory names;
 * installed CLI mode reads the components.json snapshot written by
 * `npm run build:defaults`.
 */
export async function getKnownComponents(tokenDefaultsDir?: string): Promise<string[]> {
  if (tokenDefaultsDir) {
    const snapshotPath = path.join(tokenDefaultsDir, 'components.json');
    if (await fs.pathExists(snapshotPath)) {
      const names = (await fs.readJson(snapshotPath)) as string[];
      if (Array.isArray(names)) return names;
    }
  }

  const componentsDir = path.resolve(__dirname, '../components');
  if (!(await fs.pathExists(componentsDir))) return [];

  const entries = await fs.readdir(componentsDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory() && entry.name !== 'base')
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
}
