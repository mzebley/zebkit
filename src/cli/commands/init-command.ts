import path from 'path';
import type { ZebkitConfig } from '../../scripts/config';
import {
  CURRENT_ZEBKIT_CONFIG_VERSION,
  ZEBKIT_CONFIG_CONSUMER_SCHEMA_PATH,
} from '../../scripts/config-schema';
import { resolveComponentsFilter } from '../../scripts/components-config';
import {
  createPullState,
  readTokenSnapshot,
  writePullState,
} from '../pull-state';
import {
  applyOptionValues,
  buildQuestions,
  type OptionTier,
  type PromptContext,
} from '../config-options';

/** Default consumer location for the pulled agent context. */
export const DEFAULT_CONTEXT_PATH = './zebkit/context';

/** Minimal fs surface for copying the agent context (shared by init + pull). */
export interface ContextCopyDeps {
  pathExists: (path: string) => Promise<boolean>;
  ensureDir: (path: string) => Promise<void>;
  readdir: (path: string) => Promise<string[]>;
  copyFile: (src: string, dest: string) => Promise<void>;
  remove: (path: string) => Promise<void>;
  readFile: (path: string, encoding: 'utf8') => Promise<string>;
  writeFile: (path: string, data: string) => Promise<void>;
  log?: (message: string) => void;
}

export interface InitCommandDeps extends ContextCopyDeps {
  writeJson: (...args: any[]) => Promise<void>;
  readJson: (path: string) => Promise<any>;
  readJsonSafe: (path: string) => Promise<any>;
  prompt: (...args: any[]) => Promise<any>;
  getZebkitPackageRoot: () => string;
  getZebkitDefaultsDir: () => string;
  getZebkitContextDir: () => string;
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

// A per-component context doc is named zbk-<component>.md. The full-library
// aggregate deliberately stays docs-site-only: it would expose excluded component docs.
const CONTEXT_COMPONENT_RE = /^zbk-(.+)\.md$/;
const CONTEXT_UTILITY_RE = /^utilities-.+\.md$/;
const CONTEXT_DOCS_ONLY_FILES = new Set(['llms-full.txt']);

function isManagedContextFile(file: string): boolean {
  return (
    file === 'llms.txt' ||
    CONTEXT_DOCS_ONLY_FILES.has(file) ||
    CONTEXT_COMPONENT_RE.test(file) ||
    CONTEXT_UTILITY_RE.test(file)
  );
}

function filterContextIndex(content: string, excluded: ReadonlySet<string>): string {
  return content
    .split('\n')
    .filter((line) => {
      const component = line.match(/\]\(zbk-(.+)\.md\)/)?.[1]?.toLowerCase();
      return !component || !excluded.has(component);
    })
    .join('\n');
}

/**
 * Copies the agent context (per-component markdown + llms.txt) from the bundled
 * context dir into `targetDir`, skipping per-component docs for components the
 * consumer excluded. Returns the number of files written. Shared by init + pull.
 */
