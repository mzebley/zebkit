import path from 'path';
import {
  resolveOverlayRootSelector,
  validateOverlays,
  type OverlayThemeConfig,
  type ZebkitConfig,
} from '../../scripts/config';

export interface OverlayThemeCommandDeps {
  readConfig: () => Promise<{ config: ZebkitConfig; path: string } | undefined>;
  writeConfig: (configPath: string, config: ZebkitConfig) => Promise<void>;
  prompt: (...args: any[]) => Promise<any>;
  pathExists: (p: string) => Promise<boolean>;
  ensureDir: (p: string) => Promise<void>;
  readJson: (p: string) => Promise<any>;
  writeJson: (p: string, data: any, options?: any) => Promise<void>;
  remove: (p: string) => Promise<void>;
  getZebkitPackageRoot: () => string;
  getZebkitDefaultsDir: () => string;
  resolveBundledThemeTokensDir: (
    themeName: string,
    defaultsDir: string,
    packageRoot: string
  ) => string;
  handlePromptCancel: (commandName: string) => void;
  isPromptCancelError: (error: unknown) => error is { name: string };
  log: (message: string) => void;
}

const FONT_STRATEGY_CHOICES = [
  { name: 'inherit from base theme', value: '' },
  { name: 'import', value: 'import' },
  { name: 'link', value: 'link' },
  { name: 'preload', value: 'preload' },
  { name: 'manual', value: 'manual' },
];

async function requireConfig(
  deps: OverlayThemeCommandDeps
): Promise<{ config: ZebkitConfig; path: string }> {
  const result = await deps.readConfig();
  if (!result) {
    throw new Error('No zebkit.config.json found. Run `zebkit init` first.');
  }
  return result;
}

function handleCancel(deps: OverlayThemeCommandDeps, error: unknown): void {
  if (deps.isPromptCancelError(error)) {
    deps.handlePromptCancel('Overlay theme');
    return;
  }
  throw error;
}

function printOverlays(
  deps: OverlayThemeCommandDeps,
  overlays: OverlayThemeConfig[]
): void {
  if (overlays.length === 0) {
    deps.log('No overlay themes configured.');
    return;
  }
  deps.log('Overlay themes:');
  for (const overlay of overlays) {
    const extras = [
      `selector=${resolveOverlayRootSelector(overlay)}`,
      `tokenPath=${overlay.tokenPath}`,
    ];
    if (overlay.destinationPath) extras.push(`dest=${overlay.destinationPath}`);
    if (overlay.fonts?.strategy) extras.push(`fonts=${overlay.fonts.strategy}`);
    deps.log(`  - ${overlay.themeName}  (${extras.join(', ')})`);
  }
}

async function promptOverlayFields(
  deps: OverlayThemeCommandDeps,
  current?: OverlayThemeConfig
): Promise<OverlayThemeConfig> {
  const answers = await deps.prompt([
    {
      type: 'input',
      name: 'themeName',
      message: 'Overlay theme name (drives zbk-<name>.css):',
      default: current?.themeName,
      validate: (v: string) => (v && v.trim() ? true : 'Theme name is required.'),
    },
    {
      type: 'input',
      name: 'tokenPath',
      message: 'Token path (folder of override token files):',
      default: current?.tokenPath,
      validate: (v: string) => (v && v.trim() ? true : 'Token path is required.'),
    },
    {
      type: 'input',
      name: 'rootSelector',
      message: 'Root selector (blank = [data-zbk-theme="<name>"]):',
      default: current?.rootSelector ?? '',
    },
    {
      type: 'input',
      name: 'destinationPath',
      message: 'Output directory (blank = inherit base theme):',
      default: current?.destinationPath ?? '',
    },
    {
      type: 'list',
      name: 'fontsStrategy',
      message: 'Google Fonts strategy:',
      choices: FONT_STRATEGY_CHOICES,
      default: current?.fonts?.strategy ?? '',
    },
  ]);

  const overlay: OverlayThemeConfig = {
    themeName: answers.themeName.trim(),
    tokenPath: answers.tokenPath.trim(),
  };
  if (answers.rootSelector?.trim()) overlay.rootSelector = answers.rootSelector.trim();
  if (answers.destinationPath?.trim()) {
    overlay.destinationPath = answers.destinationPath.trim();
  }
  if (answers.fontsStrategy) overlay.fonts = { strategy: answers.fontsStrategy };
  return overlay;
}

