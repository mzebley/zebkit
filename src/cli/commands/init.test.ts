/**
 * @jest-environment node
 */

import { runInitCommand } from './init-command';
import type { InitCommandDeps } from './init-command';

describe('init command', () => {
  const cwdSpy = jest.spyOn(process, 'cwd').mockReturnValue('/workspace/project');
  const mockPrompt = jest.fn();
  const mockPathExists = jest.fn();
  const mockWriteJson = jest.fn();
  const mockReadJson = jest.fn();
  const mockEnsureDir = jest.fn();
  const mockGetZebkitDefaultsDir = jest.fn(() => '/pkg/dist/cli/defaults');
  const mockGetZebkitPackageRoot = jest.fn(() => '/pkg');
  const mockHandlePromptCancel = jest.fn();
  const mockIsPromptCancelError = jest.fn();
  const mockGetBuiltInThemeNames = jest.fn(async () => ['dynamowaves']);
  const mockGetThemePromptChoices = jest.fn((themes: string[]) => themes);
  const mockResolveBundledThemeTokensDir = jest.fn(() => '/pkg/dist/cli/presets/dynamowaves');

  const createDeps = (): InitCommandDeps => ({
    pathExists: mockPathExists as InitCommandDeps['pathExists'],
    writeJson: mockWriteJson as InitCommandDeps['writeJson'],
    readJson: mockReadJson as InitCommandDeps['readJson'],
    ensureDir: mockEnsureDir as InitCommandDeps['ensureDir'],
    prompt: ((questions: unknown) => mockPrompt(questions)) as InitCommandDeps['prompt'],
    getZebkitPackageRoot: mockGetZebkitPackageRoot,
    getZebkitDefaultsDir: mockGetZebkitDefaultsDir,
    getBuiltInThemeNames: mockGetBuiltInThemeNames,
    getThemePromptChoices: mockGetThemePromptChoices,
    resolveBundledThemeTokensDir: mockResolveBundledThemeTokensDir,
    handlePromptCancel: mockHandlePromptCancel,
    isPromptCancelError: ((error: unknown) =>
      mockIsPromptCancelError(error)) as InitCommandDeps['isPromptCancelError'],
  });

  beforeEach(() => {
    jest.clearAllMocks();
    cwdSpy.mockReturnValue('/workspace/project');
  });

  afterAll(() => {
    cwdSpy.mockRestore();
  });

  it('writes config and copies token files when requested', async () => {
    mockPathExists.mockImplementation(async (target: string) => {
      if (target === '/workspace/project/zebkit.config.json') return false;
      if (target === '/pkg/dist/cli/presets/dynamowaves/manifest.json') return true;
      return false;
    });
    mockPrompt.mockResolvedValueOnce({
      destinationPath: './dist',
      assetFilePath: '/',
      theme: 'dynamowaves',
      projectName: 'my-app',
      copyTokens: true,
    });
    mockReadJson.mockImplementation(async (target: string) => {
      if (target === '/pkg/dist/cli/presets/dynamowaves/manifest.json') {
        return { modules: [{ key: 'zbk-button', file: 'zbk-button.tokens.json' }] };
      }
      if (target === '/pkg/dist/cli/presets/dynamowaves/zbk-button.tokens.json') {
        return {
          _key: 'zbk-button',
          _layer: 'components',
          canvas: { value: '#fff', type: 'color' },
        };
      }
      throw new Error(`Unexpected readJson target: ${target}`);
    });
    mockIsPromptCancelError.mockReturnValue(false);

    await runInitCommand(createDeps());

    expect(mockEnsureDir).toHaveBeenCalledWith('/workspace/project/tokens');
    expect(mockWriteJson).toHaveBeenCalledWith(
      '/workspace/project/tokens/zbk-button.tokens.json',
      {
        'zbk-button': {
          canvas: { value: '#fff', type: 'color' },
        },
      },
      { spaces: 2 }
    );
    expect(mockWriteJson).toHaveBeenCalledWith(
      '/workspace/project/zebkit.config.json',
      {
        tokens: {
          destinationPath: './dist',
          assetFilePath: '/',
          theme: 'dynamowaves',
          customThemeName: 'my-app',
          customTokenPath: './tokens',
        },
      },
      { spaces: 2 }
    );
  });

  it('stops when overwrite is declined', async () => {
    mockPathExists.mockResolvedValue(true);
    mockPrompt.mockResolvedValueOnce({ overwrite: false });
    mockIsPromptCancelError.mockReturnValue(false);

    await runInitCommand(createDeps());

    expect(mockWriteJson).not.toHaveBeenCalled();
  });

  it('handles prompt cancellation', async () => {
    const error = { name: 'ExitPromptError' };
    mockPathExists.mockResolvedValue(false);
    mockPrompt.mockRejectedValueOnce(error);
    mockIsPromptCancelError.mockReturnValue(true);

    await runInitCommand(createDeps());

    expect(mockHandlePromptCancel).toHaveBeenCalledWith('Init');
  });
});
