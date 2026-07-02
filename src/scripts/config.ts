import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';

export const EXTENDED_TOKEN_BREAKPOINTS = [
  'tablet',
  'tablet-lg',
  'desktop',
  'desktop-lg',
  'widescreen',
] as const;

export type ExtendedTokenBreakpoint = (typeof EXTENDED_TOKEN_BREAKPOINTS)[number];

export type ExtendedTokensConfig = {
  /**
   * Controls which primitive color palette families are compiled into the output CSS.
   * 'all' (default) includes all 22 families.
   * 'smart' includes only families referenced in your token chain, reducing output size.
   */
  colors?: 'all' | 'smart';
  /**
   * Controls which responsive breakpoint utility classes are generated. This is
   * a per-build filter over the breakpoints enabled in the breakpoint token
   * module (src/core/breakpoint); naming a token-disabled breakpoint is an error.
   * true or absent = all enabled breakpoints (default).
   * false = no responsive utility classes.
   * string[] = only the named breakpoints.
   */
  breakpoints?: boolean | ExtendedTokenBreakpoint[];
  /**
   * Emit the breakpoint scale as `--zbk-breakpoint-*` CSS custom properties.
   * Off by default: `@media`/`@container` conditions cannot read `var()`, so
   * these vars are only useful to JS (e.g. reading the active scale at runtime).
   */
  emitBreakpointVars?: boolean;
};

export type TypeScaleConfig = {
  /**
   * Opt out of fluid (Utopia-style) font sizing and emit static font sizes instead.
   * In static mode each step's authored `value` is used (still wrapped in the a11y
   * modifier) and its fluid `index` is ignored. Default: false (fluid).
   */
  static?: boolean;
  /**
   * Alias for `!static`. `fluid: false` is equivalent to `static: true`. When both are
   * set, static sizing applies if either `static === true` or `fluid === false`.
   */
  fluid?: boolean;
};

export type FontsConfig = {
  /**
   * How Google Fonts are delivered:
   * - 'import' (default): emit a render-blocking `@import` at the top of the compiled CSS.
   *   Zero HTML changes, but the slowest strategy (request chain, no preconnect/preload).
   * - 'link' / 'preload': emit NO `@import`; instead write a sidecar `zbk-<theme>.fonts.html`
   *   with `<link rel="preconnect">` + stylesheet (and preload) tags to paste into `<head>`.
   * - 'manual': emit nothing remote; you wire up font loading yourself.
   * Local (`source: "local"`) `@font-face` rules are emitted regardless of strategy.
   */
  strategy?: 'import' | 'link' | 'preload' | 'manual';
};

export type SpaceScaleConfig = {
  /**
   * Opt out of fluid (viewport-interpolated) spacing and emit static spacing instead.
   * Density (`--zbk-a11y-spacing-modifier`) and text coupling
   * (`--zbk-spacing-text-coupling`) still apply; only the viewport interpolation is
   * dropped. Default: false (fluid).
   */
  static?: boolean;
  /** Alias for `!static`. `fluid: false` is equivalent to `static: true`. */
  fluid?: boolean;
};

/**
 * A scoped, minimal overlay theme built on top of the base theme. An overlay
 * redeclares ONLY the tokens its `tokenPath` overrides, scoped under `rootSelector`,
 * with no primitive palettes / utility classes / reset (those already exist globally
 * from the base CSS). Toggling the selector — e.g. `[data-zbk-theme="dark"]` — re-skins
 * the subtree via the cascade. See `tokens.overlays`.
 */
export type OverlayThemeConfig = {
  /** Override token file or folder. Only the tokens it touches are emitted. Required. */
  tokenPath: string;
  /** Output theme name; drives the emitted `zbk-<themeName>.css` filename. Required. */
  themeName: string;
  /**
   * CSS selector to scope the overlay's vars under. Omitted/blank defaults to
   * `[data-zbk-theme="<themeName>"]`. Must never resolve to `:root` — that would
   * clobber the base theme.
   */
  rootSelector?: string;
  /** Output directory. Omitted = the parent (base) theme's `destinationPath`. */
  destinationPath?: string;
  /** Google Fonts delivery strategy. Omitted = the parent (base) theme's strategy. */
  fonts?: FontsConfig;
};

