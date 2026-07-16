/**
 * @jest-environment node
 */

import { runPullCommand } from './pull-command';
import type { PullCommandDeps } from './pull-command';

describe('pull command', () => {
  const mockPathExists = jest.fn();
  const mockReadJson = jest.fn();
  const mockReadJsonSafe = jest.fn();
  const mockWriteJson = jest.fn();
  const mockEnsureDir = jest.fn();
  const mockReadConfig = jest.fn();
  const mockReaddir = jest.fn();
  const mockCopyFile = jest.fn();
  const mockGetZebkitDefaultsDir = jest.fn(() => '/pkg/dist/cli/defaults');
  const mockGetZebkitPackageRoot = jest.fn(() => '/pkg');
  const mockGetZebkitContextDir = jest.fn(() => '/pkg/dist/cli/context');
  // Mirrors the real resolver: default -> defaults dir, presets -> bundled preset dir.
  const mockResolveBundledThemeTokensDir = jest.fn(
    (themeName: string, defaultsDir: string, packageRoot: string) =>
      themeName === 'default'
        ? defaultsDir
        : `${packageRoot}/dist/cli/presets/${themeName}`
  );
  const mockLog = jest.fn();

  const createDeps = (): PullCommandDeps => ({
    pathExists: mockPathExists as PullCommandDeps['pathExists'],
    readJson: mockReadJson as PullCommandDeps['readJson'],
    readJsonSafe: mockReadJsonSafe as PullCommandDeps['readJsonSafe'],
    writeJson: mockWriteJson as PullCommandDeps['writeJson'],
    ensureDir: mockEnsureDir as PullCommandDeps['ensureDir'],
    readdir: mockReaddir as PullCommandDeps['readdir'],
    copyFile: mockCopyFile as PullCommandDeps['copyFile'],
    readConfig: mockReadConfig as PullCommandDeps['readConfig'],
    getZebkitDefaultsDir: mockGetZebkitDefaultsDir,
    getZebkitPackageRoot: mockGetZebkitPackageRoot,
    getZebkitContextDir: mockGetZebkitContextDir,
    resolveBundledThemeTokensDir: mockResolveBundledThemeTokensDir,
    log: mockLog,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockReadConfig.mockResolvedValue({
      config: { tokens: { tokenPath: './tokens' } },
      path: '/workspace/project/zebkit.config.json',
    });
    mockGetZebkitDefaultsDir.mockReturnValue('/pkg/dist/cli/defaults');
    mockGetZebkitContextDir.mockReturnValue('/pkg/dist/cli/context');
  });

  it('writes VS Code settings after syncing new token files', async () => {
    mockPathExists.mockImplementation(async (target: string) => {
      if (target === '/pkg/dist/cli/defaults/manifest.json') return true;
      if (target === '/workspace/project/tokens/zbk-button.json') return false;
      return false;
    });

    mockReadJson.mockImplementation(async (target: string) => {
      if (target === '/pkg/dist/cli/defaults/manifest.json') {
        return { modules: [{ key: 'zbk-button', file: 'zbk-button.json' }] };
      }
      if (target === '/pkg/dist/cli/defaults/zbk-button.json') {
        return {
          _key: 'zbk-button',
          _layer: 'base',
          canvas: { value: '#fff', type: 'color', description: 'Background.' },
        };
      }
      throw new Error(`Unexpected readJson target: ${target}`);
    });

    mockReadJsonSafe.mockResolvedValue(undefined);

    await runPullCommand(createDeps());

    expect(mockEnsureDir).toHaveBeenCalledWith('/workspace/project/tokens');
    expect(mockWriteJson).toHaveBeenCalledWith(
      '/workspace/project/tokens/zbk-button.json',
      {
        'zbk-button': {
          canvas: { value: '#fff', type: 'color', description: 'Background.' },
        },
      },
      { spaces: 2 }
    );

    expect(mockWriteJson).toHaveBeenCalledWith(
      '/workspace/project/.vscode/settings.json',
      {
        'json.schemas': [
          {
            fileMatch: ['/tokens/zbk-button.json'],
            url: './node_modules/zebkit/dist/editor/schemas/zbk-button.schema.json',
          },
        ],
        'css.customData': ['./node_modules/zebkit/dist/editor/zebkit.css-data.json'],
      },
      { spaces: 2 }
    );

    expect(mockLog).toHaveBeenCalledWith('Updated .vscode/settings.json for editor support');
  });

  it('writes VS Code settings even when already up to date', async () => {
    mockPathExists.mockImplementation(async (target: string) => {
      if (target === '/pkg/dist/cli/defaults/manifest.json') return true;
      if (target === '/workspace/project/tokens/zbk-button.json') return true;
      return false;
    });

    mockReadJson.mockImplementation(async (target: string) => {
      if (target === '/pkg/dist/cli/defaults/manifest.json') {
        return { modules: [{ key: 'zbk-button', file: 'zbk-button.json' }] };
      }
      if (target === '/pkg/dist/cli/defaults/zbk-button.json') {
        return {
          _key: 'zbk-button',
          _layer: 'base',
          canvas: { value: '#fff', type: 'color', description: 'Background.' },
        };
      }
      if (target === '/workspace/project/tokens/zbk-button.json') {
        return {
          'zbk-button': {
            canvas: { value: '#fff', type: 'color', description: 'Background.' },
          },
        };
      }
      throw new Error(`Unexpected readJson target: ${target}`);
    });

    mockReadJsonSafe.mockResolvedValue(undefined);

    await runPullCommand(createDeps());

    expect(mockLog).toHaveBeenCalledWith('Already up to date.');

    expect(mockWriteJson).toHaveBeenCalledWith(
      '/workspace/project/.vscode/settings.json',
      {
        'json.schemas': [
          {
            fileMatch: ['/tokens/zbk-button.json'],
            url: './node_modules/zebkit/dist/editor/schemas/zbk-button.schema.json',
          },
        ],
        'css.customData': ['./node_modules/zebkit/dist/editor/zebkit.css-data.json'],
      },
      { spaces: 2 }
    );

    expect(mockLog).toHaveBeenCalledWith('Updated .vscode/settings.json for editor support');
  });

  it('writes VS Code settings after merging updated token files', async () => {
    mockPathExists.mockImplementation(async (target: string) => {
      if (target === '/pkg/dist/cli/defaults/manifest.json') return true;
      if (target === '/workspace/project/tokens/zbk-button.json') return true;
      return false;
    });

    mockReadJson.mockImplementation(async (target: string) => {
      if (target === '/pkg/dist/cli/defaults/manifest.json') {
        return { modules: [{ key: 'zbk-button', file: 'zbk-button.json' }] };
      }
      if (target === '/pkg/dist/cli/defaults/zbk-button.json') {
        return {
          _key: 'zbk-button',
          _layer: 'base',
          canvas: { value: '#fff', type: 'color', description: 'Background.' },
          newKey: { value: '#000', type: 'color', description: 'New key.' },
        };
      }
      if (target === '/workspace/project/tokens/zbk-button.json') {
        return {
          'zbk-button': {
            canvas: { value: '#fff', type: 'color', description: 'Background.' },
          },
        };
      }
      throw new Error(`Unexpected readJson target: ${target}`);
    });

    mockReadJsonSafe.mockResolvedValue(undefined);

    await runPullCommand(createDeps());

    expect(mockWriteJson).toHaveBeenCalledWith(
      '/workspace/project/tokens/zbk-button.json',
      {
        'zbk-button': {
          canvas: { value: '#fff', type: 'color', description: 'Background.' },
          newKey: { value: '#000', type: 'color', description: 'New key.' },
        },
      },
      { spaces: 2 }
    );

    expect(mockWriteJson).toHaveBeenCalledWith(
      '/workspace/project/.vscode/settings.json',
      {
        'json.schemas': [
          {
            fileMatch: ['/tokens/zbk-button.json'],
            url: './node_modules/zebkit/dist/editor/schemas/zbk-button.schema.json',
          },
        ],
        'css.customData': ['./node_modules/zebkit/dist/editor/zebkit.css-data.json'],
      },
      { spaces: 2 }
    );

    expect(mockLog).toHaveBeenCalledWith('Updated .vscode/settings.json for editor support');
  });

  it('pulls from the configured base preset snapshot, not the default theme', async () => {
    mockReadConfig.mockResolvedValue({
      config: { tokens: { tokenPath: './tokens', basePreset: 'dusk' } },
      path: '/workspace/project/zebkit.config.json',
    });

    const presetDir = '/pkg/dist/cli/presets/dusk';
    mockPathExists.mockImplementation(async (target: string) => {
      if (target === `${presetDir}/manifest.json`) return true;
      return false;
    });

    mockReadJson.mockImplementation(async (target: string) => {
      if (target === `${presetDir}/manifest.json`) {
        return { modules: [{ key: 'zbk-button', file: 'zbk-button.json' }] };
      }
      if (target === `${presetDir}/zbk-button.json`) {
        return {
          _key: 'zbk-button',
          _layer: 'base',
          canvas: { value: '#123', type: 'color', description: 'Preset background.' },
        };
      }
      throw new Error(`Unexpected readJson target: ${target}`);
    });

    mockReadJsonSafe.mockResolvedValue(undefined);

    await runPullCommand(createDeps());

    // The new file carries the PRESET value, not the default theme's.
    expect(mockWriteJson).toHaveBeenCalledWith(
      '/workspace/project/tokens/zbk-button.json',
      {
        'zbk-button': {
          canvas: { value: '#123', type: 'color', description: 'Preset background.' },
        },
      },
      { spaces: 2 }
    );
  });

  it('returns with guidance (exit 0) when no tokenPath is configured', async () => {
    mockReadConfig.mockResolvedValue({
      config: { tokens: {} },
      path: '/workspace/project/zebkit.config.json',
    });

    await runPullCommand(createDeps());

    expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('No tokenPath set in config'));
    expect(mockWriteJson).not.toHaveBeenCalled();
  });

  it('refreshes agent context when context.path is set, honoring excluded components', async () => {
    mockReadConfig.mockResolvedValue({
      config: {
        context: { path: './zebkit/context' },
        components: { checkbox: false },
      },
      path: '/workspace/project/zebkit.config.json',
    });
    mockPathExists.mockImplementation(async (target: string) => target === '/pkg/dist/cli/context');
    mockReaddir.mockResolvedValue([
      'llms.txt',
      'zbk-button.md',
      'zbk-checkbox.md',
    ]);

    await runPullCommand(createDeps());

    // llms.txt + button copied; excluded checkbox skipped.
    expect(mockEnsureDir).toHaveBeenCalledWith('/workspace/project/zebkit/context');
    expect(mockCopyFile).toHaveBeenCalledWith(
      '/pkg/dist/cli/context/llms.txt',
      '/workspace/project/zebkit/context/llms.txt'
    );
    expect(mockCopyFile).toHaveBeenCalledWith(
      '/pkg/dist/cli/context/zbk-button.md',
      '/workspace/project/zebkit/context/zbk-button.md'
    );
    expect(mockCopyFile).not.toHaveBeenCalledWith(
      '/pkg/dist/cli/context/zbk-checkbox.md',
      expect.anything()
    );
    expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('Refreshed 2 agent context files'));
  });

  it('does not touch context when context.path is unset (opted out)', async () => {
    mockReadConfig.mockResolvedValue({
      config: { tokens: {} },
      path: '/workspace/project/zebkit.config.json',
    });

    await runPullCommand(createDeps());

    expect(mockReaddir).not.toHaveBeenCalled();
    expect(mockCopyFile).not.toHaveBeenCalled();
  });
});
