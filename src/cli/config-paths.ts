import path from 'path';
import fs from 'fs-extra';
import type { ZebkitConfig } from '../scripts/config';

/**
 * Reads a value from a config object by dot-path (e.g. `tokens.fonts.strategy`).
 * Returns `undefined` if any segment along the path is missing.
 */
export function getAtPath(obj: unknown, dotPath: string): unknown {
  const segments = dotPath.split('.');
  let current: unknown = obj;

  for (const segment of segments) {
    if (current == null || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }

  return current;
}

/**
 * Sets a value on a config object by dot-path, creating intermediate objects as
 * needed. Mutates and returns `obj`.
 */
export function setAtPath<T extends object>(obj: T, dotPath: string, value: unknown): T {
  const segments = dotPath.split('.');
  let current: Record<string, unknown> = obj as Record<string, unknown>;

  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i];
    const next = current[segment];
    if (next == null || typeof next !== 'object') {
      current[segment] = {};
    }
    current = current[segment] as Record<string, unknown>;
  }

  current[segments[segments.length - 1]] = value;
  return obj;
}

/**
 * Writes a config object back to disk as pretty-printed JSON.
 */
export async function writeConfigToPath(
  configPath: string,
  config: ZebkitConfig
): Promise<void> {
  await fs.writeJson(path.resolve(configPath), config, { spaces: 2 });
}
