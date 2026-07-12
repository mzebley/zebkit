import path from 'path';
import type { ZebkitConfig } from '../../scripts/config';
import {
  applyOptionValues,
  buildQuestions,
  type OptionTier,
  type PromptContext,
} from '../config-options';

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
  getKnownComponents: (tokenDefaultsDir?: string) => Promise<string[]>;
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
  modules: Array<{ key: string; file: string }>,
  deps: Pick<InitCommandDeps, 'readJsonSafe' | 'writeJson' | 'ensureDir'>
): Promise<void> {
  const vscodeDir = path.resolve(projectDir, '.vscode');
  const settingsPath = path.resolve(vscodeDir, 'settings.json');

  await deps.ensureDir(vscodeDir);

  // Read existing settings if present
  const existingSettings = (await deps.readJsonSafe(settingsPath)) || {};

  // Merge json.schemas - remove any existing zebkit entries, then add new ones
  let jsonSchemas = (existingSettings['json.schemas'] || []) as any[];

  // Remove any existing zebkit schema entries
  jsonSchemas = jsonSchemas.filter(
    (s: any) => !s.url || !s.url.includes('zebkit/dist/editor')
  );

  // Add per-module schema entries
  const tokenPathNormalized = customTokenPath.replace(/^\.\//, '');
  for (const module of modules) {
    const tokenSchemaEntry = {
      fileMatch: [`/${tokenPathNormalized}/${module.file}`],
      url: `./node_modules/zebkit/dist/editor/schemas/${module.key}.schema.json`,
    };
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

export interface RunInitOptions {
  /** Fast path: only the quick-tier prompts (output dir, asset path, theme, name). */
  quick?: boolean;
}

export async function runInitCommand(
  deps: InitCommandDeps,
  options: RunInitOptions = {}
) {
  try {
    const configPath = path.resolve(process.cwd(), 'zebkit.config.json');
    const packageRoot = deps.getZebkitPackageRoot();
    const defaultsDir = deps.getZebkitDefaultsDir();
    const themeChoices = deps.getThemePromptChoices(
      await deps.getBuiltInThemeNames(packageRoot)
    );
    const ctx: PromptContext = {
      themeChoices,
      defaultProjectName: getDefaultProjectName(process.cwd()),
      componentChoices: await deps.getKnownComponents(defaultsDir),
    };

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

    const tiers: OptionTier[] = options.quick ? ['quick'] : ['quick', 'standard'];
    const questions: any[] = buildQuestions(tiers, {}, ctx);
    questions.push({
      type: 'confirm',
      name: 'copyTokens',
      message: 'Copy default token files to ./tokens/ for customization?',
      default: true,
    });
    if (!options.quick) {
      questions.push({
        type: 'confirm',
        name: 'configureAdvanced',
        message: 'Configure token export / advanced options?',
        default: false,
      });
    }

    let answers = await deps.prompt(questions);

    if (!options.quick && answers.configureAdvanced) {
      const advancedAnswers = await deps.prompt(buildQuestions(['advanced'], {}, ctx));
      answers = { ...answers, ...advancedAnswers };
    }

    // Write a complete, self-documenting token config (defaults are not omitted).
    const config: ZebkitConfig = { tokens: {} };
    applyOptionValues(config, answers, ctx);

    if (answers.copyTokens) {
      config.tokens!.tokenPath = './tokens';
      const selectedThemeDir = deps.resolveBundledThemeTokensDir(
        answers.basePreset,
        defaultsDir,
        packageRoot
      );
      await copyThemeTokens(process.cwd(), selectedThemeDir, deps);
    }

    await deps.writeJson(configPath, config, { spaces: 2 });
    console.log('\nCreated zebkit.config.json');

    // Write VS Code settings for editor support
    const customTokenPath = config.tokens?.tokenPath || './tokens';
    const defaultsManifest = await deps.readJson(path.join(defaultsDir, 'manifest.json'));
    const modules = defaultsManifest.modules as Array<{ key: string; file: string }>;
    await writeVscodeSettings(process.cwd(), customTokenPath, modules, deps);
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
