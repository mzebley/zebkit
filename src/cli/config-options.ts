import type { ZebkitConfig } from '../scripts/config';
import { EXTENDED_TOKEN_BREAKPOINTS } from '../scripts/config';
import { getAtPath, setAtPath } from './config-paths';

/**
 * Prompt tiers. `quick` is the fast-path subset (matches the original `init`
 * questions); `standard` is added in full `init` and guided `config`; `advanced`
 * lives behind the "configure token export / advanced options?" gate.
 */
export type OptionTier = 'quick' | 'standard' | 'advanced';

/** Dynamic data needed to build certain questions (theme list, project name). */
export interface PromptContext {
  themeChoices?: string[];
  defaultProjectName?: string;
}

/** A minimal inquirer-compatible question shape (avoids a hard inquirer type dep). */
export interface Question {
  type: 'input' | 'list' | 'confirm' | 'checkbox';
  name: string;
  message: string;
  default?: unknown;
  choices?: Array<string | { name: string; value: unknown; checked?: boolean }>;
  when?: (answers: Record<string, unknown>) => boolean;
  validate?: (input: unknown) => true | string;
}

/**
 * A single configurable token option. One entry drives the init/config prompt,
 * its written default (config is self-documenting — defaults are NOT omitted),
 * and `config set` validation/parsing.
 */
export interface ConfigOption {
  /** Dot-path into ZebkitConfig, e.g. `tokens.fonts.strategy`. */
  path: string;
  /** Inquirer-safe question name. */
  id: string;
  tier: OptionTier;
  /** Static default written when the option is not customized. */
  default: unknown;
  /** Dynamic default override (e.g. project name) used when present. */
  resolveDefault?: (ctx: PromptContext) => unknown;
  buildQuestion: (resolvedDefault: unknown, ctx: PromptContext) => Question;
  /** Parse a raw string from `config set` into a typed value; throw on invalid. */
  parse: (raw: string) => unknown;
  /** Map a stored config value to the prompt's default answer (for inverted confirms). */
  configToPrompt?: (configValue: unknown) => unknown;
  /** Map a prompt answer back to the stored config value. */
  promptToConfig?: (answer: unknown) => unknown;
  /** Only ask interactively when this returns true (gates sub-options). */
  when?: (answers: Record<string, unknown>) => boolean;
}

const FONT_STRATEGIES = ['import', 'link', 'preload', 'manual'] as const;

function parseBoolean(raw: string): boolean {
  const normalized = raw.trim().toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  throw new Error(`Expected "true" or "false", received "${raw}".`);
}

function parseEnum<T extends string>(raw: string, allowed: readonly T[]): T {
  const value = raw.trim() as T;
  if (!allowed.includes(value)) {
    throw new Error(`Expected one of ${allowed.join(', ')}; received "${raw}".`);
  }
  return value;
}

