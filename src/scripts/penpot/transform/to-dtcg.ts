/**
 * Zebkit → W3C DTCG transform.
 *
 * Converts a compiled Zebkit token map (Record<moduleKey, TokenInterface>)
 * into a single W3C Design Tokens Community Group (DTCG) JSON document
 * suitable for importing into Penpot via Assets → Design Tokens → Import.
 *
 * ── Key design decisions ──────────────────────────────────────────────────────
 *
 * 1. Module key normalisation
 *    Zebkit module keys carry the "zbk-" prefix (e.g. "zbk-color"). DTCG groups
 *    use the bare name ("color"). Stripping the prefix means that Zebkit alias
 *    references like `{color.butterfield-50}` remain valid in the DTCG output
 *    without any string transformation — the dot-notation paths already match.
 *
 * 2. Alias pass-through
 *    A Zebkit token whose value is a reference string (e.g. "{app.ink}") is
 *    written verbatim as the DTCG $value. DTCG uses the same curly-brace syntax
 *    for aliases, so no translation is required.
 *
 * 3. Topological ordering
 *    Penpot resolves aliases in document order: a referenced group must appear
 *    before the group that references it in $metadata.tokenSetOrder. The
 *    topoSort function builds a dependency graph from the alias patterns in each
 *    module and emits an ordered list that satisfies this constraint.
 *
 * 4. Round-trip fidelity via $extensions.zebkit
 *    DTCG has fewer types than Zebkit (e.g. both "rootSize" and "spacing" map
 *    to DTCG "dimension"). To avoid losing precision on pull, the original
 *    AllowedTokenTypes value and a11y flag are stored in $extensions.zebkit on
 *    every token. The from-dtcg transformer reads this back during a pull.
 *
 * 5. Skipped types
 *    "utility", "setting", and "asset" tokens carry build-time metadata that
 *    has no meaningful representation as a Penpot design variable. They are
 *    omitted from the output. "googleFont" is also omitted because Penpot
 *    manages typeface imports separately.
 */

import { AllowedTokenTypes, TokenInterface } from '@definitions/tokens';
import { LayerName } from '@definitions/layers';
import {
  DtcgRoot,
  DtcgGroup,
  DtcgTokenType,
  DtcgTokenValue,
  DtcgMetadata,
} from '../types.js';

// ─── Type mapping ─────────────────────────────────────────────────────────────

/**
 * Maps each Zebkit AllowedTokenType to the closest W3C DTCG $type.
 *
 * Some Zebkit types are more granular than DTCG allows:
 *   - rootSize / rootFontSize → "dimension" (clamp expressions are build-time;
 *     the raw rem value is what gets pushed)
 *   - spacing / sizing / dimension → all "dimension"
 *   - borderColor → "color" (same semantics, different naming)
 *   - transition → "string" (DTCG "duration" only covers a bare time value,
 *     not a full transition shorthand)
 *   - boolean → "string" (DTCG has no boolean type)
 *
 * Types absent from this map (utility, setting, asset, googleFont) are
 * intentionally skipped — see SKIP_TYPES below.
 */
const ZEBKIT_TO_DTCG: Partial<Record<AllowedTokenTypes, DtcgTokenType>> = {
  color: 'color',
  borderColor: 'color',
  spacing: 'dimension',
  sizing: 'dimension',
  dimension: 'dimension',
  rootSize: 'dimension',
  rootFontSize: 'dimension',
  fontSize: 'dimension',
  lineHeight: 'dimension',
  letterSpacing: 'dimension',
  borderRadius: 'dimension',
  borderWidth: 'strokeWidth',
  fontWeight: 'fontWeight',
  fontFamily: 'fontFamily',
  opacity: 'opacity',
  boxShadow: 'shadow',
  zIndex: 'number',
  fontStyle: 'string',
  textDecoration: 'string',
  textTransform: 'string',
  textAlignment: 'string',
  display: 'string',
  content: 'string',
  flex: 'string',
  borderStyle: 'string',
  transition: 'string',
  boolean: 'string',
};

/**
 * Token types that carry no meaningful design information in Penpot and are
 * omitted from the push output:
 *   - utility: SCSS generator flags, not design values
 *   - setting: build-time component configuration (defaultOptions etc.)
 *   - asset: file path references resolved at build time
 * googleFont tokens are also absent from ZEBKIT_TO_DTCG and therefore skipped
 * implicitly — Penpot handles font loading through its own UI.
 */
const SKIP_TYPES = new Set<AllowedTokenTypes>(['utility', 'setting', 'asset']);

// ─── Dependency ordering ──────────────────────────────────────────────────────

/**
 * Derives a topologically sorted list of bare module keys (without "zbk-"
 * prefix) such that every module appears *after* all modules it references.
 *
 * Why this matters: Penpot processes token sets in the order specified by
 * $metadata.tokenSetOrder. If "button" references "{app.ink}" but "app" appears
 * after "button" in the list, Penpot cannot resolve the alias. The sort ensures
 * primitive modules (no outgoing references) come first, followed by semantic
 * modules, then component modules.
 *
 * Algorithm: DFS post-order on the reference graph. Cycles are impossible in a
 * valid Zebkit token set because the build pipeline rejects self-referential
 * chains, but the visited-set guards against them anyway.
 */
