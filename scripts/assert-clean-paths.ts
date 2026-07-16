import { execFileSync } from 'node:child_process';

const paths = process.argv.slice(2);
if (paths.length === 0) {
  throw new Error('assert-clean-paths requires at least one repository path.');
}

const status = execFileSync(
  'git',
  ['status', '--porcelain', '--untracked-files=all', '--', ...paths],
  { encoding: 'utf8' }
).trim();

if (status) {
  console.error(`Generated files are stale or untracked:\n${status}`);
  process.exitCode = 1;
}