export const CONFIG_OPTIONS: ConfigOption[] = [
  // --- quick tier ---------------------------------------------------------
  {
    path: 'tokens.destinationPath',
    id: 'destinationPath',
    tier: 'quick',
    default: './dist',
    parse: (raw) => raw,
    buildQuestion: (def) => ({
      type: 'input',
      name: 'destinationPath',
      message: 'Output directory for compiled CSS:',
      default: def,
    }),
  },
  {
    path: 'tokens.assetFilePath',
    id: 'assetFilePath',
    tier: 'quick',
    default: '/',
    parse: (raw) => raw,
    buildQuestion: (def) => ({
      type: 'input',
      name: 'assetFilePath',
      message: 'Asset URL path (used for CSS asset references):',
      default: def,
    }),
  },
  {
    path: 'tokens.basePreset',
    id: 'basePreset',
    tier: 'quick',
    default: 'default',
    parse: (raw) => raw,
    buildQuestion: (def, ctx) => ({
      type: 'list',
      name: 'basePreset',
      message: 'Starting theme:',
      choices: ctx.themeChoices ?? ['default'],
      default: def,
    }),
  },
  {
    path: 'tokens.themeName',
    id: 'themeName',
    tier: 'quick',
    default: 'zebkit',
    resolveDefault: (ctx) => ctx.defaultProjectName ?? 'zebkit',
    parse: (raw) => raw,
    buildQuestion: (def) => ({
      type: 'input',
      name: 'themeName',
      message: 'Project name (used for output filename):',
      default: def,
    }),
  },

  // --- standard tier ------------------------------------------------------
  {
    path: 'tokens.fonts.strategy',
    id: 'fontsStrategy',
    tier: 'standard',
    default: 'import',
    parse: (raw) => parseEnum(raw, FONT_STRATEGIES),
    buildQuestion: (def) => ({
      type: 'list',
      name: 'fontsStrategy',
      message: 'Google Fonts delivery strategy:',
      choices: [
        { name: 'import — render-blocking @import, zero HTML changes (default)', value: 'import' },
        { name: 'link — emit a sidecar .fonts.html with <link> tags to paste into <head>', value: 'link' },
        { name: 'preload — like link, plus preload hints', value: 'preload' },
        { name: 'manual — emit nothing remote; you wire up font loading', value: 'manual' },
      ],
      default: def,
    }),
  },
  {
    path: 'tokens.extendedTokens.colors',
    id: 'colors',
    tier: 'standard',
    default: 'all',
    parse: (raw) => parseEnum(raw, ['all', 'smart'] as const),
    buildQuestion: (def) => ({
      type: 'list',
      name: 'colors',
      message: 'Primitive color palettes to compile:',
      choices: [
        { name: 'all — include every palette family (default)', value: 'all' },
        { name: 'smart — only families referenced in your token chain (smaller output)', value: 'smart' },
      ],
      default: def,
    }),
  },
  {
    path: 'tokens.typeScale.static',
    id: 'typeScaleFluid',
    tier: 'standard',
    default: false,
    parse: parseBoolean,
    configToPrompt: (configValue) => !(configValue as boolean),
    promptToConfig: (answer) => !(answer as boolean),
    buildQuestion: (def) => ({
      type: 'confirm',
      name: 'typeScaleFluid',
      message: 'Use fluid (Utopia-style) font sizing?',
      default: def,
    }),
  },
  {
    path: 'tokens.spaceScale.static',
    id: 'spaceScaleFluid',
    tier: 'standard',
    default: false,
    parse: parseBoolean,
    configToPrompt: (configValue) => !(configValue as boolean),
    promptToConfig: (answer) => !(answer as boolean),
    buildQuestion: (def) => ({
      type: 'confirm',
      name: 'spaceScaleFluid',
      message: 'Use fluid (viewport-interpolated) spacing?',
      default: def,
    }),
  },
  {
    path: 'tokens.splitMode',
    id: 'splitMode',
    tier: 'standard',
    default: 'combined',
    parse: (raw) => parseEnum(raw, ['combined', 'per-module'] as const),
    buildQuestion: (def) => ({
      type: 'list',
      name: 'splitMode',
      message: 'Token export file splitting (only used when exporting token artifacts):',
      choices: [
        { name: 'combined — one file per format (default)', value: 'combined' },
        { name: 'per-module — one file per token module', value: 'per-module' },
      ],
      default: def,
    }),
  },

  // --- advanced tier ------------------------------------------------------
  {
    path: 'tokens.exportTokens',
    id: 'exportTokens',
    tier: 'advanced',
    default: false,
    parse: parseBoolean,
    buildQuestion: (def) => ({
      type: 'confirm',
      name: 'exportTokens',
      message: 'Export token artifacts (JSON/TS/JS) alongside CSS?',
      default: def,
    }),
  },
  {
    path: 'tokens.outputFormats',
    id: 'outputFormats',
    tier: 'advanced',
    default: ['JSON'],
    parse: (raw) => {
      const trimmed = raw.trim();
      const values = trimmed.startsWith('[')
        ? (JSON.parse(trimmed) as string[])
        : trimmed.split(',').map((v) => v.trim());
      const allowed = ['JSON', 'TypeScript', 'JavaScript'];
      for (const v of values) {
        if (!allowed.includes(v)) {
          throw new Error(`Invalid output format "${v}"; expected ${allowed.join(', ')}.`);
        }
      }
      return values;
    },
    when: (answers) => answers.exportTokens === true,
    buildQuestion: (def) => ({
      type: 'checkbox',
      name: 'outputFormats',
      message: 'Token export format(s):',
      choices: [
        { name: 'JSON', value: 'JSON', checked: (def as string[]).includes('JSON') },
        { name: 'TypeScript', value: 'TypeScript', checked: (def as string[]).includes('TypeScript') },
        { name: 'JavaScript', value: 'JavaScript', checked: (def as string[]).includes('JavaScript') },
      ],
      validate: (input) =>
        Array.isArray(input) && input.length > 0 ? true : 'Select at least one format.',
    }),
  },
  {
    path: 'tokens.writeTokenLookup',
    id: 'writeTokenLookup',
    tier: 'advanced',
    default: false,
    parse: parseBoolean,
    when: (answers) => answers.exportTokens === true,
    buildQuestion: (def) => ({
      type: 'confirm',
      name: 'writeTokenLookup',
      message: 'Export the token alias lookup JSON file?',
      default: def,
    }),
  },
  {
    path: 'tokens.tokenLookupOutputPath',
    id: 'tokenLookupOutputPath',
    tier: 'advanced',
    default: '',
    parse: (raw) => raw,
    when: (answers) => answers.exportTokens === true && answers.writeTokenLookup === true,
    buildQuestion: (def) => ({
      type: 'input',
      name: 'tokenLookupOutputPath',
      message: 'Token lookup output path (blank = <destination>/token-lookup.json):',
      default: def,
    }),
  },
  {
    path: 'tokens.writeVariantRegistry',
    id: 'writeVariantRegistry',
    tier: 'advanced',
    default: false,
    parse: parseBoolean,
    when: (answers) => answers.exportTokens === true,
    buildQuestion: (def) => ({
      type: 'confirm',
      name: 'writeVariantRegistry',
      message: 'Write the variant registry JSON output?',
      default: def,
    }),
  },
  {
    path: 'tokens.writeAllowedTokenTypes',
    id: 'writeAllowedTokenTypes',
    tier: 'advanced',
    default: false,
    parse: parseBoolean,
    when: (answers) => answers.exportTokens === true,
    buildQuestion: (def) => ({
      type: 'confirm',
      name: 'writeAllowedTokenTypes',
      message: 'Export the allowed token types JSON file?',
      default: def,
    }),
  },
  {
    path: 'tokens.extendedTokens.emitBreakpointVars',
    id: 'emitBreakpointVars',
    tier: 'advanced',
    default: false,
    parse: parseBoolean,
    buildQuestion: (def) => ({
      type: 'confirm',
      name: 'emitBreakpointVars',
      message: 'Emit the breakpoint scale as --zbk-breakpoint-* CSS vars (for JS use)?',
      default: def,
    }),
  },
  {
    path: 'tokens.extendedTokens.breakpoints',
    id: 'breakpoints',
    tier: 'advanced',
    default: true,
    parse: (raw) => {
      const trimmed = raw.trim();
      if (trimmed === 'true') return true;
      if (trimmed === 'false') return false;
      const values = trimmed.startsWith('[')
        ? (JSON.parse(trimmed) as string[])
        : trimmed.split(',').map((v) => v.trim());
      for (const v of values) {
        if (!(EXTENDED_TOKEN_BREAKPOINTS as readonly string[]).includes(v)) {
          throw new Error(
            `Invalid breakpoint "${v}"; expected ${EXTENDED_TOKEN_BREAKPOINTS.join(', ')}.`
          );
        }
      }
      return values;
    },
    configToPrompt: (configValue) => {
      if (configValue === false) return [];
      if (Array.isArray(configValue)) return configValue;
      return [...EXTENDED_TOKEN_BREAKPOINTS];
    },
    promptToConfig: (answer) => {
      const selected = answer as string[];
      if (selected.length === EXTENDED_TOKEN_BREAKPOINTS.length) return true;
      if (selected.length === 0) return false;
      return selected;
    },
    buildQuestion: (def) => {
      const selected = def as string[];
      return {
        type: 'checkbox',
        name: 'breakpoints',
        message: 'Responsive utility breakpoints (all selected = all, none = disabled):',
        choices: EXTENDED_TOKEN_BREAKPOINTS.map((bp) => ({
          name: bp,
          value: bp,
          checked: selected.includes(bp),
        })),
      };
    },
  },
];

