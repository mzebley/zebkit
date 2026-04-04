import path from 'path';
import fs from 'fs-extra';
import { fileURLToPath } from 'node:url';

export const DEFAULT_THEME_NAME = 'default';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type ThemePresetManifest = {
  themes: string[];
};

function getRepoRoot(): string {
  return path.resolve(__dirname, '../..');
}

function getSourceThemeDir(): string {
  return path.join(getRepoRoot(), 'theme');
}

export function getBundledThemePresetsDir(packageRoot: string): string {
  return path.join(packageRoot, 'dist', 'cli', 'presets');
}

export function getBundledThemeVariantOverridesDir(
  packageRoot: string,
  themeName: string
): string {
  return path.join(getBundledThemePresetsDir(packageRoot), themeName, 'variant-overrides');
}

export async function getBuiltInThemeNames(packageRoot?: string): Promise<string[]> {
  if (packageRoot) {
    const manifestPath = path.join(getBundledThemePresetsDir(packageRoot), 'manifest.json');
    if (await fs.pathExists(manifestPath)) {
      const manifest = (await fs.readJson(manifestPath)) as ThemePresetManifest;
      return Array.isArray(manifest.themes) ? manifest.themes : [];
    }
  }

  const sourceThemeDir = getSourceThemeDir();
  if (!(await fs.pathExists(sourceThemeDir))) return [];

  const entries = await fs.readdir(sourceThemeDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
}

export function getThemePromptChoices(themeNames: string[]): string[] {
  return [DEFAULT_THEME_NAME, ...themeNames.filter((name) => name !== DEFAULT_THEME_NAME)];
}

export function resolveBundledThemeTokensDir(
  themeName: string,
  defaultsDir: string,
  packageRoot: string
): string {
  if (themeName === DEFAULT_THEME_NAME) {
    return defaultsDir;
  }

  return path.join(getBundledThemePresetsDir(packageRoot), themeName);
}

export function resolveSourceThemeOverridePath(themeName: string): string | undefined {
  if (themeName === DEFAULT_THEME_NAME) {
    return undefined;
  }

  return path.join(getSourceThemeDir(), themeName);
}
