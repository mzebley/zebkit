import { compiledTokens, type CompiledToken } from '../data/compiled-tokens';
import lookup from '../data/generated/token-lookup.json';

// Token x-ray resolver: walks a token's reference chain through the three strata
// (component -> alias -> primitive) using the synced token registry. The chain
// terminates at a primitive — including the raw `color.*` palette, which lives
// only as runtime CSS vars (not in the compiled registry), so the terminal node
// is derived rather than looked up.

export type Stratum = 'component' | 'alias' | 'primitive';

export interface ChainNode {
  /** Dotted token path, e.g. `button.canvas`. */
  path: string;
  /** Compiled CSS custom property, e.g. `--zbk-button-canvas`. */
  cssVar: string;
  stratum: Stratum;
  /** The declared value: a `{ref}` for non-terminal nodes, a literal otherwise. */
  raw: string;
  /** Next path in the chain if `raw` is a reference, else null (terminal). */
  ref: string | null;
}

const ZBK = 'zbk-';

// Per CLAUDE.md's strata: component tokens are namespaced per element; alias
// tokens are semantic mappings; everything else (color, spacing, font-size, …)
// is primitive.
const COMPONENT_GROUPS = new Set(['button', 'p', 'list', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']);
const ALIAS_GROUPS = new Set([
  'app',
  'accent-primary',
  'accent-secondary',
  'brand',
  'neutral',
  'action',
  'focus',
  'positive',
  'info',
  'critical',
  'caution',
  'disabled',
]);

// Reverse map (CSS var -> canonical dotted path), preferring brace-free keys.
const varToPath: Record<string, string> = {};
for (const [key, value] of Object.entries(lookup as Record<string, string>)) {
  if (key.startsWith('{')) continue;
  if (!(value in varToPath)) varToPath[value] = key;
}

/** Every emitted token CSS custom property, sorted — for inspector autocomplete. */
export const allTokenVars: string[] = Object.keys(varToPath).sort();

// Groups whose tokens are consumed at build time and are NOT emitted as CSS
// custom properties by default — `breakpoint` feeds SCSS `@media` queries, which
// can't read `var()`. The docs build keeps these vars off, so the x-ray notes
// their conditional nature instead of resolving an empty computed value.
const BUILD_TIME_GROUPS = new Set(['breakpoint']);

/**
 * If `cssVar` belongs to a build-time-only group, return a note explaining that
 * it isn't emitted by default (and what enables it); otherwise null.
 */
export function buildTimeVarNote(cssVar: string): string | null {
  const path = varToPath[cssVar];
  const group = path
    ? splitPath(path)[0]
    : cssVar.replace(/^--zbk-/, '').split('-')[0];
  if (!BUILD_TIME_GROUPS.has(group)) return null;
  return `Build-time token — not emitted as a CSS variable by default. Set extendedTokens.emitBreakpointVars to emit ${cssVar}.`;
}

// Token paths are always `group.name` with the group/name split at the first dot
// (groups and names may themselves contain dashes: `accent-primary.600`,
// `z-index.modal-backdrop`, `color.butterfield-200`).
function splitPath(path: string): [string, string] {
  const i = path.indexOf('.');
  return i === -1 ? [path, ''] : [path.slice(0, i), path.slice(i + 1)];
}

function toCssVar(path: string): string {
  return `--${ZBK}${path.replace(/\./g, '-')}`;
}

function stratumFor(group: string): Stratum {
  if (COMPONENT_GROUPS.has(group)) return 'component';
  if (ALIAS_GROUPS.has(group)) return 'alias';
  return 'primitive';
}

function lookupEntry(path: string): CompiledToken | undefined {
  const [group, name] = splitPath(path);
  return compiledTokens[`${ZBK}${group}`]?.[name];
}

function isReference(raw: string): boolean {
  return raw.startsWith('{') && raw.endsWith('}');
}

/**
 * Normalize any inspector entry point to a dotted token path.
 * Accepts a CSS var (`--zbk-app-canvas`), a brace ref (`{app.canvas}`), or a
 * bare path (`app.canvas`).
 */
export function toTokenPath(input: string): string {
  const trimmed = input.trim();
  if (trimmed.startsWith('--')) {
    // Prefer the canonical path from the lookup; fall back to deriving it.
    return varToPath[trimmed] ?? trimmed.slice(`--${ZBK}`.length).replace(/-/g, '.');
  }
  if (isReference(trimmed)) return trimmed.slice(1, -1);
  return trimmed;
}

/**
 * Resolve a token's reference chain, outermost (component/alias) first down to
 * the terminal primitive. Returns an empty array for unknown inputs.
 */
export function resolveChain(input: string): ChainNode[] {
  let path: string | null = toTokenPath(input);
  const nodes: ChainNode[] = [];
  const seen = new Set<string>();

  while (path && !seen.has(path)) {
    seen.add(path);
    const [group] = splitPath(path);
    const cssVar = toCssVar(path);
    const entry = lookupEntry(path);

    if (!entry) {
      // Out of the registry (e.g. a raw `color.*` primitive) — terminal node.
      nodes.push({ path, cssVar, stratum: 'primitive', raw: '', ref: null });
      break;
    }

    const raw = String(entry.value ?? '');
    const ref = isReference(raw) ? raw.slice(1, -1) : null;
    nodes.push({ path, cssVar, stratum: stratumFor(group), raw, ref });
    path = ref;
  }

  return nodes;
}