/**
 * Settable-but-not-prompted config paths (structural values managed elsewhere
 * or only relevant when editing the file directly).
 */
export const EXTRA_SETTABLE_PATHS: Record<string, { parse: (raw: string) => unknown }> = {
  'tokens.tokenPath': { parse: (raw) => raw },
  'tokens.minify': { parse: parseBoolean },
};

/** All dot-paths accepted by `config set`/`config get`. */
export const KNOWN_PATHS: string[] = [
  ...CONFIG_OPTIONS.map((o) => o.path),
  ...Object.keys(EXTRA_SETTABLE_PATHS),
];

export function getOptionByPath(dotPath: string): ConfigOption | undefined {
  return CONFIG_OPTIONS.find((o) => o.path === dotPath);
}

/** Returns the parser for a known path, or undefined if the path is unknown. */
export function getParserForPath(dotPath: string): ((raw: string) => unknown) | undefined {
  const option = getOptionByPath(dotPath);
  if (option) return option.parse;
  return EXTRA_SETTABLE_PATHS[dotPath]?.parse;
}

function resolveDefault(option: ConfigOption, ctx: PromptContext): unknown {
  return option.resolveDefault ? option.resolveDefault(ctx) : option.default;
}

/**
 * Builds inquirer questions for the given tiers, seeding each default from the
 * current config value when present (so guided `config` acts as an edit).
 */
