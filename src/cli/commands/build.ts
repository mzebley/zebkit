import { runTokenBuild } from '../../scripts/tokens/build-tokens.js';
import { getZebkitPackageRoot, getZebkitDefaultsDir } from '../resolve-package-root.js';

export async function build() {
  const zebkitPackageRoot = getZebkitPackageRoot();
  const tokenDefaultsDir = getZebkitDefaultsDir();

  await runTokenBuild(undefined, zebkitPackageRoot, tokenDefaultsDir);
}
