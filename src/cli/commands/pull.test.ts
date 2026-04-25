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
  const mockGetZebkitDefaultsDir = jest.fn(() => '/pkg/dist/cli/defaults');
  const mockLog = jest.fn();

  const createDeps = (): PullCommandDeps => ({
    pathExists: mockPathExists as PullCommandDeps['pathExists'],
    readJson: mockReadJson as PullCommandDeps['readJson'],
    readJsonSafe: mockReadJsonSafe as PullCommandDeps['readJsonSafe'],
    writeJson: mockWriteJson as PullCommandDeps['writeJson'],
    ensureDir: mockEnsureDir as PullCommandDeps['ensureDir'],
    readConfig: mockReadConfig as PullCommandDeps['readConfig'],
    getZebkitDefaultsDir: mockGetZebkitDefaultsDir,
    log: mockLog,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockReadConfig.mockResolvedValue({
      config: { tokens: { customTokenPath: './tokens' } },
      path: '/workspace/project/zebkit.config.json',
    });
    mockGetZebkitDefaultsDir.mockReturnValue('/pkg/dist/cli/defaults');
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
});
