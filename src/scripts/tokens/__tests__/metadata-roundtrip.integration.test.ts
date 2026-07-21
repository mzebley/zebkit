/**
 * @jest-environment node
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

describe('DTCG metadata round trip', () => {
  jest.setTimeout(120000);

  it('preserves root and collision-prone nested metadata through export, pull, and rebuild', async () => {
    await expect(
      execFileAsync(process.execPath, ['--import', 'tsx', 'scripts/check-metadata-roundtrip.ts'], {
        cwd: process.cwd(),
        env: { ...process.env, CI: 'true', FORCE_COLOR: '0' },
      })
    ).resolves.toMatchObject({
      stdout: expect.stringContaining('metadata export, pull, and rebuild round trip OK'),
    });
  });
});
