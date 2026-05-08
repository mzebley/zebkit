/**
 * TypeScript types for the two token formats this pipeline handles and for the
 * Penpot RPC API response shapes.
 *
 * ── Format overview ───────────────────────────────────────────────────────────
 *
 * W3C DTCG (Design Tokens Community Group) format
 *   The canonical format used when *importing* into Penpot. Metadata keys are
 *   prefixed with "$" ($value, $type, $description, $extensions). Alias
 *   references use curly-brace syntax: { color.butterfield-50 }.
 *   Spec: https://tr.designtokens.org/format/
 *
 * Tokens Studio format
 *   The format Penpot currently uses when *exporting* tokens. Structurally
 *   similar to DTCG but without the "$" prefix on leaf keys ("value", "type",
 *   "description"). The from-dtcg transformer normalises this to DTCG before
 *   processing so the rest of the pipeline only deals with one shape.
 *
 * The two-format asymmetry is a known Penpot issue tracked at:
 *   https://community.penpot.app/t/token-export-is-tokens-studio-format-not-dtcg-2025-10/10544
 */

// ─── W3C DTCG types ──────────────────────────────────────────────────────────

/** All token types defined in the W3C DTCG specification. */
export type DtcgTokenType =
  | 'color'
  | 'dimension'
  | 'fontFamily'
  | 'fontWeight'
  | 'duration'
  | 'cubicBezier'
  | 'number'
  | 'string'
  | 'strokeWidth'
  | 'opacity'
  | 'shadow'
  | 'gradient'
  | 'typography';

/**
 * A single token entry in DTCG format.
 *
 * $extensions.zebkit carries round-trip metadata written by the push transform
 * and read back by the pull transform. This allows pull to reconstruct the
 * exact Zebkit type (e.g. rootSize vs dimension) rather than relying on the
 * lossy DTCG reverse-map.
 */
export interface DtcgTokenValue {
  $value: string | number;
  $type: DtcgTokenType;
  $description?: string;
  $extensions?: {
    zebkit?: ZebkitTokenExtension;
    [key: string]: unknown;
  };
}

/**
 * Round-trip metadata stored under $extensions.zebkit on every token that
 * push writes. Pull reads this back to restore the original Zebkit type and
 * a11y flag, avoiding information loss through the DTCG type system.
 *
 * Example: a rootSize token maps to DTCG "dimension", but pull needs to know
 * it was rootSize (not plain dimension/spacing) to reproduce clamp() behaviour
 * when the token re-enters the Zebkit build pipeline.
 */
export interface ZebkitTokenExtension {
  /** Original AllowedTokenTypes value from the Zebkit token definition. */
  type: string;
  /** Preserved from TokenObject.a11y when present. */
  a11y?: boolean | string;
}

/**
 * A DTCG group node. Values can be either leaf tokens (DtcgTokenValue, which
 * has $value) or nested sub-groups (another DtcgGroup), forming a tree. The
 * extractGroup helper in from-dtcg.ts flattens this tree to a dotted-key map
 * before converting to Zebkit's flat TokenInterface.
 */
export interface DtcgGroup {
  [key: string]: DtcgTokenValue | DtcgGroup;
}

/**
 * The $metadata block at the root of a DTCG document. tokenSetOrder controls
 * the order in which Penpot loads the groups, which matters for alias
 * resolution: a group referenced by another must appear before it in the list.
 * The push transform uses a topological sort to derive this order automatically.
 */
export interface DtcgMetadata {
  tokenSetOrder?: string[];
  activeThemes?: string[];
  activeSets?: string[];
}

/**
 * Root of a W3C DTCG token document. The $metadata key holds ordering and
 * activation hints; all other keys are top-level token groups (one per Zebkit
 * module after the "zbk-" prefix is stripped).
 */
export interface DtcgRoot {
  $metadata?: DtcgMetadata;
  [group: string]: DtcgGroup | DtcgMetadata | undefined;
}

// ─── Tokens Studio format (Penpot's current export format) ───────────────────

/**
 * A single token entry in Tokens Studio format. Structurally identical to
 * DtcgTokenValue except the metadata keys lack the "$" prefix.
 */
export interface TokensStudioValue {
  value: string | number;
  type: string;
  description?: string;
  $extensions?: Record<string, unknown>;
}

/** A group node in a Tokens Studio document. Same tree structure as DtcgGroup. */
export interface TokensStudioGroup {
  [key: string]: TokensStudioValue | TokensStudioGroup;
}

/**
 * Root of a Tokens Studio token document as exported by Penpot.
 * The normalizeToDto function in from-dtcg.ts converts this to DtcgRoot
 * before any further processing.
 */
export interface TokensStudioRoot {
  $metadata?: { tokenSetOrder?: string[] };
  [group: string]: TokensStudioGroup | { tokenSetOrder?: string[] } | undefined;
}

// ─── Penpot RPC API response types ───────────────────────────────────────────

/**
 * The token payload inside a Penpot file response. Keyed by token set name;
 * values are either DTCG or Tokens Studio objects depending on whether they
 * were imported (DTCG) or are native Penpot-created tokens (Tokens Studio).
 * The pull command detects and normalises both.
 */
export interface PenpotFileTokenData {
  [setName: string]: DtcgGroup | TokensStudioGroup;
}

/** Partial shape of a Penpot file's internal data object. */
export interface PenpotFileData {
  tokens?: PenpotFileTokenData;
  [key: string]: unknown;
}

/**
 * Top-level shape of the JSON response from GET /api/rpc/command/get-file.
 * Only the fields relevant to token sync are typed; the full file data
 * structure is much larger and Penpot-internal.
 */
export interface PenpotFileResponse {
  id: string;
  name: string;
  data: PenpotFileData;
  [key: string]: unknown;
}

// ─── Push result ─────────────────────────────────────────────────────────────

/** Summary returned after a successful push transform (used for CLI output). */
export interface PenpotPushResult {
  outputPath: string;
  tokenCount: number;
  groupCount: number;
}
