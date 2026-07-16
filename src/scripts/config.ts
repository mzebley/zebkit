import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';
import { compileMatchers } from './prune/matchers';

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
   * module (src/tokens/breakpoint); naming a token-disabled breakpoint is an error.
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

/** Default content globs scanned by prune when `tokens.prune.content` is omitted. */
export const DEFAULT_PRUNE_CONTENT = [
  'src/**/*.{svelte,html,js,ts,jsx,tsx,vue,astro,md,svx}',
];

/** Cascade layers prune never touches by default (never class-gated). */
export const DEFAULT_PRUNE_KEEP_LAYERS = ['theme', 'base'];

export type PruneOutputMode = 'replace' | 'alongside';

export type PruneOutputConfig = {
  /**
   * `replace` prunes the canonical `zbk-<theme>.min.css` in place (production);
   * `alongside` writes a second pruned file and leaves the canonical one untouched
   * (dev mode). Default: `replace`.
   */
  mode?: PruneOutputMode;
  /**
   * Alongside-mode output path. Blank = `<destinationPath>/zbk-<theme>.pruned.min.css`.
   * The filename must stay deterministic so a dev-server import doesn't churn.
   */
  path?: string;
};

/**
 * Production pruning of the compiled CSS: removes unused utility classes, state
 * variants, and unreachable design tokens based on a scan of project source.
 * Opt-in; disabled by default. See zebkit-prune-handoff.md.
 */
export type PruneConfig = {
  /** Enable prune during `zebkit build`. Default false. The standalone `zebkit prune` runs regardless. */
  enabled?: boolean;
  /** Content globs scanned for referenced classes/tokens. Resolved relative to the config file. */
  content?: string[];
  /** Force-keep entries: exact class strings or `/regex/` strings. */
  safelist?: string[];
  /** Force-drop entries even if matched (escape hatch); beats the safelist. */
  blocklist?: string[];
  /** Output disposition (replace in place vs. write a second pruned file). */
  output?: PruneOutputConfig;
  /** Token-graph trimming on/off. Default true. */
  tokens?: boolean;
  /** Layers never pruned. Default `['theme', 'base']`. */
  keepLayers?: string[];
  /** Component-layer handling. v1 ships `keep` only. */
  componentCss?: 'keep' | 'detect';
  /** Write `zbk-<theme>.prune-report.json` next to the output. Default true. */
  report?: boolean;
};

export type TokensConfig = {
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
  /** Production pruning of the compiled CSS. Opt-in; see `PruneConfig`. */
  prune?: PruneConfig;
  /**
   * Minify the compiled CSS (default true → `zbk-<theme>.min.css`). Set false for
   * a readable, unminified `zbk-<theme>.css` while debugging. Overlays follow this
   * setting but keep their `zbk-<name>.css` filename either way.
   */
  minify?: boolean;
};

/**
 * Per-component build inclusion. Omitted component = included with all shipped
 * variants. `false` excludes the component entirely (styles, tokens, variants);
 * `true` is an explicit include; `{ variants: [...] }` includes the component
 * with only the named shipped variants (`[]` = none). Custom variants from the
 * theme's variant JSON files are never filtered by the allowlist.
 *
 * This is declared intent, filtered at gather time; `tokens.prune` is
 * evidence-based and runs after — prune can only ever remove more.
 */
export type ComponentConfigEntry = boolean | { variants?: string[] };

/** Map of component name (e.g. `"button"`) to its inclusion entry. */
export type ComponentsConfig = Record<string, ComponentConfigEntry>;

/**
 * Agent context delivery. `path` is where `zebkit init`/`pull` write the
 * per-component markdown + `llms.txt` (relative to the config). Omit the block,
 * or set `path: false`, to opt out.
 */
export type ContextConfig = {
  path?: string | false;
};

export type ZebkitConfig = {
  tokens?: TokensConfig;
  components?: ComponentsConfig;
  context?: ContextConfig;
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

/**
 * Validates the `tokens.prune` block, throwing on any misconfiguration. Catches
 * invalid regex entries (naming the offending entry), bad enums, and wrong types
 * before a build silently ships the wrong CSS.
 */
export function validatePruneConfig(prune: PruneConfig | undefined): void {
  if (prune === undefined) return;
  if (typeof prune !== 'object' || Array.isArray(prune)) {
    throw new Error('`tokens.prune` must be an object.');
  }

  const assertStringArray = (value: unknown, field: string): void => {
    if (value === undefined) return;
    if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) {
      throw new Error(`\`tokens.prune.${field}\` must be an array of strings.`);
    }
  };
  const assertBoolean = (value: unknown, field: string): void => {
    if (value !== undefined && typeof value !== 'boolean') {
      throw new Error(`\`tokens.prune.${field}\` must be a boolean.`);
    }
  };

  assertBoolean(prune.enabled, 'enabled');
  assertBoolean(prune.tokens, 'tokens');
  assertBoolean(prune.report, 'report');
  assertStringArray(prune.content, 'content');
  assertStringArray(prune.safelist, 'safelist');
  assertStringArray(prune.blocklist, 'blocklist');
  assertStringArray(prune.keepLayers, 'keepLayers');

  if (prune.componentCss !== undefined && !['keep', 'detect'].includes(prune.componentCss)) {
    throw new Error('`tokens.prune.componentCss` must be "keep" or "detect".');
  }

  if (prune.output !== undefined) {
    if (typeof prune.output !== 'object' || Array.isArray(prune.output)) {
      throw new Error('`tokens.prune.output` must be an object.');
    }
    if (
      prune.output.mode !== undefined &&
      !['replace', 'alongside'].includes(prune.output.mode)
    ) {
      throw new Error('`tokens.prune.output.mode` must be "replace" or "alongside".');
    }
    if (prune.output.path !== undefined && typeof prune.output.path !== 'string') {
      throw new Error('`tokens.prune.output.path` must be a string.');
    }
  }

  // Compile safelist/blocklist entries now so an invalid `/regex/` fails loudly,
  // naming the offending entry, instead of degrading to "matches nothing" mid-build.
  compileMatchers([...(prune.safelist ?? []), ...(prune.blocklist ?? [])]);
}

/**
 * Validates the top-level `components` block shape, throwing on any
 * misconfiguration. Component *names* are validated at build time, where the
 * component vocabulary is known (unknown names warn with the valid list).
 */
export function validateComponentsConfig(components: ComponentsConfig | undefined): void {
  if (components === undefined) return;
  if (typeof components !== 'object' || Array.isArray(components) || components === null) {
    throw new Error(
      '`components` must be an object mapping component names to `false` | `true` | `{ variants: [...] }`.'
    );
  }

  for (const [name, entry] of Object.entries(components)) {
    if (typeof entry === 'boolean') continue;
    if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new Error(
        `\`components.${name}\` must be \`false\`, \`true\`, or \`{ variants: [...] }\`.`
      );
    }
    if (
      entry.variants !== undefined &&
      (!Array.isArray(entry.variants) ||
        entry.variants.some((variant) => typeof variant !== 'string'))
    ) {
      throw new Error(`\`components.${name}.variants\` must be an array of variant names.`);
    }
  }
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
        validatePruneConfig(parsed.tokens?.prune);
        validateComponentsConfig(parsed.components);
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
