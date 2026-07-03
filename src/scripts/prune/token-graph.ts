/**
 * Token-graph reachability pass (Pass 3). Runs AFTER selector pruning, because
 * pruning classes makes many `var()`-consumed custom properties unreachable. This
 * is a graph reachability walk, never naive "is this var mentioned anywhere"
 * matching: tokens reference tokens, so reachability must be transitive.
 *
 * v1 scope: only prune custom properties declared under `:root` selectors. Props
 * declared on other selectors (overlay themes use e.g. `[data-zbk-theme]`) are left
 * alone until a later phase extends the pass.
 */
import type { Declaration, Root } from 'postcss';
import type { TokenStats } from './types';
import { matchAny, type CompiledMatcher } from './matchers';

/** `var(--x)` reference inside a declaration value or at-rule params. */
const VAR_REFERENCE = /var\(\s*(--[\w-]+)/g;

const isRootSelector = (selector: string): boolean => /:root/.test(selector);

export interface TokenGraphOptions {
  /** When false, no props are removed; every `:root` custom property is reported kept. */
  enabled: boolean;
  /** `--zbk-*` literals from content + component roots seeding the reachable set. */
  seeds: Iterable<string>;
  /** Compiled safelist matchers; a prop matching one is force-kept. */
  safelist: readonly CompiledMatcher[];
  /** Shared safelist-hit accumulator (also fed by the selector pass). */
  safelistHits: Set<string>;
}

/**
 * Removes unreachable `:root` custom-property declarations from `root` (mutating it)
 * and returns kept/dropped counts. Empty `:root` rules left behind are removed.
 */
export function pruneTokenGraph(root: Root, options: TokenGraphOptions): TokenStats {
  const { enabled, seeds, safelist, safelistHits } = options;

  // Collect every custom property declared at :root — the pruning candidates.
  const declMap = new Map<string, Declaration[]>();
  root.walkRules((rule) => {
    if (!isRootSelector(rule.selector)) return;
    rule.walkDecls((decl) => {
      if (!decl.prop.startsWith('--')) return;
      const list = declMap.get(decl.prop);
      if (list) list.push(decl);
      else declMap.set(decl.prop, [decl]);
    });
  });

  if (!enabled) {
    return { kept: declMap.size, dropped: 0, droppedNames: [] };
  }

  const reachable = new Set<string>();
  const queue: string[] = [];
  const mark = (name: string) => {
    if (!reachable.has(name)) {
      reachable.add(name);
      queue.push(name);
    }
  };
  const markRefs = (text: string) => {
    for (const match of text.matchAll(VAR_REFERENCE)) mark(match[1]);
  };

  // (a) var() references in every surviving non-:root declaration + at-rule params.
  root.walkRules((rule) => {
    if (isRootSelector(rule.selector)) return;
    rule.walkDecls((decl) => markRefs(decl.value));
  });
  root.walkAtRules((atRule) => {
    if (atRule.params) markRefs(atRule.params);
  });

  // (b) `--zbk-*` literals from project content + component-token roots.
  for (const seed of seeds) mark(seed);

  // (c) safelisted token patterns.
  for (const prop of declMap.keys()) {
    if (matchAny(safelist, prop, safelistHits)) mark(prop);
  }

  // BFS: tokens reference tokens (`--zbk-action-bg: var(--zbk-accent-primary-60)`).
  while (queue.length > 0) {
    const prop = queue.pop() as string;
    for (const decl of declMap.get(prop) ?? []) markRefs(decl.value);
  }

  let kept = 0;
  let dropped = 0;
  const droppedNames: string[] = [];
  for (const [prop, decls] of declMap) {
    if (reachable.has(prop)) {
      kept += 1;
      continue;
    }
    dropped += 1;
    droppedNames.push(prop);
    decls.forEach((decl) => decl.remove());
  }

  // Remove :root rules emptied by the pass so no bare `:root {}` ships.
  root.walkRules((rule) => {
    if (isRootSelector(rule.selector) && rule.nodes && rule.nodes.length === 0) {
      rule.remove();
    }
  });

  return { kept, dropped, droppedNames: droppedNames.sort() };
}
