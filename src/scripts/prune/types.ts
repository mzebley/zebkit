/**
 * Types for the prune engine (pure) and the assembled prune report. Everything the
 * engine needs is passed in; it never touches the filesystem or `process`.
 */

/** Output disposition for a prune run. */
export type PruneMode = 'replace' | 'alongside';

/** Pure engine input. Candidates/tokenRoots come from the content scan (IO layer). */
export interface PruneOptions {
  /** Class-name candidates extracted from project content (Pass 1). */
  candidates: Set<string>;
  /**
   * `--zbk-*` literals found in project content plus component-token roots, seeding
   * token-graph reachability (Pass 3). Optional; defaults to empty.
   */
  tokenRoots?: Iterable<string>;
  /** Raw safelist entries — exact strings or `/regex/`. Force-keep. */
  safelist?: string[];
  /** Raw blocklist entries — exact strings or `/regex/`. Force-drop; beats safelist. */
  blocklist?: string[];
  /** Run the token-graph reachability pass (default true). */
  tokens?: boolean;
  /** Cascade layers whose rules are never pruned (default `['theme', 'base']`). */
  keepLayers?: string[];
}

export interface SelectorStats {
  kept: number;
  dropped: number;
}

export interface ClassStats {
  kept: string[];
  dropped: string[];
}

export interface TokenStats {
  kept: number;
  dropped: number;
  droppedNames: string[];
}

/** What the pure engine returns: transformed CSS plus retention statistics. */
export interface PruneEngineResult {
  css: string;
  selectors: SelectorStats;
  classes: ClassStats;
  tokens: TokenStats;
  /** Safelist entries that matched at least one class or token. */
  safelistHits: string[];
  /** Non-fatal notes (e.g. selectors kept because of an unsupported attribute operator). */
  warnings: string[];
}

/** The full report written to `zbk-<theme>.prune-report.json` and rendered to console. */
export interface PruneReport {
  zebkitVersion: string;
  generatedAt: string;
  input: { path: string; bytes: number; gzipBytes: number };
  output: { path: string; bytes: number; gzipBytes: number; mode: PruneMode };
  content: { files: number; candidates: number };
  selectors: SelectorStats;
  classes: ClassStats;
  tokens: TokenStats;
  safelist: { entries: number; hits: string[] };
  warnings: string[];
}