async function scaffoldOverlayTokens(
  deps: OverlayThemeCommandDeps,
  configDir: string,
  overlay: OverlayThemeConfig,
  basePreset: string
): Promise<void> {
  const sourceDir = deps.resolveBundledThemeTokensDir(
    basePreset,
    deps.getZebkitDefaultsDir(),
    deps.getZebkitPackageRoot()
  );
  const manifestPath = path.join(sourceDir, 'manifest.json');
  const tokenDir = path.resolve(configDir, overlay.tokenPath);
  await deps.ensureDir(tokenDir);

  if (!(await deps.pathExists(manifestPath))) {
    deps.log(
      `\nCreated ${overlay.tokenPath}. (Base token manifest not found — add override files yourself.)`
    );
    return;
  }

  const manifest = (await deps.readJson(manifestPath)) as {
    modules: Array<{ key: string; file: string }>;
  };

  const { files } = await deps.prompt([
    {
      type: 'checkbox',
      name: 'files',
      message:
        'Copy base token file(s) to start from? (you trim them down after — pick none to start empty)',
      choices: manifest.modules.map((m) => ({
        name: m.file.replace('.json', ''),
        value: m.file,
      })),
    },
  ]);

  let copied = 0;
  for (const file of files as string[]) {
    const mod = manifest.modules.find((m) => m.file === file);
    if (!mod) continue;
    const dest = path.join(tokenDir, file);
    if (await deps.pathExists(dest)) continue;
    const raw = (await deps.readJson(path.join(sourceDir, file))) as Record<string, unknown>;
    const { _key, _layer, ...data } = raw;
    await deps.writeJson(dest, { [mod.key]: data }, { spaces: 2 });
    copied++;
  }

  if (copied > 0) {
    deps.log(`\nCopied ${copied} base token file(s) into ${overlay.tokenPath}.`);
    deps.log(
      'Edit them and delete the value fields you do NOT want this overlay to override.'
    );
  } else {
    deps.log(
      `\n${overlay.tokenPath} is ready. Add token files that redeclare only what you want to override.`
    );
  }
}

async function resolveOverlay(
  deps: OverlayThemeCommandDeps,
  overlays: OverlayThemeConfig[],
  name: string | undefined,
  action: string
): Promise<OverlayThemeConfig | undefined> {
  if (name) {
    const found = overlays.find((o) => o.themeName === name);
    if (!found) deps.log(`No overlay theme named "${name}".`);
    return found;
  }
  const { selected } = await deps.prompt([
    {
      type: 'list',
      name: 'selected',
      message: `Which overlay to ${action}?`,
      choices: overlays.map((o) => o.themeName),
    },
  ]);
  return overlays.find((o) => o.themeName === selected);
}

async function createOverlay(
  deps: OverlayThemeCommandDeps,
  config: ZebkitConfig,
  configPath: string
): Promise<void> {
  const overlay = await promptOverlayFields(deps);
  const overlays = [...(config.tokens?.overlays ?? []), overlay];
  validateOverlays(overlays);

  if (!config.tokens) config.tokens = {};
  config.tokens.overlays = overlays;
  await deps.writeConfig(configPath, config);
  deps.log(`\nAdded overlay theme "${overlay.themeName}".`);

  await scaffoldOverlayTokens(
    deps,
    path.dirname(configPath),
    overlay,
    config.tokens.basePreset ?? 'default'
  );
}

