/**
 * @jest-environment node
 */

import {
  runOverlayDelete,
  runOverlayEdit,
  runOverlayList,
  runOverlayNew,
  type OverlayThemeCommandDeps,
} from './overlay-theme-command';

describe('overlay-theme command', () => {
  const mockReadConfig = jest.fn();
  const mockWriteConfig = jest.fn();
  const mockPrompt = jest.fn();
  const mockPathExists = jest.fn();
  const mockEnsureDir = jest.fn();
  const mockReadJson = jest.fn();
  const mockWriteJson = jest.fn();
  const mockRemove = jest.fn();
  const mockHandlePromptCancel = jest.fn();
  const mockIsPromptCancelError = jest.fn(() => false);
  const mockLog = jest.fn();

  const createDeps = (): OverlayThemeCommandDeps => ({
    readConfig: mockReadConfig,
    writeConfig: mockWriteConfig as OverlayThemeCommandDeps['writeConfig'],
    prompt: ((q: unknown) => mockPrompt(q)) as OverlayThemeCommandDeps['prompt'],
    pathExists: mockPathExists as OverlayThemeCommandDeps['pathExists'],
    ensureDir: mockEnsureDir as OverlayThemeCommandDeps['ensureDir'],
    readJson: mockReadJson as OverlayThemeCommandDeps['readJson'],
    writeJson: mockWriteJson as OverlayThemeCommandDeps['writeJson'],
    remove: mockRemove as OverlayThemeCommandDeps['remove'],
    getZebkitPackageRoot: () => '/pkg',
    getZebkitDefaultsDir: () => '/pkg/dist/cli/defaults',
    resolveBundledThemeTokensDir: () => '/pkg/dist/cli/defaults',
    handlePromptCancel: mockHandlePromptCancel,
    isPromptCancelError: ((e: unknown) =>
      mockIsPromptCancelError()) as OverlayThemeCommandDeps['isPromptCancelError'],
    log: mockLog,
  });

  beforeEach(() => jest.clearAllMocks());

  it('errors when no config exists', async () => {
    mockReadConfig.mockResolvedValue(undefined);
    await expect(runOverlayList(createDeps())).rejects.toThrow(/Run `zebkit init` first/);
  });

  it('lists configured overlays', async () => {
    mockReadConfig.mockResolvedValue({
      config: { tokens: { overlays: [{ themeName: 'dark', tokenPath: './dark' }] } },
      path: '/proj/zebkit.config.json',
    });
    await runOverlayList(createDeps());
    expect(mockLog).toHaveBeenCalledWith('Overlay themes:');
    expect(mockLog).toHaveBeenCalledWith(
      '  - dark  (selector=[data-zbk-theme="dark"], tokenPath=./dark)'
    );
  });

  it('creates an overlay, validates, writes config, and scaffolds selected token files', async () => {
    mockReadConfig.mockResolvedValue({
      config: { tokens: { basePreset: 'default' } },
      path: '/proj/zebkit.config.json',
    });
    // 1) field prompts, 2) scaffold file checkbox
    mockPrompt
      .mockResolvedValueOnce({
        themeName: 'dark',
        tokenPath: './dark',
        rootSelector: '',
        destinationPath: '',
        fontsStrategy: '',
      })
      .mockResolvedValueOnce({ files: ['zbk-color.json'] });
    mockPathExists.mockImplementation(async (p: string) => {
      if (p === '/pkg/dist/cli/defaults/manifest.json') return true;
      return false; // dest file does not exist yet
    });
    mockReadJson.mockImplementation(async (p: string) => {
      if (p === '/pkg/dist/cli/defaults/manifest.json') {
        return { modules: [{ key: 'zbk-color', file: 'zbk-color.json' }] };
      }
      if (p === '/pkg/dist/cli/defaults/zbk-color.json') {
        return { _key: 'zbk-color', _layer: 'core', primary: { value: '#000', type: 'color' } };
      }
      throw new Error(`Unexpected readJson: ${p}`);
    });

    await runOverlayNew(createDeps());

    expect(mockWriteConfig).toHaveBeenCalledWith('/proj/zebkit.config.json', {
      tokens: {
        basePreset: 'default',
        overlays: [{ themeName: 'dark', tokenPath: './dark' }],
      },
    });
    expect(mockEnsureDir).toHaveBeenCalledWith('/proj/dark');
    expect(mockWriteJson).toHaveBeenCalledWith(
      '/proj/dark/zbk-color.json',
      { 'zbk-color': { primary: { value: '#000', type: 'color' } } },
      { spaces: 2 }
    );
  });

  it('rejects a duplicate overlay themeName', async () => {
    mockReadConfig.mockResolvedValue({
      config: { tokens: { overlays: [{ themeName: 'dark', tokenPath: './dark' }] } },
      path: '/proj/zebkit.config.json',
    });
    mockPrompt.mockResolvedValueOnce({
      themeName: 'dark',
      tokenPath: './dark2',
      rootSelector: '',
      destinationPath: '',
      fontsStrategy: '',
    });

    await expect(runOverlayNew(createDeps())).rejects.toThrow(/duplicate overlay/);
    expect(mockWriteConfig).not.toHaveBeenCalled();
  });

  it('edits an existing overlay by name', async () => {
    mockReadConfig.mockResolvedValue({
      config: {
        tokens: { overlays: [{ themeName: 'dark', tokenPath: './dark' }] },
      },
      path: '/proj/zebkit.config.json',
    });
    mockPrompt.mockResolvedValueOnce({
      themeName: 'dark',
      tokenPath: './dark',
      rootSelector: '.theme-dark',
      destinationPath: '',
      fontsStrategy: 'preload',
    });

    await runOverlayEdit(createDeps(), 'dark');

    expect(mockWriteConfig).toHaveBeenCalledWith('/proj/zebkit.config.json', {
      tokens: {
        overlays: [
          {
            themeName: 'dark',
            tokenPath: './dark',
            rootSelector: '.theme-dark',
            fonts: { strategy: 'preload' },
          },
        ],
      },
    });
  });

  it('deletes an overlay from config and optionally removes its files', async () => {
    mockReadConfig.mockResolvedValue({
      config: {
        tokens: {
          overlays: [
            { themeName: 'dark', tokenPath: './dark' },
            { themeName: 'hc', tokenPath: './hc' },
          ],
        },
      },
      path: '/proj/zebkit.config.json',
    });
    mockPrompt
      .mockResolvedValueOnce({ confirmDelete: true })
      .mockResolvedValueOnce({ deleteFiles: true });

    await runOverlayDelete(createDeps(), 'dark');

    expect(mockWriteConfig).toHaveBeenCalledWith('/proj/zebkit.config.json', {
      tokens: { overlays: [{ themeName: 'hc', tokenPath: './hc' }] },
    });
    expect(mockRemove).toHaveBeenCalledWith('/proj/dark');
  });

  it('does not remove files when the delete-files confirm is declined', async () => {
    mockReadConfig.mockResolvedValue({
      config: { tokens: { overlays: [{ themeName: 'dark', tokenPath: './dark' }] } },
      path: '/proj/zebkit.config.json',
    });
    mockPrompt
      .mockResolvedValueOnce({ confirmDelete: true })
      .mockResolvedValueOnce({ deleteFiles: false });

    await runOverlayDelete(createDeps(), 'dark');

    expect(mockWriteConfig).toHaveBeenCalledWith('/proj/zebkit.config.json', {
      tokens: { overlays: [] },
    });
    expect(mockRemove).not.toHaveBeenCalled();
  });

  it('handles prompt cancellation', async () => {
    mockReadConfig.mockResolvedValue({
      config: { tokens: {} },
      path: '/proj/zebkit.config.json',
    });
    mockPrompt.mockRejectedValueOnce({ name: 'ExitPromptError' });
    mockIsPromptCancelError.mockReturnValue(true);

    await runOverlayNew(createDeps());

    expect(mockHandlePromptCancel).toHaveBeenCalledWith('Overlay theme');
    expect(mockWriteConfig).not.toHaveBeenCalled();
  });
});
