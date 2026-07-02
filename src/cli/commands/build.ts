import { runTokenBuild } from '../../scripts/tokens/build-tokens.js';
import { getZebkitPackageRoot, getZebkitDefaultsDir } from '../resolve-package-root.js';
import { handlePromptCancel, isPromptCancelError } from '../prompt-cancel.js';
import { runBuildCommand } from './build-command';

export async function build() {
  try {
    await runBuildCommand({
      getZebkitPackageRoot,
      getZebkitDefaultsDir,
      handlePromptCancel,
      isPromptCancelError,
      runTokenBuild,
    });
  } catch {
    // Failure details were already printed where they occurred; make sure the
    // process reports it instead of exiting 0.
    process.exitCode = 1;
  }
}
