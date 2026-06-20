import path from 'path';
import type { ZebkitConfig } from '../../scripts/config';
import { getAtPath, setAtPath } from '../config-paths';
import {
  applyOptionValues,
  buildQuestions,
  getParserForPath,
  KNOWN_PATHS,
  type PromptContext,
} from '../config-options';

export interface ConfigCommandDeps {
  readConfig: () => Promise<{ config: ZebkitConfig; path: string } | undefined>;
  writeConfig: (configPath: string, config: ZebkitConfig) => Promise<void>;
  prompt: (...args: any[]) => Promise<any>;
  getZebkitPackageRoot: () => string;
  getBuiltInThemeNames: (packageRoot?: string) => Promise<string[]>;
  getThemePromptChoices: (themeNames: string[]) => string[];
  handlePromptCancel: (commandName: string) => void;
  isPromptCancelError: (error: unknown) => error is { name: string };
  log: (message: string) => void;
}

async function requireConfig(
  deps: ConfigCommandDeps
): Promise<{ config: ZebkitConfig; path: string }> {
  const result = await deps.readConfig();
  if (!result) {
    throw new Error('No zebkit.config.json found. Run `zebkit init` first.');
  }
  return result;
}

function assertKnownPath(dotPath: string): void {
  if (!KNOWN_PATHS.includes(dotPath)) {
    throw new Error(
      `Unknown config path "${dotPath}".\nValid paths:\n  ${KNOWN_PATHS.join('\n  ')}`
    );
  }
}

export async function runConfigGuided(deps: ConfigCommandDeps): Promise<void> {
  try {
    const { config, path: configPath } = await requireConfig(deps);
    const packageRoot = deps.getZebkitPackageRoot();
    const ctx: PromptContext = {
      themeChoices: deps.getThemePromptChoices(
        await deps.getBuiltInThemeNames(packageRoot)
      ),
      defaultProjectName: path.basename(process.cwd()),
    };

    const questions: any[] = buildQuestions(['quick', 'standard'], config, ctx);
    questions.push({
      type: 'confirm',
      name: 'configureAdvanced',
      message: 'Configure token export / advanced options?',
      default: false,
    });

    let answers = await deps.prompt(questions);

    if (answers.configureAdvanced) {
      const advancedAnswers = await deps.prompt(
        buildQuestions(['advanced'], config, ctx)
      );
      answers = { ...answers, ...advancedAnswers };
    }

    applyOptionValues(config, answers, ctx);
    await deps.writeConfig(configPath, config);
    deps.log(`Updated ${configPath}`);
  } catch (error) {
    if (deps.isPromptCancelError(error)) {
      deps.handlePromptCancel('Config');
      return;
    }
    throw error;
  }
}

export async function runConfigSet(
  deps: ConfigCommandDeps,
  dotPath: string,
  rawValue: string
): Promise<void> {
  assertKnownPath(dotPath);
  const parser = getParserForPath(dotPath);
  if (!parser) {
    throw new Error(`No parser registered for "${dotPath}".`);
  }
  const value = parser(rawValue);

  const { config, path: configPath } = await requireConfig(deps);
  setAtPath(config, dotPath, value);
  await deps.writeConfig(configPath, config);
  deps.log(`Set ${dotPath} = ${JSON.stringify(value)}`);
}

export async function runConfigGet(
  deps: ConfigCommandDeps,
  dotPath: string
): Promise<void> {
  assertKnownPath(dotPath);
  const { config } = await requireConfig(deps);
  const value = getAtPath(config, dotPath);
  deps.log(value === undefined ? `${dotPath} is not set` : JSON.stringify(value));
}
