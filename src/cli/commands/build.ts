import { runTokenBuild } from '../../scripts/tokens/build-tokens.js';
import { getZebkitPackageRoot, getZebkitDefaultsDir } from '../resolve-package-root.js';
import { handlePromptCancel, isPromptCancelError } from '../prompt-cancel.js';
import { runBuildCommand } from './build-command';

export async function build() {
  return runBuildCommand({
    getZebkitPackageRoot,
    getZebkitDefaultsDir,
    handlePromptCancel,
    isPromptCancelError,
    runTokenBuild,
  });
}
