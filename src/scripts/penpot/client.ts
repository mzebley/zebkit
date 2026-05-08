/**
 * Penpot API client for the token sync pipeline.
 *
 * Penpot exposes an RPC-style REST API at /api/rpc/command/<command-name>.
 * Authentication uses a personal access token (PAT) issued from
 * Penpot → Settings → Access tokens. Tokens are sent as a bearer value with
 * the non-standard scheme "Token" rather than "Bearer".
 *
 * The API responds in transit+json by default; requesting application/json
 * returns plain JSON which is simpler to work with here.
 *
 * API reference: https://help.penpot.app/technical-guide/integration/
 */

import chalk from 'chalk';
import { PenpotFileResponse } from './types.js';

/** Connection details required to call the Penpot API. */
export interface PenpotClientConfig {
  /** Base URL of the Penpot instance, e.g. https://design.penpot.app */
  instanceUrl: string;
  /** Personal access token generated in Penpot → Settings → Access tokens */
  accessToken: string;
}

/**
 * Builds the HTTP headers required by the Penpot API.
 * Penpot uses "Token <value>" rather than the more common "Bearer <value>"
 * scheme, so this must not be changed to match other APIs.
 */
function buildHeaders(accessToken: string): Record<string, string> {
  return {
    Authorization: `Token ${accessToken}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
}

/**
 * Fetches a Penpot file's full data payload via the get-file RPC command.
 *
 * The response includes the file's name, metadata, and a `data` object that
 * contains pages, components, and — when tokens have been imported — a
 * `tokens` key with the design token sets.
 *
 * Returns undefined (and logs a descriptive error) if the request fails so
 * callers can degrade gracefully without throwing.
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
    // Penpot may respond in transit+json if the Accept header was not honoured;
    // the caller should fall back to --file mode in that case.
    console.error(chalk.red('Failed to parse Penpot API response as JSON.'));
    return undefined;
  }
}

/**
 * Resolves the full Penpot client configuration from (in priority order):
 *   1. Explicit overrides passed by the caller (from zebkit.config.json)
 *   2. Environment variables (PENPOT_INSTANCE_URL, PENPOT_ACCESS_TOKEN, PENPOT_FILE_ID)
 *   3. Hard-coded default for instanceUrl (https://design.penpot.app)
 *
 * Returns undefined and logs actionable error messages if required values are
 * missing, so callers can exit cleanly without a thrown exception.
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
