/**
 * Pure prune engine: `(css string, options) -> { css, report stats }`. No fs, no
 * `process` — the CLI command and build hook own IO and pass in a candidate set.
 *
 * Passes (see zebkit-prune-handoff.md §4):
 *   1. (caller) content scan → candidate set + token roots
 *   2. selector retention — drop rules whose selectors reference no live class
 *   3. token-graph reachability — drop now-unreachable custom properties
 *
 * The two zebkit conventions this must honor, or it silently keeps ~430 KB of dead
 * CSS: state variants are attribute selectors (`[class~="hover:border-action"]`),
 * and responsive variants are escaped-colon classes (`.tablet\:text-sm`).
 */
import postcss, { type AtRule, type Node, type Rule } from 'postcss';
import selectorParser from 'postcss-selector-parser';
import type { PruneEngineResult, PruneOptions } from './types';
import { compileMatchers, matchAny, type CompiledMatcher } from './matchers';
import { pruneTokenGraph } from './token-graph';

const EMPTIABLE_AT_RULES = new Set(['media', 'layer', 'supports', 'container']);
const KEEP_ALL_AT_RULES = new Set(['keyframes', 'font-face']);
/** Attribute operators zebkit emits and we can decide on: `[class~="x"]`, `[class="x"]`. */
const MEMBERSHIP_OPERATORS = new Set(['=', '~=']);

const isRootSelector = (selector: string): boolean => /:root/.test(selector);

/** Unescapes selector escapes so `.tablet\:text-sm` matches the candidate `tablet:text-sm`. */
const unescapeSelector = (value: string): string => value.replace(/\\(.)/g, '$1');

const stripQuotes = (value: string): string => value.replace(/^["']|["']$/g, '');

/** True when `rule`'s direct parent is a keyframe/font-face at-rule (kept wholesale in v1). */
function isInKeepAllAtRule(rule: Rule): boolean {
  const parent = rule.parent;
  return (
    !!parent &&
    parent.type === 'atrule' &&
    KEEP_ALL_AT_RULES.has((parent as AtRule).name)
  );
}

/** True when `rule` is nested inside a `@layer` whose name is in `keepLayers`. */
function isInKeptLayer(rule: Rule, keepLayers: readonly string[]): boolean {
  if (keepLayers.length === 0) return false;
  let node: Node | undefined = rule.parent as Node | undefined;
  while (node) {
    if (node.type === 'atrule' && (node as AtRule).name === 'layer') {
      const names = (node as AtRule).params.split(',').map((name) => name.trim());
      if (names.some((name) => keepLayers.includes(name))) return true;
    }
    node = node.parent as Node | undefined;
  }
  return false;
}

/**
 * Prunes unused selectors and unreachable tokens from `css`. Returns the rewritten
 * CSS and retention statistics; the caller wraps these into the full report.
 */
export function pruneCss(css: string, options: PruneOptions): PruneEngineResult {
  const {
    candidates,
    tokenRoots = [],
    tokens: pruneTokens = true,
    keepLayers = ['theme', 'base'],
  } = options;

  const safelist = compileMatchers(options.safelist ?? []);
  const blocklist = compileMatchers(options.blocklist ?? []);

  const root = postcss.parse(css);

  const keptClasses = new Set<string>();
  const droppedClasses = new Set<string>();
  const safelistHits = new Set<string>();
  const warnings = new Set<string>();
  let keptSelectors = 0;
  let droppedSelectors = 0;

  // Blocklist beats safelist beats candidate set.
  const classIsUsed = (name: string): boolean => {
    if (matchAny(blocklist, name)) {
      droppedClasses.add(name);
      return false;
    }
    if (matchAny(safelist, name, safelistHits)) {
      keptClasses.add(name);
      return true;
    }
    if (candidates.has(name)) {
      keptClasses.add(name);
      return true;
    }
    droppedClasses.add(name);
    return false;
  };

  const selectorIsUsed = (selector: string): boolean => {
    let used = true;
    selectorParser((selectors) => {
      selectors.walkClasses((node) => {
        // Keep walking after a miss so every dropped class is recorded for the report.
        if (!classIsUsed(unescapeSelector(node.value))) used = false;
      });
      selectors.walkAttributes((node) => {
        if (node.attribute !== 'class') return;
        const operator = node.operator;
        // `[class]` existence selector (no operator/value) matches any classed element.
        if (!operator || node.value == null) return;
        if (MEMBERSHIP_OPERATORS.has(operator)) {
          const name = unescapeSelector(stripQuotes(String(node.value)));
          if (!classIsUsed(name)) used = false;
        } else {
          // *=, ^=, $=, |= aren't emitted by zebkit; keep the rule and flag it.
          warnings.add(
            `Kept selector "${selector.trim()}" — unsupported attribute operator "${operator}"`
          );
        }
      });
    }).processSync(selector);
    return used;
  };

  root.walkRules((rule) => {
    // :root token blocks are the token pass's job; keyframe/font-face bodies and
    // kept-layer rules are never class-gated and stay in v1.
    if (isRootSelector(rule.selector)) return;
    if (isInKeepAllAtRule(rule)) return;
    if (isInKeptLayer(rule, keepLayers)) return;

    const survivingSelectors = rule.selectors.filter(selectorIsUsed);
    if (survivingSelectors.length === 0) {
      droppedSelectors += rule.selectors.length;
      rule.remove();
    } else {
      keptSelectors += survivingSelectors.length;
      droppedSelectors += rule.selectors.length - survivingSelectors.length;
      rule.selectors = survivingSelectors;
    }
  });

  collapseEmptyAtRules(root);

  const tokenStats = pruneTokenGraph(root, {
    enabled: pruneTokens,
    seeds: tokenRoots,
    safelist,
    safelistHits,
  });

  // Token pruning can empty more at-rule shells (a :root block inside a wrapper).
  collapseEmptyAtRules(root);

  return {
    css: root.toString(),
    selectors: { kept: keptSelectors, dropped: droppedSelectors },
    classes: {
      kept: [...keptClasses].sort(),
      dropped: [...droppedClasses].sort(),
    },
    tokens: tokenStats,
    safelistHits: [...safelistHits].sort(),
    warnings: [...warnings].sort(),
  };
}

/** Repeatedly removes emptied media/layer/supports/container shells until fixpoint. */
function collapseEmptyAtRules(root: postcss.Root): void {
  let changed = true;
  while (changed) {
    changed = false;
    root.walkAtRules((atRule) => {
      if (
        EMPTIABLE_AT_RULES.has(atRule.name) &&
        atRule.nodes &&
        atRule.nodes.length === 0
      ) {
        atRule.remove();
        changed = true;
      }
    });
  }
}

export { compileMatchers, matchAny, type CompiledMatcher };
