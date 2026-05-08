/**
 * W3C DTCG / Tokens Studio → Zebkit transform.
 *
 * Converts a token document exported from Penpot back into Zebkit-compatible
 * JSON override files. These files can be pointed at via the `customTokenPath`
 * option in zebkit.config.json, causing the standard `build:tokens` pipeline
 * to use the designer-edited values instead of the source defaults.
 *
 * ── Format handling ───────────────────────────────────────────────────────────
 *
 * Penpot currently exports tokens in Tokens Studio format (keys without "$"
 * prefix) even though it imports W3C DTCG format (keys with "$" prefix). This
 * asymmetry is a known issue; see:
 *   https://community.penpot.app/t/token-export-is-tokens-studio-format-not-dtcg-2025-10/10544
 *
 * This module detects the format automatically and normalises Tokens Studio to
 * DTCG before any further processing, so the main transform only ever handles
 * one shape.
 *
 * ── Type recovery ─────────────────────────────────────────────────────────────
 *
 * DTCG has fewer types than Zebkit (e.g. both "rootSize" and "spacing" compile
 * to "dimension"). When $extensions.zebkit.type is present (written by push),
 * the original Zebkit type is restored exactly. When absent (e.g. tokens created
 * directly in Penpot without going through push first), a best-effort reverse
 * mapping is applied via DTCG_TO_ZEBKIT.
 *
 * ── Output format ─────────────────────────────────────────────────────────────
 *
 * Each top-level DTCG group becomes one ZebkitModuleResult with:
 *   - key: "zbk-<groupName>" (re-adds the prefix stripped during push)
 *   - tokens: a flat TokenInterface map matching Zebkit's source format
 * These are written as individual JSON files by pull.ts and are compatible
 * with Zebkit's customTokenPath directory mechanism.
 */

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

/**
 * Fallback mapping from DTCG $type to Zebkit AllowedTokenTypes, used when
 * $extensions.zebkit.type is not present on a token.
 *
 * This is intentionally lossy for some types: DTCG "dimension" covers Zebkit's
 * spacing, sizing, rootSize, rootFontSize, fontSize, lineHeight, letterSpacing,
 * and borderRadius — all of which collapse to the generic "dimension" here.
 * The round-trip extensions mechanism avoids this loss for tokens that went
 * through `penpot:push` first.
 */
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

/**
 * Heuristic check for Tokens Studio format.
 * Tokens Studio leaf nodes use "value" and "type" without "$" prefix;
 * finding any top-level entry with both keys (but without "$value") is
 * sufficient to identify the format.
 */
function isTokensStudioFormat(raw: unknown): raw is TokensStudioRoot {
  if (typeof raw !== 'object' || raw === null) return false;
  for (const val of Object.values(raw as Record<string, unknown>)) {
    if (typeof val === 'object' && val !== null && 'value' in val && 'type' in val) {
      return true;
    }
  }
  return false;
}

/**
 * Heuristic check for W3C DTCG format.
 * DTCG leaf nodes have a "$value" key. Finding any top-level entry with
 * "$value" confirms the format.
 */
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

/**
 * Recursively converts a Tokens Studio group to DTCG format by adding "$"
 * prefixes to leaf node keys. Group nodes (without a "value" key) are
 * traversed recursively. The $metadata key is skipped because it is already
 * present at the root and should not be normalised.
 */
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
      // Preserve any $extensions already on the Tokens Studio token (e.g.
      // $extensions.zebkit written during a previous push)
      if (leaf.$extensions) dtcgEntry.$extensions = leaf.$extensions as DtcgTokenValue['$extensions'];
      result[key] = dtcgEntry;
    } else {
      result[key] = normalizeTokensStudioGroup(value as TokensStudioGroup);
    }
  }
  return result;
}

/** Returns true when `val` is a Tokens Studio leaf node (has "value" and "type"). */
function isTokensStudioLeaf(val: unknown): val is TokensStudioValue {
  return typeof val === 'object' && val !== null && 'value' in val && 'type' in val;
}

