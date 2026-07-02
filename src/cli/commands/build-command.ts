import type { RunTokenBuildOptions } from '../../scripts/tokens/build-tokens.js';

export interface BuildCommandOptions {
  /** Path to an explicit config file (`-c/--config`). */
  config?: string;
  /** Base preset override for this build (`--theme`). */
  theme?: string;
  /** Destination directory override for this build (`--dest`). */
  dest?: string;
}

export interface BuildCommandDeps {
  getZebkitPackageRoot: () => string;
  getZebkitDefaultsDir: () => string;
  handlePromptCancel: (commandName: string) => void;
  isPromptCancelError: (error: unknown) => error is { name: string };
  runTokenBuild: (options: RunTokenBuildOptions) => Promise<void>;
}

export async function runBuildCommand(
  deps: BuildCommandDeps,
  options: BuildCommandOptions = {}
) {
  try {
    const zebkitPackageRoot = deps.getZebkitPackageRoot();
    const tokenDefaultsDir = deps.getZebkitDefaultsDir();

    await deps.runTokenBuild({
      zebkitPackageRoot,
      tokenDefaultsDir,
      configPath: options.config,
      cliOverrides: {
        basePreset: options.theme,
        destinationPath: options.dest,
      },
    });
  } catch (error) {
    if (deps.isPromptCancelError(error)) {
      deps.handlePromptCancel('Build');
      return;
    }

    throw error;
  }
}