export type TokensConfig = {
  selectedComponents?: string[];
  includeAllComponents?: boolean;
  destinationPath?: string;
  assetFilePath?: string;
  /** Built-in base preset to start from (e.g. `'default'`). The base theme is always emitted at `:root`. */
  basePreset?: string;
  /** Override token file or folder layered on top of the base preset. */
  tokenPath?: string;
  /** Output name for the base theme; drives the emitted `zbk-<themeName>.css` filename. */
  themeName?: string;
  /**
   * Scoped, minimal overlay themes emitted alongside the base. Each redeclares only the
   * tokens it overrides, under its own selector. Config-only (not promptable).
   */
  overlays?: OverlayThemeConfig[];
  exportTokens?: boolean;
  splitMode?: 'combined' | 'per-module';
  outputFormats?: Array<'JSON' | 'TypeScript' | 'JavaScript'>;
  writeAllowedTokenTypes?: boolean;
  writeTokenLookup?: boolean;
  writeVariantRegistry?: boolean;
  tokenLookupOutputPath?: string;
  extendedTokens?: ExtendedTokensConfig;
  /** Controls how the font-size scale compiles (fluid by default; static opt-out). */
  typeScale?: TypeScaleConfig;
  /** Controls how the spacing scale compiles (fluid by default; static opt-out). */
  spaceScale?: SpaceScaleConfig;
  /** Controls how fonts are loaded (Google Fonts delivery strategy). */
  fonts?: FontsConfig;
};

export type ComponentsConfig = {
  selectedComponents?: string[];
  jsOutput?: string;
};

export type ZebkitConfig = {
  tokens?: TokensConfig;
  components?: ComponentsConfig;
};

/**
 * Resolves an overlay's effective selector, defaulting to `[data-zbk-theme="<themeName>"]`
 * when omitted or blank.
 */
export function resolveOverlayRootSelector(overlay: OverlayThemeConfig): string {
  const explicit = overlay.rootSelector?.trim();
  return explicit && explicit.length > 0
    ? explicit
    : `[data-zbk-theme="${overlay.themeName}"]`;
}

/**
 * Validates the `overlays` array, throwing on any misconfiguration. Each overlay must name a
 * `themeName` and `tokenPath`, and its resolved selector must never be `:root` (which would
 * overwrite the base theme rather than overlay it).
 */
export function validateOverlays(overlays: OverlayThemeConfig[] | undefined): void {
  if (!overlays) return;
  if (!Array.isArray(overlays)) {
    throw new Error('`tokens.overlays` must be an array of overlay theme objects.');
  }
  const seenNames = new Set<string>();
  overlays.forEach((overlay, index) => {
    const at = `tokens.overlays[${index}]`;
    if (!overlay.themeName?.trim()) {
      throw new Error(`${at}: \`themeName\` is required.`);
    }
    if (!overlay.tokenPath?.trim()) {
      throw new Error(`${at} ("${overlay.themeName}"): \`tokenPath\` is required.`);
    }
    if (seenNames.has(overlay.themeName)) {
      throw new Error(`${at}: duplicate overlay \`themeName\` "${overlay.themeName}".`);
    }
    seenNames.add(overlay.themeName);
    const selector = resolveOverlayRootSelector(overlay);
    if (selector === ':root' || selector === 'html' || selector === '*') {
      throw new Error(
        `${at} ("${overlay.themeName}"): \`rootSelector\` resolves to "${selector}", which would clobber the base theme. Use a scoped selector.`
      );
    }
  });
}

const CONFIG_FILE_NAMES = ['zebkit.config.json'];

function parseConfigPathFromArgs(): string | undefined {
  const args = process.argv.slice(2);
  const configFlagIndex = args.findIndex((arg) => arg === '--config' || arg === '-c');

  if (configFlagIndex !== -1 && args[configFlagIndex + 1]) {
    return args[configFlagIndex + 1];
  }

  return undefined;
}

/**
 * Loads zebkit.config.json. `configPath` (e.g. commander's parsed `--config`
 * value) takes precedence; without it, argv is scanned for `-c/--config` (the
 * npm-script path, where no arg parser runs) and finally the cwd default.
 *
 * A config file that exists but cannot be parsed/validated is fatal — silently
 * falling back to interactive prompts would build something the user didn't ask for.
 */
export async function loadZebkitConfig(configPath?: string): Promise<
  | {
      config: ZebkitConfig;
      path: string;
    }
  | undefined
> {
  const explicitPath = configPath ?? parseConfigPathFromArgs();

  const candidates = explicitPath
    ? [explicitPath]
    : CONFIG_FILE_NAMES.map((name) => path.resolve(process.cwd(), name));

  for (const candidate of candidates) {
    const resolved = path.resolve(candidate);
    if (await fs.pathExists(resolved)) {
      try {
        const fileContents = await fs.readFile(resolved, 'utf-8');
        const parsed = JSON.parse(fileContents) as ZebkitConfig;
        validateOverlays(parsed.tokens?.overlays);
        return { config: parsed, path: resolved };
      } catch (error) {
        throw new Error(`Unable to read config file at ${resolved}: ${error}`);
      }
    }

    if (explicitPath) {
      console.error(chalk.red(`Config file not found at ${resolved}.`));
      process.exit(1);
    }
  }

  return undefined;
}
