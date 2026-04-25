import path from 'path';
import type { ZebkitConfig } from '../../scripts/config';

export interface InitCommandDeps {
  pathExists: (path: string) => Promise<boolean>;
  writeJson: (...args: any[]) => Promise<void>;
  readJson: (path: string) => Promise<any>;
  readJsonSafe: (path: string) => Promise<any>;
  ensureDir: (path: string) => Promise<void>;
  prompt: (...args: any[]) => Promise<any>;
  getZebkitPackageRoot: () => string;
  getZebkitDefaultsDir: () => string;
  getBuiltInThemeNames: (packageRoot?: string) => Promise<string[]>;
  getThemePromptChoices: (themeNames: string[]) => string[];
  resolveBundledThemeTokensDir: (
    themeName: string,
    defaultsDir: string,
    packageRoot: string
  ) => string;
  handlePromptCancel: (commandName: string) => void;
  isPromptCancelError: (error: unknown) => error is { name: string };
}

export function getDefaultProjectName(projectDir: string): string {
  return path.basename(projectDir);
}

export async function copyThemeTokens(
  projectDir: string,
  sourceDir: string,
  deps: Pick<InitCommandDeps, 'pathExists' | 'readJson' | 'ensureDir' | 'writeJson'>
) {
  const tokensDir = path.resolve(projectDir, 'tokens');
  const manifestPath = path.join(sourceDir, 'manifest.json');

  if (!(await deps.pathExists(manifestPath))) {
    console.warn(
      `Theme token manifest not found at ${manifestPath} — skipping token copy.\n` +
        'Run `npm run build:defaults` in the zebkit package to generate bundled theme presets.'
    );
    return;
  }

  await deps.ensureDir(tokensDir);

  const manifest = (await deps.readJson(manifestPath)) as {
    modules: Array<{ key: string; file: string }>;
  };
  let copied = 0;

  for (const mod of manifest.modules) {
    const destFile = path.join(tokensDir, mod.file);

    if (await deps.pathExists(destFile)) continue;

    const srcFile = path.join(sourceDir, mod.file);
    const raw = (await deps.readJson(srcFile)) as Record<string, unknown>;
    const { _key, _layer, ...tokenData } = raw;

    await deps.writeJson(destFile, { [mod.key]: tokenData }, { spaces: 2 });
    copied++;
  }

  if (copied > 0) {
    console.log(`\nCopied ${copied} token files to ./tokens/`);
  } else {
    console.log('\n./tokens/ is already up to date.');
  }
}

export async function writeVscodeSettings(
  projectDir: string,
  customTokenPath: string,
  deps: Pick<InitCommandDeps, 'readJsonSafe' | 'writeJson' | 'ensureDir'>
): Promise<void> {
  const vscodeDir = path.resolve(projectDir, '.vscode');
  const settingsPath = path.resolve(vscodeDir, 'settings.json');

  await deps.ensureDir(vscodeDir);

  // Read existing settings if present
  const existingSettings = (await deps.readJsonSafe(settingsPath)) || {};

  // Merge json.schemas
  const jsonSchemas = existingSettings['json.schemas'] || [];
  const tokenSchemaEntry = {
    fileMatch: [`${customTokenPath}/**/*.tokens.json`],
    url: './node_modules/zebkit/dist/editor/tokens.schema.json',
  };

  // Check if entry already exists
  const schemaExists = jsonSchemas.some(
    (s: any) =>
      s.fileMatch &&
      Array.isArray(s.fileMatch) &&
      s.fileMatch.includes(`${customTokenPath}/**/*.tokens.json`)
  );

  if (!schemaExists) {
    jsonSchemas.push(tokenSchemaEntry);
  }

  // Merge css.customData
  const cssCustomData = existingSettings['css.customData'] || [];
  const zebkitCssData = './node_modules/zebkit/dist/editor/zebkit.css-data.json';

  if (!cssCustomData.includes(zebkitCssData)) {
    cssCustomData.push(zebkitCssData);
  }

  // Write merged settings
  const mergedSettings = {
    ...existingSettings,
    'json.schemas': jsonSchemas,
    'css.customData': cssCustomData,
  };

  await deps.writeJson(settingsPath, mergedSettings, { spaces: 2 });
}

export async function runInitCommand(deps: InitCommandDeps) {
  try {
    const configPath = path.resolve(process.cwd(), 'zebkit.config.json');
    const packageRoot = deps.getZebkitPackageRoot();
    const defaultsDir = deps.getZebkitDefaultsDir();
    const builtInThemes = deps.getThemePromptChoices(
      await deps.getBuiltInThemeNames(packageRoot)
    );

    if (await deps.pathExists(configPath)) {
      const { overwrite } = await deps.prompt([
        {
          type: 'confirm',
          name: 'overwrite',
          message: 'zebkit.config.json already exists. Overwrite?',
          default: false,
        },
      ]);
      if (!overwrite) {
        console.log('Init cancelled.');
        return;
      }
    }

    const answers = await deps.prompt([
      {
        type: 'input',
        name: 'destinationPath',
        message: 'Output directory for compiled CSS:',
        default: './dist',
      },
      {
        type: 'input',
        name: 'assetFilePath',
        message: 'Asset URL path (used for CSS asset references):',
        default: '/',
      },
      {
        type: 'list',
        name: 'theme',
        message: 'Starting theme:',
        choices: builtInThemes,
        default: 'default',
      },
      {
        type: 'input',
        name: 'projectName',
        message: 'Project name (used for output filename):',
        default: getDefaultProjectName(process.cwd()),
      },
      {
        type: 'confirm',
        name: 'copyTokens',
        message: 'Copy default token files to ./tokens/ for customization?',
        default: true,
      },
    ]);

    const config: ZebkitConfig = {
      tokens: {
        destinationPath: answers.destinationPath,
        assetFilePath: answers.assetFilePath,
        theme: answers.theme,
        customThemeName: answers.projectName,
      },
    };

    if (answers.copyTokens) {
      config.tokens!.customTokenPath = './tokens';
      const selectedThemeDir = deps.resolveBundledThemeTokensDir(
        answers.theme,
        defaultsDir,
        packageRoot
      );
      await copyThemeTokens(process.cwd(), selectedThemeDir, deps);
    }

    await deps.writeJson(configPath, config, { spaces: 2 });
    console.log('\nCreated zebkit.config.json');

    // Write VS Code settings for editor support
    const customTokenPath = config.tokens?.customTokenPath || './tokens';
    await writeVscodeSettings(process.cwd(), customTokenPath, deps);
    console.log('Configured .vscode/settings.json for editor support');

    console.log('\nNext:');
    if (answers.copyTokens) {
      console.log('  1. Edit ./tokens/ to customize design tokens');
      console.log('  2. Run `zebkit build` to compile CSS');
    } else {
      console.log('  1. Run `zebkit build` to compile CSS');
    }
  } catch (error) {
    if (deps.isPromptCancelError(error)) {
      deps.handlePromptCancel('Init');
      return;
    }

    throw error;
  }
}
