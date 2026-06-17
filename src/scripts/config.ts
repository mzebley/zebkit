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

export type TokensConfig = {
  selectedComponents?: string[];
  includeAllComponents?: boolean;
  destinationPath?: string;
  assetFilePath?: string;
  theme?: string;
  customTokenPath?: string;
  customThemeName?: string;
  /**
   * Optional CSS selector to scope emitted token variables under, instead of `:root`.
   * e.g. `'[data-zbk-theme="brutalist"]'`. This scopes the token layer
   * (semantic / alias / component custom properties) so a whole theme can apply to a
   * subtree rather than the document root. Primitive color ramps emitted by SCSS remain
   * global. Unset = default `:root` behavior.
   */
  rootSelector?: string;
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

const CONFIG_FILE_NAMES = [
  'zebkit.config.json',
  'zebkit-config.json',
  // Common misspelling seen in requests.
  'zekit.config.json',
];

function parseConfigPathFromArgs(): string | undefined {
  const args = process.argv.slice(2);
  const configFlagIndex = args.findIndex((arg) => arg === '--config' || arg === '-c');

  if (configFlagIndex !== -1 && args[configFlagIndex + 1]) {
    return args[configFlagIndex + 1];
  }

  return undefined;
}

export async function loadZebkitConfig(): Promise<
  | {
      config: ZebkitConfig;
      path: string;
    }
  | undefined
> {
  const explicitPath = parseConfigPathFromArgs();

  const candidates = explicitPath
    ? [explicitPath]
    : CONFIG_FILE_NAMES.map((name) => path.resolve(process.cwd(), name));

  for (const candidate of candidates) {
    try {
      const resolved = path.resolve(candidate);
      if (await fs.pathExists(resolved)) {
        const fileContents = await fs.readFile(resolved, 'utf-8');
        const parsed = JSON.parse(fileContents) as ZebkitConfig;
        return { config: parsed, path: resolved };
      }

      if (explicitPath) {
        console.error(chalk.red(`Config file not found at ${resolved}.`));
        process.exit(1);
      }
    } catch (error) {
      console.warn(chalk.yellow(`Unable to read config file at ${candidate}: ${error}`));
      return undefined;
    }
  }

  return undefined;
}
