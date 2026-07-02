/**
 * Candidate extraction from project source (Pass 1). This is the only prune module
 * that touches the filesystem; the engine stays pure.
 *
 * Two extraction philosophies, both "over-keep, never under-keep":
 *   - class candidates: any run of characters legal in a class name, plus every
 *     colon-split suffix (Svelte's `class:x` directive and clsx keys glue class
 *     names to prefixes — `class:padding-inline-start-025` must yield the bare class).
 *   - token roots: every `--zbk-*`-shaped literal, so inline styles, JS
 *     `style.setProperty`, and hand-written project CSS keep the tokens they use.
 */
import path from 'path';
import fs from 'fs-extra';
import { glob } from 'glob';

/** Broadest plausible class token — intentionally greedy. */
const CANDIDATE_TOKEN = /[A-Za-z0-9_:/.\\-]+/g;
/** Any `--custom-property`-shaped literal. */
const CUSTOM_PROPERTY = /--[\w-]+/g;

const IGNORED_GLOBS = ['**/node_modules/**', '**/.git/**'];

export interface ContentScanOptions {
  /** Content globs (e.g. `src/**\/*.{svelte,html,...}`), resolved relative to `cwd`. */
  contentGlobs: string[];
  /** Base directory the globs resolve against (the config file's directory). */
  cwd: string;
  /** Absolute path of the CSS being pruned; excluded from the token-root CSS sweep. */
  inputCssPath: string;
}

export interface ContentScanResult {
  /** Class-name candidates + colon-split suffixes. */
  candidates: Set<string>;
  /** `--zbk-*`-shaped literals seeding token-graph reachability. */
  tokenRoots: Set<string>;
  /** Number of content files scanned (report `content.files`). */
  files: number;
}

/** Static prefix of a glob, up to the first magic character (`src/**\/*.x` → `src`). */
function globBase(pattern: string): string {
  const segments = pattern.split('/');
  const staticSegments: string[] = [];
  for (const segment of segments) {
    if (/[*?{}[\]!()]/.test(segment)) break;
    staticSegments.push(segment);
  }
  return staticSegments.join('/') || '.';
}

/**
 * Scans project content for class candidates and token roots. Class candidates come
 * only from the content globs; token roots additionally come from any `.css` under
 * the globs' base directories (hand-written project styles reference `--zbk-*` too).
 */
export async function scanContent(
  options: ContentScanOptions
): Promise<ContentScanResult> {
  const { contentGlobs, cwd, inputCssPath } = options;

  const candidates = new Set<string>();
  const tokenRoots = new Set<string>();

  const contentFiles = await glob(contentGlobs, {
    cwd,
    absolute: true,
    nodir: true,
    ignore: IGNORED_GLOBS,
  });
  const uniqueContentFiles = [...new Set(contentFiles)];

  for (const file of uniqueContentFiles) {
    const source = await fs.readFile(file, 'utf8');
    addCandidates(source, candidates);
    addTokenRoots(source, tokenRoots);
  }

  // Token roots from project CSS living alongside the scanned content.
  const cssGlobs = [...new Set(contentGlobs.map((pattern) => `${globBase(pattern)}/**/*.css`))];
  const cssFiles = await glob(cssGlobs, {
    cwd,
    absolute: true,
    nodir: true,
    ignore: IGNORED_GLOBS,
  });
  const resolvedInput = path.resolve(inputCssPath);
  for (const file of new Set(cssFiles)) {
    if (path.resolve(file) === resolvedInput) continue;
    const source = await fs.readFile(file, 'utf8');
    addTokenRoots(source, tokenRoots);
  }

  return { candidates, tokenRoots, files: uniqueContentFiles.length };
}

function addCandidates(source: string, candidates: Set<string>): void {
  for (const match of source.matchAll(CANDIDATE_TOKEN)) {
    const token = match[0];
    candidates.add(token);
    // Register every colon-split suffix so `class:padding-inline-start-025` yields
    // the bare class while `tablet:text-sm` still matches via the full token.
    const parts = token.split(':');
    for (let i = 1; i < parts.length; i += 1) {
      candidates.add(parts.slice(i).join(':'));
    }
  }
}

function addTokenRoots(source: string, tokenRoots: Set<string>): void {
  for (const match of source.matchAll(CUSTOM_PROPERTY)) {
    tokenRoots.add(match[0]);
  }
}
