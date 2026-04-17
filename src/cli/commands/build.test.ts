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

    expect(mockRunTokenBuild).toHaveBeenCalledWith(undefined, '/pkg', '/pkg/dist/cli/defaults');
    expect(mockHandlePromptCancel).not.toHaveBeenCalled();
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
