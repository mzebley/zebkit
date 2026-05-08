import { AllowedTokenTypes, TokenInterface, TokenObject } from '@definitions/tokens';
import { LayerName, DEFAULT_LAYER } from '@definitions/layers';
import {
  DtcgRoot,
  DtcgGroup,
  DtcgTokenType,
  DtcgTokenValue,
  TokensStudioRoot,
  TokensStudioGroup,
  TokensStudioValue,
} from '../types.js';

// ─── Reverse type mapping ─────────────────────────────────────────────────────

const DTCG_TO_ZEBKIT: Record<DtcgTokenType, AllowedTokenTypes> = {
  color: 'color',
  dimension: 'dimension',
  fontFamily: 'fontFamily',
  fontWeight: 'fontWeight',
  duration: 'transition',
  cubicBezier: 'transition',
  number: 'zIndex',
  string: 'content',
  strokeWidth: 'borderWidth',
  opacity: 'opacity',
  shadow: 'boxShadow',
  gradient: 'color',
  typography: 'fontFamily',
};

// ─── Format detection ─────────────────────────────────────────────────────────

function isTokensStudioFormat(raw: unknown): raw is TokensStudioRoot {
  if (typeof raw !== 'object' || raw === null) return false;
  // Tokens Studio uses "value" / "type" without $-prefix on leaf nodes
  for (const val of Object.values(raw as Record<string, unknown>)) {
    if (typeof val === 'object' && val !== null && 'value' in val && 'type' in val) {
      return true;
    }
  }
  return false;
}

function isDtcgFormat(raw: unknown): raw is DtcgRoot {
  if (typeof raw !== 'object' || raw === null) return false;
  for (const val of Object.values(raw as Record<string, unknown>)) {
    if (typeof val === 'object' && val !== null && '$value' in val) {
      return true;
    }
  }
  return false;
}

// ─── Tokens Studio → DTCG normalisation ──────────────────────────────────────

function normalizeTokensStudioGroup(group: TokensStudioGroup): DtcgGroup {
  const result: DtcgGroup = {};
  for (const [key, value] of Object.entries(group)) {
    if (key === '$metadata') continue;
    if (isTokensStudioLeaf(value)) {
      const leaf = value as TokensStudioValue;
      const dtcgEntry: DtcgTokenValue = {
        $value: leaf.value,
        $type: (leaf.type as DtcgTokenType) ?? 'string',
      };
      if (leaf.description) dtcgEntry.$description = leaf.description;
      if (leaf.$extensions) dtcgEntry.$extensions = leaf.$extensions as DtcgTokenValue['$extensions'];
      result[key] = dtcgEntry;
    } else {
      result[key] = normalizeTokensStudioGroup(value as TokensStudioGroup);
    }
  }
  return result;
}

function isTokensStudioLeaf(val: unknown): val is TokensStudioValue {
  return typeof val === 'object' && val !== null && 'value' in val && 'type' in val;
}

function normalizeToDto(raw: DtcgRoot | TokensStudioRoot): DtcgRoot {
  if (isDtcgFormat(raw)) return raw as DtcgRoot;
  if (isTokensStudioFormat(raw)) {
    const result: DtcgRoot = {};
    const meta = (raw as TokensStudioRoot).$metadata;
    if (meta) result.$metadata = { tokenSetOrder: meta.tokenSetOrder };
    for (const [key, value] of Object.entries(raw as TokensStudioRoot)) {
      if (key === '$metadata') continue;
      result[key] = normalizeTokensStudioGroup(value as TokensStudioGroup);
    }
    return result;
  }
  // Unknown format: return as-is (best effort)
  return raw as DtcgRoot;
}

// ─── DTCG leaf extraction ─────────────────────────────────────────────────────

function isDtcgLeaf(val: unknown): val is DtcgTokenValue {
  return typeof val === 'object' && val !== null && '$value' in val;
}

