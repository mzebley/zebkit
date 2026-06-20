/**
 * @jest-environment node
 */

import {
  runConfigGet,
  runConfigGuided,
  runConfigSet,
  type ConfigCommandDeps,
} from './config-command';

describe('config command', () => {
  const mockReadConfig = jest.fn();
  const mockWriteConfig = jest.fn();
  const mockPrompt = jest.fn();
  const mockLog = jest.fn();
  const mockGetBuiltInThemeNames = jest.fn(async () => ['dark']);
  const mockGetThemePromptChoices = jest.fn((names: string[]) => ['default', ...names]);
  const mockHandlePromptCancel = jest.fn();
  const mockIsPromptCancelError = jest.fn(() => false);

  const createDeps = (): ConfigCommandDeps => ({
    readConfig: mockReadConfig,
    writeConfig: mockWriteConfig as ConfigCommandDeps['writeConfig'],
    prompt: ((q: unknown) => mockPrompt(q)) as ConfigCommandDeps['prompt'],
    getZebkitPackageRoot: () => '/pkg',
    getBuiltInThemeNames: mockGetBuiltInThemeNames,
    getThemePromptChoices: mockGetThemePromptChoices,
    handlePromptCancel: mockHandlePromptCancel,
    isPromptCancelError: ((e: unknown) =>
      mockIsPromptCancelError()) as ConfigCommandDeps['isPromptCancelError'],
    log: mockLog,
  });

  beforeEach(() => jest.clearAllMocks());

  describe('runConfigSet', () => {
    it('parses and writes a single value', async () => {
      mockReadConfig.mockResolvedValue({
        config: { tokens: { destinationPath: './dist' } },
        path: '/proj/zebkit.config.json',
      });

      await runConfigSet(createDeps(), 'tokens.fonts.strategy', 'preload');

      expect(mockWriteConfig).toHaveBeenCalledWith('/proj/zebkit.config.json', {
        tokens: { destinationPath: './dist', fonts: { strategy: 'preload' } },
      });
      expect(mockLog).toHaveBeenCalledWith('Set tokens.fonts.strategy = "preload"');
    });

    it('coerces booleans for confirm-backed paths', async () => {
      mockReadConfig.mockResolvedValue({
        config: { tokens: {} },
        path: '/proj/zebkit.config.json',
      });

      await runConfigSet(createDeps(), 'tokens.exportTokens', 'true');

      expect(mockWriteConfig).toHaveBeenCalledWith('/proj/zebkit.config.json', {
        tokens: { exportTokens: true },
      });
    });

    it('rejects an unknown path before reading config', async () => {
      await expect(
        runConfigSet(createDeps(), 'tokens.nope', 'x')
      ).rejects.toThrow(/Unknown config path/);
      expect(mockReadConfig).not.toHaveBeenCalled();
      expect(mockWriteConfig).not.toHaveBeenCalled();
    });

    it('rejects an invalid enum value', async () => {
      await expect(
        runConfigSet(createDeps(), 'tokens.fonts.strategy', 'bogus')
      ).rejects.toThrow(/Expected one of/);
      expect(mockWriteConfig).not.toHaveBeenCalled();
    });

    it('errors when no config exists', async () => {
      mockReadConfig.mockResolvedValue(undefined);
      await expect(
        runConfigSet(createDeps(), 'tokens.fonts.strategy', 'preload')
      ).rejects.toThrow(/Run `zebkit init` first/);
    });
  });

  describe('runConfigGet', () => {
    it('prints a set value', async () => {
      mockReadConfig.mockResolvedValue({
        config: { tokens: { fonts: { strategy: 'manual' } } },
        path: '/proj/zebkit.config.json',
      });
      await runConfigGet(createDeps(), 'tokens.fonts.strategy');
      expect(mockLog).toHaveBeenCalledWith('"manual"');
    });

    it('reports an unset value', async () => {
      mockReadConfig.mockResolvedValue({
        config: { tokens: {} },
        path: '/proj/zebkit.config.json',
      });
      await runConfigGet(createDeps(), 'tokens.splitMode');
      expect(mockLog).toHaveBeenCalledWith('tokens.splitMode is not set');
    });

    it('rejects an unknown path', async () => {
      await expect(runConfigGet(createDeps(), 'bad.path')).rejects.toThrow(
        /Unknown config path/
      );
    });
  });

  describe('runConfigGuided', () => {
    it('merges answers into existing config without losing untouched values', async () => {
      mockReadConfig.mockResolvedValue({
        config: {
          tokens: {
            destinationPath: './dist',
            assetFilePath: '/',
            basePreset: 'default',
            themeName: 'app',
            tokenPath: './tokens',
            fonts: { strategy: 'import' },
            splitMode: 'combined',
          },
        },
        path: '/proj/zebkit.config.json',
      });
      // Single prompt call (standard tier + gate); decline advanced.
      mockPrompt.mockResolvedValueOnce({
        destinationPath: './dist',
        assetFilePath: '/',
        basePreset: 'default',
        themeName: 'app',
        fontsStrategy: 'preload',
        colors: 'all',
        typeScaleFluid: true,
        spaceScaleFluid: true,
        splitMode: 'combined',
        configureAdvanced: false,
      });

      await runConfigGuided(createDeps());

      const [, written] = mockWriteConfig.mock.calls[0];
      expect(written.tokens.fonts.strategy).toBe('preload');
      // untouched structural value preserved
      expect(written.tokens.tokenPath).toBe('./tokens');
      // inverted answer mapped back
      expect(written.tokens.typeScale.static).toBe(false);
    });

    it('handles prompt cancellation', async () => {
      mockReadConfig.mockResolvedValue({
        config: { tokens: {} },
        path: '/proj/zebkit.config.json',
      });
      mockPrompt.mockRejectedValueOnce({ name: 'ExitPromptError' });
      mockIsPromptCancelError.mockReturnValue(true);

      await runConfigGuided(createDeps());

      expect(mockHandlePromptCancel).toHaveBeenCalledWith('Config');
      expect(mockWriteConfig).not.toHaveBeenCalled();
    });
  });
});
