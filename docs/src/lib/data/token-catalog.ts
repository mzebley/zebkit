import { compiledTokens } from './compiled-tokens';
import { buildTokenRows, type TokenRow } from '../utils/token-docs';

export interface TokenGroup {
  /** Compiled group key, e.g. `zbk-spacing`. */
  key: string;
  /** Human label, e.g. `spacing`. */
  label: string;
  rows: TokenRow[];
}

const ZBK = 'zbk-';

/** Every compiled token group, as catalog-ready row sets. Generated from the synced token JSON. */
export const tokenGroups: TokenGroup[] = Object.keys(compiledTokens)
  .map((key) => ({
    key,
    label: key.startsWith(ZBK) ? key.slice(ZBK.length) : key,
    rows: buildTokenRows(key, compiledTokens[key])
  }))
  .sort((a, b) => a.label.localeCompare(b.label));

/** All distinct token `type` values present in the compiled set (for filtering). */
export const tokenTypes: string[] = Array.from(
  new Set(tokenGroups.flatMap((g) => g.rows.map((r) => r.type)))
).sort();

export const totalTokenCount = tokenGroups.reduce((n, g) => n + g.rows.length, 0);
