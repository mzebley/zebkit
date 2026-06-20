/**
 * @jest-environment node
 */

import { runInitCommand, writeVscodeSettings } from './init-command';
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

  const mockReadJsonSafe = jest.fn(async () => undefined);

  const createDeps = (): InitCommandDeps => ({
    pathExists: mockPathExists as InitCommandDeps['pathExists'],
    writeJson: mockWriteJson as InitCommandDeps['writeJson'],
    readJson: mockReadJson as InitCommandDeps['readJson'],
    readJsonSafe: mockReadJsonSafe as InitCommandDeps['readJsonSafe'],
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

  const tokenReadJson = (target: string) => {
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
    if (target === '/pkg/dist/cli/defaults/manifest.json') {
      return { modules: [{ key: 'zbk-button', file: 'zbk-button.json' }] };
    }
    throw new Error(`Unexpected readJson target: ${target}`);
  };

  const findWrittenConfig = () =>
    mockWriteJson.mock.calls.find(
      (c) => c[0] === '/workspace/project/zebkit.config.json'
    )?.[1];

  it('writes a complete config and copies token files (full mode)', async () => {
    mockPathExists.mockImplementation(async (target: string) => {
      if (target === '/workspace/project/zebkit.config.json') return false;
      if (target === '/pkg/dist/cli/presets/dynamowaves/manifest.json') return true;
      return false;
    });
    // Full mode asks quick + standard + copyTokens + advanced gate in one call.
    mockPrompt.mockResolvedValueOnce({
      destinationPath: './dist',
      assetFilePath: '/',
      basePreset: 'dynamowaves',
      themeName: 'my-app',
      fontsStrategy: 'preload',
      colors: 'smart',
      typeScaleFluid: true,
      spaceScaleFluid: true,
      splitMode: 'combined',
      copyTokens: true,
      configureAdvanced: false,
    });
    mockReadJson.mockImplementation(async (target: string) => tokenReadJson(target));
    mockIsPromptCancelError.mockReturnValue(false);

    await runInitCommand(createDeps());

    expect(mockEnsureDir).toHaveBeenCalledWith('/workspace/project/tokens');
    expect(mockWriteJson).toHaveBeenCalledWith(
      '/workspace/project/tokens/zbk-button.tokens.json',
      { 'zbk-button': { canvas: { value: '#fff', type: 'color' } } },
      { spaces: 2 }
    );

    const written = findWrittenConfig();
    // Quick answers captured.
    expect(written.tokens.destinationPath).toBe('./dist');
    expect(written.tokens.basePreset).toBe('dynamowaves');
    expect(written.tokens.themeName).toBe('my-app');
    expect(written.tokens.tokenPath).toBe('./tokens');
    // Standard answers captured (fluid:true -> static:false).
    expect(written.tokens.fonts.strategy).toBe('preload');
    expect(written.tokens.extendedTokens.colors).toBe('smart');
    expect(written.tokens.typeScale.static).toBe(false);
    // Advanced defaults still written (self-documenting), even though gate declined.
    expect(written.tokens.exportTokens).toBe(false);
    expect(written.tokens.outputFormats).toEqual(['JSON']);
    expect(written.tokens.extendedTokens.breakpoints).toBe(true);
  });

  it('asks only quick prompts but still writes a complete config (--quick)', async () => {
    mockPathExists.mockImplementation(async (target: string) => {
      if (target === '/workspace/project/zebkit.config.json') return false;
      if (target === '/pkg/dist/cli/presets/dynamowaves/manifest.json') return true;
      return false;
    });
    mockPrompt.mockResolvedValueOnce({
      destinationPath: './dist',
      assetFilePath: '/',
      basePreset: 'dynamowaves',
      themeName: 'my-app',
      copyTokens: false,
    });
    mockReadJson.mockImplementation(async (target: string) => tokenReadJson(target));
    mockIsPromptCancelError.mockReturnValue(false);

    await runInitCommand(createDeps(), { quick: true });

    // Only one prompt call, and it excludes standard fields + the advanced gate.
    expect(mockPrompt).toHaveBeenCalledTimes(1);
    const askedNames = mockPrompt.mock.calls[0][0].map((q: any) => q.name);
    expect(askedNames).toEqual([
      'destinationPath',
      'assetFilePath',
      'basePreset',
      'themeName',
      'copyTokens',
    ]);

    const written = findWrittenConfig();
    // Standard/advanced defaults are still written.
    expect(written.tokens.fonts.strategy).toBe('import');
    expect(written.tokens.extendedTokens.colors).toBe('all');
    expect(written.tokens.splitMode).toBe('combined');
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

describe('writeVscodeSettings', () => {
  const mockEnsureDir = jest.fn();
  const mockReadJsonSafe = jest.fn();
  const mockWriteJson = jest.fn();

  const mockModules = [
    { key: 'zbk-button', file: 'zbk-button.json' },
    { key: 'zbk-app', file: 'zbk-app.json' },
  ];

  const createVscodeDeps = () => ({
    ensureDir: mockEnsureDir,
    readJsonSafe: mockReadJsonSafe,
    writeJson: mockWriteJson,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates .vscode/settings.json when it does not exist', async () => {
    mockReadJsonSafe.mockResolvedValue(undefined);

    await writeVscodeSettings('/project', './tokens', mockModules, createVscodeDeps());

    expect(mockEnsureDir).toHaveBeenCalledWith('/project/.vscode');
    expect(mockWriteJson).toHaveBeenCalledWith(
      '/project/.vscode/settings.json',
      {
        'json.schemas': [
          {
            fileMatch: ['/tokens/zbk-button.json'],
            url: './node_modules/zebkit/dist/editor/schemas/zbk-button.schema.json',
          },
          {
            fileMatch: ['/tokens/zbk-app.json'],
            url: './node_modules/zebkit/dist/editor/schemas/zbk-app.schema.json',
          },
        ],
        'css.customData': ['./node_modules/zebkit/dist/editor/zebkit.css-data.json'],
      },
      { spaces: 2 }
    );
  });

  it('merges into existing .vscode/settings.json without overwriting unrelated keys', async () => {
    mockReadJsonSafe.mockResolvedValue({
      'editor.formatOnSave': true,
      'editor.defaultFormatter': 'prettier',
    });

    await writeVscodeSettings('/project', './tokens', mockModules, createVscodeDeps());

    expect(mockWriteJson).toHaveBeenCalledWith(
      '/project/.vscode/settings.json',
      {
        'editor.formatOnSave': true,
        'editor.defaultFormatter': 'prettier',
        'json.schemas': [
          {
            fileMatch: ['/tokens/zbk-button.json'],
            url: './node_modules/zebkit/dist/editor/schemas/zbk-button.schema.json',
          },
          {
            fileMatch: ['/tokens/zbk-app.json'],
            url: './node_modules/zebkit/dist/editor/schemas/zbk-app.schema.json',
          },
        ],
        'css.customData': ['./node_modules/zebkit/dist/editor/zebkit.css-data.json'],
      },
      { spaces: 2 }
    );
  });

  it('does not add duplicate zebkit entries if already present', async () => {
    mockReadJsonSafe.mockResolvedValue({
      'json.schemas': [
        {
          fileMatch: ['/tokens/zbk-button.json'],
          url: './node_modules/zebkit/dist/editor/schemas/zbk-button.schema.json',
        },
        {
          fileMatch: ['/tokens/zbk-app.json'],
          url: './node_modules/zebkit/dist/editor/schemas/zbk-app.schema.json',
        },
      ],
      'css.customData': ['./node_modules/zebkit/dist/editor/zebkit.css-data.json'],
    });

    await writeVscodeSettings('/project', './tokens', mockModules, createVscodeDeps());

    expect(mockWriteJson).toHaveBeenCalledWith(
      '/project/.vscode/settings.json',
      {
        'json.schemas': [
          {
            fileMatch: ['/tokens/zbk-button.json'],
            url: './node_modules/zebkit/dist/editor/schemas/zbk-button.schema.json',
          },
          {
            fileMatch: ['/tokens/zbk-app.json'],
            url: './node_modules/zebkit/dist/editor/schemas/zbk-app.schema.json',
          },
        ],
        'css.customData': ['./node_modules/zebkit/dist/editor/zebkit.css-data.json'],
      },
      { spaces: 2 }
    );
  });
});
