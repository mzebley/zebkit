export interface BuildCommandDeps {
  getZebkitPackageRoot: () => string;
  getZebkitDefaultsDir: () => string;
  handlePromptCancel: (commandName: string) => void;
  isPromptCancelError: (error: unknown) => error is { name: string };
  runTokenBuild: (...args: any[]) => Promise<void>;
}

export async function runBuildCommand(deps: BuildCommandDeps) {
  try {
    const zebkitPackageRoot = deps.getZebkitPackageRoot();
    const tokenDefaultsDir = deps.getZebkitDefaultsDir();

    await deps.runTokenBuild(undefined, zebkitPackageRoot, tokenDefaultsDir);
  } catch (error) {
    if (deps.isPromptCancelError(error)) {
      deps.handlePromptCancel('Build');
      return;
    }

    throw error;
  }
}