export function buildQuestions(
  tiers: OptionTier[],
  current: ZebkitConfig,
  ctx: PromptContext
): Question[] {
  return CONFIG_OPTIONS.filter((o) => tiers.includes(o.tier)).map((option) => {
    const currentValue = getAtPath(current, option.path);
    const baseDefault =
      currentValue !== undefined ? currentValue : resolveDefault(option, ctx);
    const promptDefault = option.configToPrompt
      ? option.configToPrompt(baseDefault)
      : baseDefault;
    const question = option.buildQuestion(promptDefault, ctx);
    if (option.when) question.when = option.when;
    return question;
  });
}

/**
 * Writes a complete, self-documenting token config: every option is set, using
 * the prompt answer when supplied, otherwise the current value, otherwise the
 * option default. Mutates and returns `config`.
 */
export function applyOptionValues(
  config: ZebkitConfig,
  answers: Record<string, unknown>,
  ctx: PromptContext
): ZebkitConfig {
  for (const option of CONFIG_OPTIONS) {
    let value: unknown;
    if (Object.prototype.hasOwnProperty.call(answers, option.id)) {
      const answer = answers[option.id];
      value = option.promptToConfig ? option.promptToConfig(answer) : answer;
    } else {
      const currentValue = getAtPath(config, option.path);
      value = currentValue !== undefined ? currentValue : resolveDefault(option, ctx);
    }
    setAtPath(config, option.path, value);
  }
  return config;
}
