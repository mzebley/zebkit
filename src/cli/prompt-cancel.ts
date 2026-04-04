import chalk from 'chalk';

export function isPromptCancelError(error: unknown): error is { name: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error as { name?: string }).name === 'ExitPromptError'
  );
}

export function handlePromptCancel(commandName: string): void {
  console.log(chalk.yellow(`\n${commandName} cancelled.`));
}
