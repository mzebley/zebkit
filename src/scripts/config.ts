import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';

export type TokensConfig = {
  selectedComponents?: string[];
  includeAllComponents?: boolean;
  destinationPath?: string;
  assetFilePath?: string;
  theme?: 'default' | 'quiet-boutique' | 'dark-boutique' | 'custom';
  customTokenPath?: string;
  customThemeName?: string;
  exportTokens?: boolean;
  splitMode?: 'combined' | 'per-module';
  outputFormats?: Array<'JSON' | 'TypeScript' | 'JavaScript'>;
  writeVariantRegistry?: boolean;
  tokenLookupOutputPath?: string;
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
