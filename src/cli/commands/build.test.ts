/**
 * @jest-environment node
 */

import { runBuildCommand } from './build-command';
import type { BuildCommandDeps } from './build-command';

describe('build command', () => {
  const mockRunTokenBuild = jest.fn();
  const mockGetZebkitPackageRoot = jest.fn(() => '/pkg');
  const mockGetZebkitDefaultsDir = jest.fn(() => '/pkg/dist/cli/defaults');
  const mockHandlePromptCancel = jest.fn();
  const mockIsPromptCancelError = jest.fn();

  const createDeps = (): BuildCommandDeps => ({
    getZebkitPackageRoot: mockGetZebkitPackageRoot,
    getZebkitDefaultsDir: mockGetZebkitDefaultsDir,
    handlePromptCancel: mockHandlePromptCancel,
    isPromptCancelError: ((error: unknown) =>
      mockIsPromptCancelError(error)) as BuildCommandDeps['isPromptCancelError'],
    runTokenBuild: mockRunTokenBuild as BuildCommandDeps['runTokenBuild'],
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('delegates to the token build with package paths', async () => {
    mockIsPromptCancelError.mockReturnValue(false);

    await runBuildCommand(createDeps());

    expect(mockRunTokenBuild).toHaveBeenCalledWith({
      zebkitPackageRoot: '/pkg',
      tokenDefaultsDir: '/pkg/dist/cli/defaults',
      configPath: undefined,
      cliOverrides: {
        basePreset: undefined,
        destinationPath: undefined,
        prune: undefined,
        pruneOut: undefined,
      },
    });
    expect(mockHandlePromptCancel).not.toHaveBeenCalled();
  });

  it('threads --config/--theme/--dest through to the token build', async () => {
    mockIsPromptCancelError.mockReturnValue(false);

    await runBuildCommand(createDeps(), {
      config: './custom.config.json',
      theme: 'dusk',
      dest: './out',
    });

    expect(mockRunTokenBuild).toHaveBeenCalledWith({
      zebkitPackageRoot: '/pkg',
      tokenDefaultsDir: '/pkg/dist/cli/defaults',
      configPath: './custom.config.json',
      cliOverrides: {
        basePreset: 'dusk',
        destinationPath: './out',
        prune: undefined,
        pruneOut: undefined,
      },
    });
  });

  it('threads --prune/--prune-out through to the token build', async () => {
    mockIsPromptCancelError.mockReturnValue(false);

    await runBuildCommand(createDeps(), { prune: true, pruneOut: './dist/zbk.pruned.min.css' });

    expect(mockRunTokenBuild).toHaveBeenCalledWith(
      expect.objectContaining({
        cliOverrides: expect.objectContaining({
          prune: true,
          pruneOut: './dist/zbk.pruned.min.css',
        }),
      })
    );
  });

  it('handles prompt cancellation without rethrowing', async () => {
    const error = { name: 'ExitPromptError' };
    mockRunTokenBuild.mockRejectedValueOnce(error);
    mockIsPromptCancelError.mockReturnValue(true);

    await runBuildCommand(createDeps());

    expect(mockHandlePromptCancel).toHaveBeenCalledWith('Build');
  });

  it('rethrows unexpected errors', async () => {
    const error = new Error('boom');
    mockRunTokenBuild.mockRejectedValueOnce(error);
    mockIsPromptCancelError.mockReturnValue(false);

    await expect(
      runBuildCommand(createDeps())
    ).rejects.toThrow('boom');
  });
});
