import chalk from 'chalk';
import { PenpotFileResponse } from './types.js';

export interface PenpotClientConfig {
  instanceUrl: string;
  accessToken: string;
}

function buildHeaders(accessToken: string): Record<string, string> {
  return {
    Authorization: `Token ${accessToken}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
}

/**
 * Fetches a Penpot file's full data via the RPC API.
 * Returns undefined and logs a warning if the file cannot be fetched.
 */
export async function fetchPenpotFile(
  fileId: string,
  config: PenpotClientConfig
): Promise<PenpotFileResponse | undefined> {
  const url = `${config.instanceUrl}/api/rpc/command/get-file?id=${fileId}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: buildHeaders(config.accessToken),
    });
  } catch (error) {
    console.error(chalk.red(`Network error fetching Penpot file: ${error}`));
    return undefined;
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    console.error(
      chalk.red(
        `Penpot API error ${response.status} fetching file ${fileId}: ${body}`
      )
    );
    return undefined;
  }

  try {
    return (await response.json()) as PenpotFileResponse;
  } catch {
    console.error(chalk.red('Failed to parse Penpot API response as JSON.'));
    return undefined;
  }
}

/**
 * Resolves Penpot client config from environment variables and optional config overrides.
 */
export function resolvePenpotClientConfig(overrides?: {
  instanceUrl?: string;
  fileId?: string;
}): { client: PenpotClientConfig; fileId: string } | undefined {
  const instanceUrl =
    overrides?.instanceUrl ??
    process.env.PENPOT_INSTANCE_URL ??
    'https://design.penpot.app';

  const accessToken = process.env.PENPOT_ACCESS_TOKEN;
  if (!accessToken) {
    console.error(
      chalk.red(
        'PENPOT_ACCESS_TOKEN environment variable is not set.\n' +
          'Generate a token in Penpot → Settings → Access tokens and add it to your .env file.'
      )
    );
    return undefined;
  }

  const fileId = overrides?.fileId ?? process.env.PENPOT_FILE_ID;
  if (!fileId) {
    console.error(
      chalk.red(
        'No Penpot file ID found. Set PENPOT_FILE_ID in your .env or add "penpot.fileId" to zebkit.config.json.'
      )
    );
    return undefined;
  }

  return { client: { instanceUrl, accessToken }, fileId };
}
