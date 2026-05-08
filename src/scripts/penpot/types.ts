/**
 * W3C Design Tokens Community Group (DTCG) format types and Tokens Studio
 * format types used for Penpot import/export.
 */

// ─── W3C DTCG types ──────────────────────────────────────────────────────────

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

export interface DtcgTokenValue {
  $value: string | number;
  $type: DtcgTokenType;
  $description?: string;
  $extensions?: {
    zebkit?: ZebkitTokenExtension;
    [key: string]: unknown;
  };
}

/** Round-trip metadata stored in $extensions.zebkit so pull can reconstruct exact Zebkit types. */
export interface ZebkitTokenExtension {
  type: string;
  a11y?: boolean | string;
}

export interface DtcgGroup {
  [key: string]: DtcgTokenValue | DtcgGroup;
}

export interface DtcgMetadata {
  tokenSetOrder?: string[];
  activeThemes?: string[];
  activeSets?: string[];
}

export interface DtcgRoot {
  $metadata?: DtcgMetadata;
  [group: string]: DtcgGroup | DtcgMetadata | undefined;
}

// ─── Tokens Studio format (Penpot's current export format) ───────────────────

export interface TokensStudioValue {
  value: string | number;
  type: string;
  description?: string;
  $extensions?: Record<string, unknown>;
}

export interface TokensStudioGroup {
  [key: string]: TokensStudioValue | TokensStudioGroup;
}

export interface TokensStudioRoot {
  $metadata?: { tokenSetOrder?: string[] };
  [group: string]: TokensStudioGroup | { tokenSetOrder?: string[] } | undefined;
}

// ─── Penpot RPC API response types ───────────────────────────────────────────

export interface PenpotFileTokenData {
  /** Token data keyed by set name; values are DTCG or Tokens Studio JSON objects */
  [setName: string]: DtcgGroup | TokensStudioGroup;
}

export interface PenpotFileData {
  tokens?: PenpotFileTokenData;
  [key: string]: unknown;
}

export interface PenpotFileResponse {
  id: string;
  name: string;
  data: PenpotFileData;
  [key: string]: unknown;
}

// ─── Push result ─────────────────────────────────────────────────────────────

export interface PenpotPushResult {
  outputPath: string;
  tokenCount: number;
  groupCount: number;
}
