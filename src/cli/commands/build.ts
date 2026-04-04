import { runTokenBuild } from '../../scripts/tokens/build-tokens.js';
import { getZebkitPackageRoot, getZebkitDefaultsDir } from '../resolve-package-root.js';
import { handlePromptCancel, isPromptCancelError } from '../prompt-cancel.js';

export async function build() {
  try {
    const zebkitPackageRoot = getZebkitPackageRoot();
    const tokenDefaultsDir = getZebkitDefaultsDir();

    await runTokenBuild(undefined, zebkitPackageRoot, tokenDefaultsDir);
  } catch (error) {
    if (isPromptCancelError(error)) {
      handlePromptCancel('Build');
      return;
    }

    throw error;
  }
}