function extractGroup(group: DtcgGroup): Record<string, DtcgTokenValue> {
  const flat: Record<string, DtcgTokenValue> = {};
  for (const [key, val] of Object.entries(group)) {
    if (isDtcgLeaf(val)) {
      flat[key] = val;
    } else {
      // Flatten nested groups with dotted keys
      const nested = extractGroup(val as DtcgGroup);
      for (const [nestedKey, nestedVal] of Object.entries(nested)) {
        flat[`${key}.${nestedKey}`] = nestedVal;
      }
    }
  }
  return flat;
}

// ─── Main transform ───────────────────────────────────────────────────────────

export interface ZebkitModuleResult {
  key: string;
  layer: LayerName;
  tokens: TokenInterface;
}

/**
 * Converts a W3C DTCG (or Tokens Studio) token document back to Zebkit token
 * module objects. These can be written as JSON override files compatible with
 * Zebkit's `customTokenPath` mechanism.
 *
 * Each top-level group in the DTCG document becomes one Zebkit module. The
 * module key is prefixed with "zbk-" to match Zebkit's convention.
 *
 * Original Zebkit type information is recovered from $extensions.zebkit.type
 * when present; otherwise the DTCG type is reverse-mapped.
 */
export function dtcgToZebkit(
  raw: DtcgRoot | TokensStudioRoot
): ZebkitModuleResult[] {
  const dtcg = normalizeToDto(raw);
  const results: ZebkitModuleResult[] = [];

  for (const [groupKey, groupValue] of Object.entries(dtcg)) {
    if (groupKey === '$metadata') continue;
    if (typeof groupValue !== 'object' || groupValue === null) continue;

    const flat = extractGroup(groupValue as DtcgGroup);
    const tokenMap: TokenInterface = {};

    for (const [tokenKey, dtcgToken] of Object.entries(flat)) {
      const zebkitExt = dtcgToken.$extensions?.zebkit;

      // Recover the exact Zebkit type from extensions if available
      const zebkitType: AllowedTokenTypes = zebkitExt?.type
        ? (zebkitExt.type as AllowedTokenTypes)
        : (DTCG_TO_ZEBKIT[dtcgToken.$type] ?? 'content');

      const tokenObj: TokenObject = {
        value: dtcgToken.$value,
        type: zebkitType,
        description: dtcgToken.$description ?? '',
      };

      if (zebkitExt?.a11y !== undefined) {
        tokenObj.a11y = zebkitExt.a11y as boolean | string;
      }

      tokenMap[tokenKey] = tokenObj;
    }

    if (Object.keys(tokenMap).length > 0) {
      results.push({
        key: `zbk-${groupKey}`,
        layer: DEFAULT_LAYER,
        tokens: tokenMap,
      });
    }
  }

  return results;
}

/**
 * Computes a diff between a pulled token set and the source token map.
 * Returns counts of added, changed, and removed tokens per module.
 */
export function diffTokens(
  pulled: ZebkitModuleResult[],
  source: Record<string, TokenInterface>
): { added: number; changed: number; removed: number } {
  let added = 0;
  let changed = 0;
  let removed = 0;

  for (const { key, tokens } of pulled) {
    const sourceModule = source[key];
    if (!sourceModule) {
      added += Object.keys(tokens).length;
      continue;
    }
    for (const [tokenKey, token] of Object.entries(tokens)) {
      const src = sourceModule[tokenKey];
      if (!src) {
        added++;
      } else if (String(src.value) !== String(token.value)) {
        changed++;
      }
    }
    for (const tokenKey of Object.keys(sourceModule)) {
      if (!tokens[tokenKey]) removed++;
    }
  }

  // Count modules entirely removed
  for (const key of Object.keys(source)) {
    if (!pulled.find((r) => r.key === key)) {
      removed += Object.keys(source[key]).length;
    }
  }

  return { added, changed, removed };
}