export async function copyAgentContext(
  targetDir: string,
  sourceDir: string,
  excluded: ReadonlySet<string>,
  deps: ContextCopyDeps
): Promise<number> {
  if (!(await deps.pathExists(sourceDir))) {
    deps.log?.(
      `Agent context not found at ${sourceDir} — this zebkit build did not ship dist/cli/context/. Skipping.`
    );
    return 0;
  }

  await deps.ensureDir(targetDir);
  const files = (await deps.readdir(sourceDir)).sort();
  const desired = new Set(
    files.filter((file) => {
      if (CONTEXT_DOCS_ONLY_FILES.has(file)) return false;
      const match = file.match(CONTEXT_COMPONENT_RE);
      return !match || !excluded.has(match[1].toLowerCase());
    })
  );

  // Reconcile only files owned by Zebkit. This removes docs for components that
  // became excluded and retired generated files without touching consumer notes.
  for (const file of await deps.readdir(targetDir)) {
    if (isManagedContextFile(file) && !desired.has(file)) {
      await deps.remove(path.join(targetDir, file));
    }
  }

  let copied = 0;

  for (const file of files) {
    if (CONTEXT_DOCS_ONLY_FILES.has(file)) continue;
    if (file === 'llms.txt') {
      const content = await deps.readFile(path.join(sourceDir, file), 'utf8');
      await deps.writeFile(
        path.join(targetDir, file),
        filterContextIndex(content, excluded)
      );
      copied++;
      continue;
    }
    const match = file.match(CONTEXT_COMPONENT_RE);
    if (match && excluded.has(match[1].toLowerCase())) continue;
    await deps.copyFile(path.join(sourceDir, file), path.join(targetDir, file));
    copied++;
  }

  return copied;
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
    return false;
  }

  await deps.ensureDir(tokensDir);

  const snapshot = await readTokenSnapshot(sourceDir, deps);
  let copied = 0;

  for (const module of Object.values(snapshot.modules)) {
    const destFile = path.join(tokensDir, module.file);

    if (await deps.pathExists(destFile)) continue;

    await deps.writeJson(destFile, module.tokens, { spaces: 2 });
    copied++;
  }

  if (copied > 0) {
    console.log(`\nCopied ${copied} token files to ./tokens/`);
  } else {
    console.log('\n./tokens/ is already up to date.');
  }
  return true;
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
  const usesRepositorySchemas = jsonSchemas.some((schema: any) =>
    schema.url?.startsWith('./schemas/tokens/')
  );

  // All user-editable token files use the same unwrapped *.tokens.json contract.
  const tokenPathNormalized = customTokenPath.replace(/^\.\//, '');
  for (const module of modules) {
    const repositoryUrl = `./schemas/tokens/${module.key}.schema.json`;
    if (!jsonSchemas.some((schema: any) => schema.url === repositoryUrl)) {
      jsonSchemas.push({
        fileMatch: [`/${tokenPathNormalized}/${module.key}.tokens.json`],
        url: `./node_modules/zebkit/dist/editor/schemas/${module.key}.schema.json`,
      });
    }
  }

  // Merge css.customData
  const cssCustomData = (existingSettings['css.customData'] || []).filter(
    (entry: string) => !usesRepositorySchemas || !entry.includes('zebkit/dist/editor')
  );
  const zebkitCssData = './node_modules/zebkit/dist/editor/zebkit.css-data.json';

  if (!usesRepositorySchemas && !cssCustomData.includes(zebkitCssData)) {
    cssCustomData.push(zebkitCssData);
  }

  // Write merged settings
  const { 'css.customData': _existingCssCustomData, ...settingsWithoutCssCustomData } =
    existingSettings;
  const mergedSettings = {
    ...settingsWithoutCssCustomData,
    'json.schemas': jsonSchemas,
    ...(cssCustomData.length > 0 ? { 'css.customData': cssCustomData } : {}),
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
    // --quick assumes yes; standard init asks (default yes).
    if (!options.quick) {
      questions.push({
        type: 'confirm',
        name: 'copyContext',
        message:
          'Copy agent context (per-component markdown + llms.txt for local LLMs/agents)?',
        default: true,
      });
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
    const config: ZebkitConfig = {
      configVersion: CURRENT_ZEBKIT_CONFIG_VERSION,
      $schema: ZEBKIT_CONFIG_CONSUMER_SCHEMA_PATH,
      tokens: {},
    };
    applyOptionValues(config, answers, ctx);

    if (answers.copyTokens) {
      config.tokens!.tokenPath = './tokens';
      const selectedThemeDir = deps.resolveBundledThemeTokensDir(
        answers.basePreset,
        defaultsDir,
        packageRoot
      );
      const copiedFromSnapshot = await copyThemeTokens(process.cwd(), selectedThemeDir, deps);
      if (copiedFromSnapshot) {
        const snapshot = await readTokenSnapshot(selectedThemeDir, deps);
        await writePullState(
          configPath,
          createPullState(config.tokens!.basePreset ?? 'default', snapshot),
          deps
        );
      }
    }

    const copyContext = options.quick ? true : answers.copyContext;
    if (copyContext) {
      config.context = { path: DEFAULT_CONTEXT_PATH };
      const { excluded } = resolveComponentsFilter(config.components);
      const copied = await copyAgentContext(
        path.resolve(process.cwd(), DEFAULT_CONTEXT_PATH),
        deps.getZebkitContextDir(),
        excluded,
        deps
      );
      if (copied > 0) {
        console.log(`\nCopied ${copied} agent context files to ${DEFAULT_CONTEXT_PATH}/`);
      }
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