async function editOverlay(
  deps: OverlayThemeCommandDeps,
  config: ZebkitConfig,
  configPath: string,
  name?: string
): Promise<void> {
  const overlays = config.tokens?.overlays ?? [];
  if (overlays.length === 0) {
    deps.log('No overlay themes to edit.');
    return;
  }
  const target = await resolveOverlay(deps, overlays, name, 'edit');
  if (!target) return;

  const index = overlays.indexOf(target);
  const updated = await promptOverlayFields(deps, target);
  const next = [...overlays];
  next[index] = updated;
  validateOverlays(next);

  config.tokens!.overlays = next;
  await deps.writeConfig(configPath, config);
  deps.log(`\nUpdated overlay theme "${updated.themeName}".`);
}

async function deleteOverlay(
  deps: OverlayThemeCommandDeps,
  config: ZebkitConfig,
  configPath: string,
  name?: string
): Promise<void> {
  const overlays = config.tokens?.overlays ?? [];
  if (overlays.length === 0) {
    deps.log('No overlay themes to delete.');
    return;
  }
  const target = await resolveOverlay(deps, overlays, name, 'delete');
  if (!target) return;

  const { confirmDelete } = await deps.prompt([
    {
      type: 'confirm',
      name: 'confirmDelete',
      message: `Remove overlay "${target.themeName}" from the config?`,
      default: false,
    },
  ]);
  if (!confirmDelete) {
    deps.log('Cancelled.');
    return;
  }

  config.tokens!.overlays = overlays.filter((o) => o !== target);
  await deps.writeConfig(configPath, config);
  deps.log(`\nRemoved overlay theme "${target.themeName}" from the config.`);

  const { deleteFiles } = await deps.prompt([
    {
      type: 'confirm',
      name: 'deleteFiles',
      message: `Also delete the token files and folder at ${target.tokenPath}?`,
      default: false,
    },
  ]);
  if (deleteFiles) {
    await deps.remove(path.resolve(path.dirname(configPath), target.tokenPath));
    deps.log(`Deleted ${target.tokenPath}.`);
  }
}

export async function runOverlayList(deps: OverlayThemeCommandDeps): Promise<void> {
  const { config } = await requireConfig(deps);
  printOverlays(deps, config.tokens?.overlays ?? []);
}

export async function runOverlayNew(deps: OverlayThemeCommandDeps): Promise<void> {
  try {
    const { config, path: configPath } = await requireConfig(deps);
    await createOverlay(deps, config, configPath);
  } catch (error) {
    handleCancel(deps, error);
  }
}

export async function runOverlayEdit(
  deps: OverlayThemeCommandDeps,
  name?: string
): Promise<void> {
  try {
    const { config, path: configPath } = await requireConfig(deps);
    await editOverlay(deps, config, configPath, name);
  } catch (error) {
    handleCancel(deps, error);
  }
}

export async function runOverlayDelete(
  deps: OverlayThemeCommandDeps,
  name?: string
): Promise<void> {
  try {
    const { config, path: configPath } = await requireConfig(deps);
    await deleteOverlay(deps, config, configPath, name);
  } catch (error) {
    handleCancel(deps, error);
  }
}

export async function runOverlayDefault(deps: OverlayThemeCommandDeps): Promise<void> {
  try {
    const { config, path: configPath } = await requireConfig(deps);
    const overlays = config.tokens?.overlays ?? [];
    printOverlays(deps, overlays);

    let action = 'create';
    if (overlays.length > 0) {
      const res = await deps.prompt([
        {
          type: 'list',
          name: 'action',
          message: 'What would you like to do?',
          choices: [
            { name: 'Create a new overlay', value: 'create' },
            { name: 'Edit an overlay', value: 'edit' },
            { name: 'Delete an overlay', value: 'delete' },
          ],
        },
      ]);
      action = res.action;
    } else {
      deps.log("\nLet's create your first overlay theme.");
    }

    if (action === 'create') await createOverlay(deps, config, configPath);
    else if (action === 'edit') await editOverlay(deps, config, configPath);
    else await deleteOverlay(deps, config, configPath);
  } catch (error) {
    handleCancel(deps, error);
  }
}
