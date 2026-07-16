/**
 * @jest-environment node
 */

import fs from 'fs-extra';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const PROJECT_ROOT = process.cwd();
const COMPONENTS_DIR = path.join(PROJECT_ROOT, 'src', 'components');
const DIST_COMPONENTS_DIR = path.join(PROJECT_ROOT, 'dist', 'components');

describe('published component exports', () => {
  jest.setTimeout(120000);

  it('resolves every component subpath and ships its JavaScript and declarations', async () => {
    await execFileAsync(process.execPath, ['--import', 'tsx', 'scripts/build-components.ts'], {
      cwd: PROJECT_ROOT,
      env: { ...process.env, CI: 'true', FORCE_COLOR: '0' },
    });

    const componentNames = (await fs.readdir(COMPONENTS_DIR, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory() && entry.name !== 'base')
      .map((entry) => entry.name)
      .filter((name) => fs.existsSync(path.join(COMPONENTS_DIR, name, 'index.ts')))
      .sort();

    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'zebkit-package-exports-'));
    const packageDir = path.join(tmpDir, 'node_modules', 'zebkit');

    try {
      await fs.ensureDir(path.dirname(packageDir));
      await fs.symlink(PROJECT_ROOT, packageDir, 'junction');

      for (const name of componentNames) {
        expect(await fs.pathExists(path.join(DIST_COMPONENTS_DIR, name, 'index.js'))).toBe(true);
        expect(await fs.pathExists(path.join(DIST_COMPONENTS_DIR, name, 'index.d.ts'))).toBe(true);

        const resolverPath = path.join(tmpDir, `${name}.mjs`);
        await fs.writeFile(
          resolverPath,
          `const resolved = import.meta.resolve('zebkit/components/${name}');\n` +
            `if (!resolved.endsWith('/dist/components/${name}/index.js')) process.exit(1);\n`
        );
        await execFileAsync(process.execPath, [resolverPath], { cwd: tmpDir });
      }
    } finally {
      await fs.remove(tmpDir);
    }
  });
});