function topoSort(tokens: Record<string, TokenInterface>): string[] {
  const moduleKeys = Object.keys(tokens);

  // Build adjacency: bareKey → Set<bareKey> of modules it depends on
  const deps = new Map<string, Set<string>>();
  for (const [moduleKey, tokenMap] of Object.entries(tokens)) {
    const bare = stripPrefix(moduleKey);
    const referenced = new Set<string>();
    for (const token of Object.values(tokenMap)) {
      if (typeof token.value === 'string') {
        // Alias pattern: {module.tokenKey} — capture the module part
        for (const m of token.value.matchAll(/\{([^.}]+)\.[^}]+\}/g)) {
          const ref = m[1];
          // Only record dependencies on modules that are actually in the compiled set
          if (ref !== bare && moduleKeys.some((k) => stripPrefix(k) === ref)) {
            referenced.add(ref);
          }
        }
      }
    }
    deps.set(bare, referenced);
  }

  const visited = new Set<string>();
  const order: string[] = [];

  function visit(key: string) {
    if (visited.has(key)) return;
    visited.add(key);
    // Visit dependencies before the node itself (post-order = dependencies first)
    for (const dep of deps.get(key) ?? []) {
      visit(dep);
    }
    order.push(key);
  }

  for (const moduleKey of moduleKeys) {
    visit(stripPrefix(moduleKey));
  }

  return order;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Strips the "zbk-" prefix from a Zebkit module key.
 * Used to derive the DTCG group name, which must match the first segment of
 * alias references (e.g. "zbk-color" → "color" to match "{color.foo}").
 */
function stripPrefix(key: string): string {
  return key.startsWith('zbk-') ? key.slice(4) : key;
}

/**
 * Converts a single Zebkit token entry to a DTCG token object.
 *
 * Returns undefined when the token type should be skipped (utility, setting,
 * asset) or has no DTCG equivalent, so callers can safely filter with `if`.
 *
 * The original Zebkit type and a11y value are preserved in $extensions.zebkit
 * so that a subsequent `penpot:pull` can reconstruct the exact source token
 * without information loss through the DTCG type system.
 */
function convertToken(
  _key: string,
  token: { value: string | number; type: string; description: string; a11y?: boolean | string },
  extraSkipTypes?: Set<string>
): DtcgTokenValue | undefined {
  const type = token.type as AllowedTokenTypes;

  if (SKIP_TYPES.has(type) || extraSkipTypes?.has(type)) return undefined;

  const dtcgType = ZEBKIT_TO_DTCG[type];
  if (!dtcgType) return undefined;

  const result: DtcgTokenValue = {
    $value: token.value,
    $type: dtcgType,
  };

  if (token.description) result.$description = token.description;

  // Store round-trip metadata. Pull reads $extensions.zebkit.type first; if
  // absent it falls back to a lossy DTCG reverse-map (e.g. "dimension" → the
  // generic "dimension" Zebkit type instead of the original "rootSize").
  const ext: { type: string; a11y?: boolean | string } = { type };
  if (token.a11y !== undefined) ext.a11y = token.a11y;
  result.$extensions = { zebkit: ext };

  return result;
}

// ─── Main transform ───────────────────────────────────────────────────────────

/** Options accepted by zebkitToDtcg. */
export interface ZebkitToDtcgOptions {
  /**
   * Additional Zebkit token types to exclude from the push output beyond the
   * built-in skip list (utility, setting, asset). Useful for omitting types
   * that are meaningful in Zebkit but noise in Penpot (e.g. "display").
   */
  skipTypes?: string[];
}

/**
 * Converts a compiled Zebkit token map to a W3C DTCG JSON document.
 *
 * @param tokens  Output of buildZebkitTokens — keyed by "zbk-<module>" names.
 * @param _layers Layer assignments per module (reserved for future use; the
 *                layer is stored in $extensions.zebkit on each token rather
 *                than at the group level, since DTCG has no layer concept).
 * @param options Optional configuration for type filtering.
 * @returns       A DtcgRoot ready to be JSON.stringify'd and saved as
 *                zebkit-tokens.tokens.json for Penpot import.
 */
export function zebkitToDtcg(
  tokens: Record<string, TokenInterface>,
  _layers: Record<string, LayerName>,
  options: ZebkitToDtcgOptions = {}
): DtcgRoot {
  const extraSkip = new Set<string>(options.skipTypes ?? []);
  const sortedKeys = topoSort(tokens);

  const groups: Record<string, DtcgGroup> = {};

  for (const bareKey of sortedKeys) {
    const moduleKey = Object.keys(tokens).find((k) => stripPrefix(k) === bareKey);
    if (!moduleKey) continue;

    const tokenMap = tokens[moduleKey];
    const group: DtcgGroup = {};

    for (const [tokenKey, token] of Object.entries(tokenMap)) {
      const dtcg = convertToken(tokenKey, token, extraSkip);
      if (dtcg) {
        group[tokenKey] = dtcg;
      }
    }

    // Omit groups that are entirely made up of skipped tokens
    if (Object.keys(group).length > 0) {
      groups[bareKey] = group;
    }
  }

  // tokenSetOrder drives Penpot's alias resolution order; it mirrors the
  // topological sort so dependencies always precede dependents.
  const metadata: DtcgMetadata = {
    tokenSetOrder: Object.keys(groups),
  };

  return {
    $metadata: metadata,
    ...groups,
  };
}

// ─── Utilities exported for push.ts ──────────────────────────────────────────

export { stripPrefix, totalTokensCount };

/** Counts all leaf token entries in a DTCG document (excludes $metadata). */
function totalTokensCount(dtcg: DtcgRoot): number {
  let count = 0;
  for (const [key, value] of Object.entries(dtcg)) {
    if (key === '$metadata') continue;
    count += countInGroup(value as DtcgGroup);
  }
  return count;
}

/** Recursively counts leaf tokens ($value nodes) inside a DTCG group tree. */
function countInGroup(group: DtcgGroup): number {
  let count = 0;
  for (const value of Object.values(group)) {
    if ('$value' in value) {
      count++;
    } else {
      count += countInGroup(value as DtcgGroup);
    }
  }
  return count;
}
