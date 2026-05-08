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
   * Controls which responsive breakpoint utility classes are generated.
   * true or absent = all 5 breakpoints (default).
   * false = no responsive utility classes.
   * string[] = only the named breakpoints.
   */
  breakpoints?: boolean | ExtendedTokenBreakpoint[];
};

export type TokensConfig = {
  selectedComponents?: string[];
  includeAllComponents?: boolean;
  destinationPath?: string;
  assetFilePath?: string;
  theme?: string;
  customTokenPath?: string;
  customThemeName?: string;
  exportTokens?: boolean;
  splitMode?: 'combined' | 'per-module';
  outputFormats?: Array<'JSON' | 'TypeScript' | 'JavaScript'>;
  writeAllowedTokenTypes?: boolean;
  writeTokenLookup?: boolean;
  writeVariantRegistry?: boolean;
  tokenLookupOutputPath?: string;
  extendedTokens?: ExtendedTokensConfig;
};

export type ComponentsConfig = {
  selectedComponents?: string[];
  jsOutput?: string;
};

export type PenpotConfig = {
  /** Penpot instance URL. Defaults to https://design.penpot.app */
  instanceUrl?: string;
  /** Target Penpot file UUID. Overrides the PENPOT_FILE_ID env var. */
  fileId?: string;
  /** Output path for pulled token override files. Defaults to ./dist/penpot-pull */
  pullOutputPath?: string;
  /** Additional Zebkit token types to exclude from the push output. */
  skipTypes?: string[];
};

export type ZebkitConfig = {
  tokens?: TokensConfig;
  components?: ComponentsConfig;
  penpot?: PenpotConfig;
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
