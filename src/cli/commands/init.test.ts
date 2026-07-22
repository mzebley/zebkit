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
  const mockReaddir = jest.fn(async (_target?: string) => [] as string[]);
  const mockCopyFile = jest.fn();
  const mockRemove = jest.fn();
  const mockReadFile = jest.fn(async () => '');
  const mockWriteFile = jest.fn();
  const mockGetZebkitDefaultsDir = jest.fn(() => '/pkg/dist/cli/defaults');
  const mockGetZebkitPackageRoot = jest.fn(() => '/pkg');
  const mockGetZebkitContextDir = jest.fn(() => '/pkg/dist/cli/context');
  const mockHandlePromptCancel = jest.fn();
  const mockIsPromptCancelError = jest.fn();
  const mockGetBuiltInThemeNames = jest.fn(async () => ['dynamowaves']);
  const mockGetThemePromptChoices = jest.fn((themes: string[]) => themes);
  const mockGetKnownComponents = jest.fn(async () => ['button', 'tooltip']);
  const mockResolveBundledThemeTokensDir = jest.fn(() => '/pkg/dist/cli/presets/dynamowaves');

  const mockReadJsonSafe = jest.fn(async () => undefined);

  const createDeps = (): InitCommandDeps => ({
    pathExists: mockPathExists as InitCommandDeps['pathExists'],
    writeJson: mockWriteJson as InitCommandDeps['writeJson'],
    readJson: mockReadJson as InitCommandDeps['readJson'],
    readJsonSafe: mockReadJsonSafe as InitCommandDeps['readJsonSafe'],
    ensureDir: mockEnsureDir as InitCommandDeps['ensureDir'],
    readdir: mockReaddir as InitCommandDeps['readdir'],
    copyFile: mockCopyFile as InitCommandDeps['copyFile'],
    remove: mockRemove as InitCommandDeps['remove'],
    readFile: mockReadFile as InitCommandDeps['readFile'],
    writeFile: mockWriteFile as InitCommandDeps['writeFile'],
    prompt: ((questions: unknown) => mockPrompt(questions)) as InitCommandDeps['prompt'],
    getZebkitPackageRoot: mockGetZebkitPackageRoot,
    getZebkitDefaultsDir: mockGetZebkitDefaultsDir,
    getZebkitContextDir: mockGetZebkitContextDir,
    getBuiltInThemeNames: mockGetBuiltInThemeNames,
    getThemePromptChoices: mockGetThemePromptChoices,
    getKnownComponents: mockGetKnownComponents,
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
      return { modules: [{ key: 'zbk-button', file: 'zbk-button.json' }] };
    }
    if (target === '/pkg/dist/cli/presets/dynamowaves/zbk-button.json') {
      return {
        $extensions: { 'dev.zebkit': { layer: 'components' } },
        canvas: { $value: '#fff', $type: 'color' },
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
      {
        canvas: { $value: '#fff', $type: 'color' },
      },
      { spaces: 2 }
    );

    const written = findWrittenConfig();
    expect(written.configVersion).toBe(1);
    expect(written.$schema).toBe(
      './node_modules/zebkit/dist/editor/schemas/zebkit.config.schema.json'
    );
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
    expect(mockWriteJson).toHaveBeenCalledWith(
      '/workspace/project/.zebkit/pull-state.json',
      expect.objectContaining({
        stateVersion: 2,
        basePreset: 'dynamowaves',
        modules: expect.objectContaining({
          'zbk-button': expect.objectContaining({ file: 'zbk-button.tokens.json' }),
        }),
      }),
      { spaces: 2 }
    );
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

  it('copies agent context and records context.path when accepted (full mode)', async () => {
    mockPathExists.mockImplementation(async (target: string) => {
      if (target === '/workspace/project/zebkit.config.json') return false;
      if (target === '/pkg/dist/cli/context') return true;
      return false;
    });
    mockReaddir.mockImplementation(async (target?: string) =>
      target === '/pkg/dist/cli/context'
        ? ['llms.txt', 'utilities-spacing.md', 'llms-full.txt', 'zbk-button.md', 'zbk-tooltip.md']
        : ['llms-full.txt', 'utilities-border.md', 'project-notes.md']
    );
    mockReadFile.mockResolvedValue('# Index\n\n- [zbk-button](zbk-button.md): Button.\n- [zbk-tooltip](zbk-tooltip.md): Tooltip.\n');
    mockPrompt.mockResolvedValueOnce({
      destinationPath: './dist',
      assetFilePath: '/',
      basePreset: 'dynamowaves',
      themeName: 'my-app',
      copyTokens: false,
      copyContext: true,
      configureAdvanced: false,
    });
    mockReadJson.mockImplementation(async (target: string) => tokenReadJson(target));
    mockIsPromptCancelError.mockReturnValue(false);

    await runInitCommand(createDeps());

    const written = findWrittenConfig();
    expect(written.context).toEqual({ path: './zebkit/context' });
    expect(mockEnsureDir).toHaveBeenCalledWith('/workspace/project/zebkit/context');
    expect(mockWriteFile).toHaveBeenCalledWith(
      '/workspace/project/zebkit/context/llms.txt',
      '# Index\n\n- [zbk-button](zbk-button.md): Button.\n- [zbk-tooltip](zbk-tooltip.md): Tooltip.\n'
    );
    expect(mockCopyFile).toHaveBeenCalledWith(
      '/pkg/dist/cli/context/zbk-button.md',
      '/workspace/project/zebkit/context/zbk-button.md'
    );
    expect(mockCopyFile).toHaveBeenCalledWith(
      '/pkg/dist/cli/context/utilities-spacing.md',
      '/workspace/project/zebkit/context/utilities-spacing.md'
    );
    expect(mockCopyFile).not.toHaveBeenCalledWith(
      '/pkg/dist/cli/context/llms-full.txt',
      '/workspace/project/zebkit/context/llms-full.txt'
    );
    expect(mockRemove).toHaveBeenCalledWith('/workspace/project/zebkit/context/llms-full.txt');
    expect(mockRemove).toHaveBeenCalledWith('/workspace/project/zebkit/context/utilities-border.md');
    expect(mockRemove).not.toHaveBeenCalledWith('/workspace/project/zebkit/context/project-notes.md');
  });

  it('does not copy context or set context.path when declined (full mode)', async () => {
    mockPathExists.mockImplementation(async (target: string) => {
      if (target === '/workspace/project/zebkit.config.json') return false;
      return false;
    });
    mockPrompt.mockResolvedValueOnce({
      destinationPath: './dist',
      assetFilePath: '/',
      basePreset: 'dynamowaves',
      themeName: 'my-app',
      copyTokens: false,
      copyContext: false,
      configureAdvanced: false,
    });
    mockReadJson.mockImplementation(async (target: string) => tokenReadJson(target));
    mockIsPromptCancelError.mockReturnValue(false);

    await runInitCommand(createDeps());

    const written = findWrittenConfig();
    expect(written.context).toBeUndefined();
    expect(mockCopyFile).not.toHaveBeenCalled();
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
            fileMatch: ['/tokens/zbk-button.tokens.json'],
            url: './node_modules/zebkit/dist/editor/schemas/zbk-button.schema.json',
          },
          {
            fileMatch: ['/tokens/zbk-app.tokens.json'],
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
            fileMatch: ['/tokens/zbk-button.tokens.json'],
            url: './node_modules/zebkit/dist/editor/schemas/zbk-button.schema.json',
          },
          {
            fileMatch: ['/tokens/zbk-app.tokens.json'],
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
          fileMatch: ['/tokens/zbk-button.tokens.json'],
          url: './node_modules/zebkit/dist/editor/schemas/zbk-button.schema.json',
        },
        {
          fileMatch: ['/tokens/zbk-app.tokens.json'],
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
            fileMatch: ['/tokens/zbk-button.tokens.json'],
            url: './node_modules/zebkit/dist/editor/schemas/zbk-button.schema.json',
          },
          {
            fileMatch: ['/tokens/zbk-app.tokens.json'],
            url: './node_modules/zebkit/dist/editor/schemas/zbk-app.schema.json',
          },
        ],
        'css.customData': ['./node_modules/zebkit/dist/editor/zebkit.css-data.json'],
      },
      { spaces: 2 }
    );
  });

  it('keeps repository-local schemas instead of adding broken self-package URLs', async () => {
    const repositorySchemas = mockModules.map((module) => ({
        fileMatch: [`/theme/**/${module.key}.tokens.json`],
        url: `./schemas/tokens/${module.key}.schema.json`,
      }));
    mockReadJsonSafe.mockResolvedValue({
      'json.schemas': repositorySchemas,
      'css.customData': ['./node_modules/zebkit/dist/editor/zebkit.css-data.json'],
    });

    await writeVscodeSettings('/project', './theme/zebkit-docs', mockModules, createVscodeDeps());

    expect(mockWriteJson).toHaveBeenCalledWith(
      '/project/.vscode/settings.json',
      { 'json.schemas': repositorySchemas },
      { spaces: 2 }
    );
  });
});
