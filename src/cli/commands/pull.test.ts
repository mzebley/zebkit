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
  const mockRemove = jest.fn();
  const mockReadFile = jest.fn();
  const mockWriteFile = jest.fn();
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
    remove: mockRemove as PullCommandDeps['remove'],
    readFile: mockReadFile as PullCommandDeps['readFile'],
    writeFile: mockWriteFile as PullCommandDeps['writeFile'],
    readConfig: mockReadConfig as PullCommandDeps['readConfig'],
    getZebkitDefaultsDir: mockGetZebkitDefaultsDir,
    getZebkitPackageRoot: mockGetZebkitPackageRoot,
    getZebkitContextDir: mockGetZebkitContextDir,
    getProjectDir: () => '/workspace/project',
    resolveBundledThemeTokensDir: mockResolveBundledThemeTokensDir,
    log: mockLog,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockReaddir.mockResolvedValue([]);
    mockReadConfig.mockResolvedValue({
      config: { configVersion: 1, tokens: { tokenPath: './tokens' } },
      path: '/workspace/project/zebkit.config.json',
    });
    mockGetZebkitDefaultsDir.mockReturnValue('/pkg/dist/cli/defaults');
    mockGetZebkitContextDir.mockReturnValue('/pkg/dist/cli/context');
  });

  it('writes VS Code settings after syncing new token files', async () => {
    mockPathExists.mockImplementation(async (target: string) => {
      if (target === '/pkg/dist/cli/defaults/manifest.json') return true;
      if (target === '/workspace/project/tokens/zbk-button.tokens.json') return false;
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
          canvas: { $value: '#fff', $type: 'color', $description: 'Background.' },
        };
      }
      throw new Error(`Unexpected readJson target: ${target}`);
    });

    mockReadJsonSafe.mockResolvedValue(undefined);

    await runPullCommand(createDeps());

    expect(mockEnsureDir).toHaveBeenCalledWith('/workspace/project/tokens');
    expect(mockWriteJson).toHaveBeenCalledWith(
      '/workspace/project/tokens/zbk-button.tokens.json',
      {
        canvas: { $value: '#fff', $type: 'color', $description: 'Background.' },
      },
      { spaces: 2 }
    );

    expect(mockWriteJson).toHaveBeenCalledWith(
      '/workspace/project/.vscode/settings.json',
      {
        'json.schemas': [
          {
            fileMatch: ['/tokens/zbk-button.tokens.json'],
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
      if (target === '/workspace/project/tokens/zbk-button.tokens.json') return true;
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
          canvas: { $value: '#fff', $type: 'color', $description: 'Background.' },
        };
      }
      if (target === '/workspace/project/tokens/zbk-button.tokens.json') {
        return {
          canvas: { $value: '#fff', $type: 'color', $description: 'Background.' },
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
            fileMatch: ['/tokens/zbk-button.tokens.json'],
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
      if (target === '/workspace/project/tokens/zbk-button.tokens.json') return true;
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
          canvas: { $value: '#fff', $type: 'color', $description: 'Background.' },
          newKey: { $value: '#000', $type: 'color', $description: 'New key.' },
        };
      }
      if (target === '/workspace/project/tokens/zbk-button.tokens.json') {
        return {
          canvas: { $value: '#fff', $type: 'color', $description: 'Background.' },
        };
      }
      throw new Error(`Unexpected readJson target: ${target}`);
    });

    mockReadJsonSafe.mockResolvedValue(undefined);

    await runPullCommand(createDeps());

    expect(mockWriteJson).toHaveBeenCalledWith(
      '/workspace/project/tokens/zbk-button.tokens.json',
      {
        canvas: { $value: '#fff', $type: 'color', $description: 'Background.' },
        newKey: { $value: '#000', $type: 'color', $description: 'New key.' },
      },
      { spaces: 2 }
    );

    expect(mockWriteJson).toHaveBeenCalledWith(
      '/workspace/project/.vscode/settings.json',
      {
        'json.schemas': [
          {
            fileMatch: ['/tokens/zbk-button.tokens.json'],
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
      config: { configVersion: 1, tokens: { tokenPath: './tokens', basePreset: 'dusk' } },
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
          canvas: { $value: '#123', $type: 'color', $description: 'Preset background.' },
        };
      }
      throw new Error(`Unexpected readJson target: ${target}`);
    });

    mockReadJsonSafe.mockResolvedValue(undefined);

    await runPullCommand(createDeps());

    // The new file carries the PRESET value, not the default theme's.
    expect(mockWriteJson).toHaveBeenCalledWith(
      '/workspace/project/tokens/zbk-button.tokens.json',
      {
        canvas: { $value: '#123', $type: 'color', $description: 'Preset background.' },
      },
      { spaces: 2 }
    );
  });

  it('returns with guidance (exit 0) when no tokenPath is configured', async () => {
    mockReadConfig.mockResolvedValue({
      config: { configVersion: 1, tokens: {} },
      path: '/workspace/project/zebkit.config.json',
    });

    await runPullCommand(createDeps());

    expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('No tokenPath set in config'));
    expect(mockWriteJson).not.toHaveBeenCalledWith(
      '/workspace/project/zebkit.config.json',
      expect.anything(),
      expect.anything()
    );
    expect(mockWriteJson).not.toHaveBeenCalledWith(
      expect.stringContaining('/tokens/'),
      expect.anything(),
      expect.anything()
    );
  });

  it('refreshes agent context when context.path is set, honoring excluded components', async () => {
    mockReadConfig.mockResolvedValue({
      config: {
        configVersion: 1,
        context: { path: './zebkit/context' },
        components: { checkbox: false },
      },
      path: '/workspace/project/zebkit.config.json',
    });
    mockPathExists.mockImplementation(async (target: string) => target === '/pkg/dist/cli/context');
    mockReaddir.mockImplementation(async (target: string) =>
      target === '/pkg/dist/cli/context'
        ? [
            'llms.txt',
            'llms-full.txt',
            'utilities-spacing.md',
            'zbk-button.md',
            'zbk-checkbox.md',
          ]
        : ['llms-full.txt', 'utilities-border.md', 'zbk-checkbox.md', 'project-notes.md']
    );
    mockReadFile.mockResolvedValue(
      '# Index\n\n- [zbk-button](zbk-button.md): Button.\n- [zbk-checkbox](zbk-checkbox.md): Checkbox.\n'
    );

    await runPullCommand(createDeps());

    // The index is filtered, utility docs are copied, the full aggregate stays hosted,
    // and the excluded component doc is skipped.
    expect(mockEnsureDir).toHaveBeenCalledWith('/workspace/project/zebkit/context');
    expect(mockWriteFile).toHaveBeenCalledWith(
      '/workspace/project/zebkit/context/llms.txt',
      '# Index\n\n- [zbk-button](zbk-button.md): Button.\n'
    );
    expect(mockCopyFile).toHaveBeenCalledWith(
      '/pkg/dist/cli/context/zbk-button.md',
      '/workspace/project/zebkit/context/zbk-button.md'
    );
    expect(mockCopyFile).not.toHaveBeenCalledWith(
      '/pkg/dist/cli/context/zbk-checkbox.md',
      expect.anything()
    );
    expect(mockCopyFile).toHaveBeenCalledWith(
      '/pkg/dist/cli/context/utilities-spacing.md',
      '/workspace/project/zebkit/context/utilities-spacing.md'
    );
    expect(mockCopyFile).not.toHaveBeenCalledWith(
      '/pkg/dist/cli/context/llms-full.txt',
      expect.anything()
    );
    expect(mockRemove).toHaveBeenCalledWith('/workspace/project/zebkit/context/llms-full.txt');
    expect(mockRemove).toHaveBeenCalledWith('/workspace/project/zebkit/context/utilities-border.md');
    expect(mockRemove).toHaveBeenCalledWith('/workspace/project/zebkit/context/zbk-checkbox.md');
    expect(mockRemove).not.toHaveBeenCalledWith('/workspace/project/zebkit/context/project-notes.md');
    expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('Refreshed 3 agent context files'));
  });

  it('does not touch context when context.path is unset (opted out)', async () => {
    mockReadConfig.mockResolvedValue({
      config: { configVersion: 1, tokens: {} },
      path: '/workspace/project/zebkit.config.json',
    });

    await runPullCommand(createDeps());

    expect(mockReaddir).not.toHaveBeenCalled();
    expect(mockCopyFile).not.toHaveBeenCalled();
  });
});