/**
 * Normalises any supported input format to DTCG so the rest of the pipeline
 * only needs to handle one shape.
 *
 * Priority:
 *   1. Already DTCG ($value present) → return as-is
 *   2. Tokens Studio format (value/type without $) → convert each group
 *   3. Unknown format → return as-is with a best-effort treatment
 */
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
  return raw as DtcgRoot;
}

// ─── DTCG leaf extraction ─────────────────────────────────────────────────────

/** Returns true when `val` is a DTCG leaf token (has "$value"). */
function isDtcgLeaf(val: unknown): val is DtcgTokenValue {
  return typeof val === 'object' && val !== null && '$value' in val;
}

/**
 * Flattens a DTCG group tree into a map of dotted-key → DtcgTokenValue.
 *
 * DTCG allows arbitrary nesting of sub-groups. Zebkit's TokenInterface is a
 * flat map where nesting is expressed with dot-separated keys (e.g. the DTCG
 * tree { brand: { primary: { $value: ... } } } becomes "brand.primary" in the
 * output). This mirrors how Zebkit's build pipeline references nested tokens.
 */
function extractGroup(group: DtcgGroup): Record<string, DtcgTokenValue> {
  const flat: Record<string, DtcgTokenValue> = {};
  for (const [key, val] of Object.entries(group)) {
    if (isDtcgLeaf(val)) {
      flat[key] = val;
    } else {
      const nested = extractGroup(val as DtcgGroup);
      for (const [nestedKey, nestedVal] of Object.entries(nested)) {
        flat[`${key}.${nestedKey}`] = nestedVal;
      }
    }
  }
  return flat;
}

// ─── Main transform ───────────────────────────────────────────────────────────

/**
 * A single reconstructed Zebkit token module, ready to be written to disk as
 * a JSON override file (e.g. zbk-button.tokens.json).
 */
export interface ZebkitModuleResult {
  /** Module key with "zbk-" prefix restored, e.g. "zbk-button". */
  key: string;
  /**
   * Layer assignment. Pull always assigns DEFAULT_LAYER ("base") because the
   * DTCG format has no concept of CSS cascade layers. If a specific layer
   * matters for the override, it should be set manually in the source token
   * file rather than in the pulled output.
   */
  layer: LayerName;
  /** Flat TokenInterface map of token key → TokenObject. */
  tokens: TokenInterface;
}

/**
 * Converts a W3C DTCG (or Tokens Studio) token document to an array of Zebkit
 * module objects that can be written as JSON override files.
 *
 * Each top-level group in the input becomes one ZebkitModuleResult. Groups
 * named "$metadata" are skipped. The "zbk-" prefix is re-added to module keys
 * to match Zebkit's internal module naming convention.
 *
 * @param raw  A parsed JSON object in either DTCG or Tokens Studio format.
 * @returns    One result per non-metadata group in the input document.
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

      // Prefer the original Zebkit type stored in $extensions; fall back to
      // the lossy DTCG reverse-map for tokens without round-trip metadata.
      const zebkitType: AllowedTokenTypes = zebkitExt?.type
        ? (zebkitExt.type as AllowedTokenTypes)
        : (DTCG_TO_ZEBKIT[dtcgToken.$type] ?? 'content');

      const tokenObj: TokenObject = {
        value: dtcgToken.$value,
        type: zebkitType,
        description: dtcgToken.$description ?? '',
      };

      // Restore the a11y flag if it was preserved during push
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
 * Computes a diff between a pulled token set and the current source token map.
 *
 * Used by pull.ts to give the developer a quick summary of what changed in
 * Penpot before they apply the override files. Does not validate semantic
 * correctness — it only compares string representations of token values.
 *
 * @param pulled  Modules reconstructed from the Penpot token export.
 * @param source  Modules compiled from the Zebkit source (the current baseline).
 * @returns       Counts of tokens added, value-changed, and removed.
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
      // Entire module is new — every token in it is "added"
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
    // Tokens present in source but absent from pull are "removed"
    for (const tokenKey of Object.keys(sourceModule)) {
      if (!tokens[tokenKey]) removed++;
    }
  }

  // Modules entirely absent from the pull but present in source
  for (const key of Object.keys(source)) {
    if (!pulled.find((r) => r.key === key)) {
      removed += Object.keys(source[key]).length;
    }
  }

  return { added, changed, removed };
}
