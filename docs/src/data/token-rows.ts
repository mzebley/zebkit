import { compiledTokens } from './compiled-tokens';
import { buildTokenRows } from '../utils/token-docs';

export function getTokensForKey(tokenKey: string) {
  return compiledTokens[tokenKey];
}

export function getTokenRows(tokenKey: string) {
  return buildTokenRows(tokenKey, getTokensForKey(tokenKey));
}
