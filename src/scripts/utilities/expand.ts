// Shared types and grammar expansion for utility manifests
// (schemas/utility-manifest.schema.json). Used by both lint.ts and generate.ts.

export const MANIFEST_GLOB = "src/tokens/**/*utilities.manifest.json";

// Fallback breakpoint axis, used only if the breakpoint token module can't be
// loaded. The source of truth is the breakpoint token module (src/tokens/breakpoint);
// generate.ts and lint.ts derive the list via breakpointKeysFromModules().
export const BREAKPOINTS = [
  "tablet",
  "tablet-lg",
  "desktop",
  "desktop-lg",
  "widescreen",
];

export type UtilityTier = "recommended" | "situational" | "discouraged";

// One verbatim CSS rule in a `rules` family: a free-form selector, its
// declarations, and optional nested rules ('&' allowed).
export type UtilityRule = {
  selector: string;
  declarations: Record<string, string>;
  nested?: UtilityRule[];
};

// Matches a '.class' token in a selector string (escaped ':' prefixes stay
// escaped in the capture, unescaped by the caller). Shared by expand (predicting
// a rules family's class set) and lint (extracting classes from SCSS selectors).
const CLASS_TOKEN_RE = /\.((?:[a-zA-Z]|\\:)(?:[a-zA-Z0-9_-]|\\:)*)/g;
// Matches [class~="name"] attribute selectors. The name may contain a literal
// colon (state prefix form) that the class selector form escapes as \:. Both
// resolve to the same class name in HTML.
const ATTR_CLASS_RE = /\[class~="([^"]+)"\]/g;

/** Every '.class' name referenced in a selector string (':' unescaped). */
export function classesInSelector(selector: string): string[] {
  const out: string[] = [];
  for (const match of selector.matchAll(CLASS_TOKEN_RE)) {
    out.push(match[1].replace(/\\:/g, ":"));
  }
  for (const match of selector.matchAll(ATTR_CLASS_RE)) {
    out.push(match[1]);
  }
  return out;
}

/** Every '.class' name across a rules tree (top-level selectors + nested). */
export function classesFromRules(rules: UtilityRule[]): string[] {
  const out: string[] = [];
  for (const rule of rules) {
    out.push(...classesInSelector(rule.selector));
    if (rule.nested) out.push(...classesFromRules(rule.nested));
  }
  return out;
}

export const STATE_PATTERN_STATES = ["base", "focus", "hover", "active", "disabled"] as const;
export type StatePatternStateName = (typeof STATE_PATTERN_STATES)[number];

export type StatePattern = {
  roles: Record<string, string | string[]>;
  axes: Record<string, (string | null)[]>;
  class: string;
  var: string;
  varSource?: "scss";
  states: true | StatePatternStateName[];
};

/** Substitute {axis} and {-axis} placeholders in a template string. */
export function instantiateTemplate(template: string, values: Record<string, string | null>): string {
  return template.replace(/\{(-?)([a-zA-Z-]+)\}/g, (_, dash: string, axis: string) => {
    const value = values[axis] ?? null;
    if (value === null) return ""; // optional ({-axis}) or missing — emit nothing
    return dash ? `-${value}` : value;
  });
}

/** Cartesian product of arrays. */
function cartesian<T>(arrays: T[][]): T[][] {
  return arrays.reduce<T[][]>(
    (acc, arr) => acc.flatMap((combo) => arr.map((item) => [...combo, item])),
    [[]]
  );
}

/** All axis-value combinations for a statePattern (excludes role axis). */
function statePatternAxisCombos(sp: StatePattern): Array<Record<string, string | null>> {
  const axisNames = Object.keys(sp.axes);
  const axisValueArrays = axisNames.map((name) => sp.axes[name]);
  return cartesian(axisValueArrays).map((combo) => {
    const bindings: Record<string, string | null> = {};
    axisNames.forEach((name, i) => { bindings[name] = combo[i]; });
    return bindings;
  });
}

export type UtilityFamily = {
  name: string;
  description: string;
  guidance?: string[];
  source: string | string[];
  properties: string[];
  layer?: string;
  important?: boolean;
  a11y?: string;
  tier?: UtilityTier;
  valueTiers?: Record<string, UtilityTier>;
  classes?: string[];
  // Verbatim rule blocks (schemas/utility-manifest.schema.json `rules`). Mutually
  // exclusive with classes/pattern; predicted class set = classesFromRules().
  rules?: UtilityRule[];
  // Rules families only: emit outside any @layer (for :root cascade defaults).
  unlayered?: boolean;
  pattern?: {
    base: string;
    edges?: string[];
    edgeRequired?: boolean;
    // Optional: when omitted and `tokens` is bound (without edgeInToken), the
    // value list is auto-derived from the token group (see deriveValuesFromTokens
    // in token-source.ts). When present, it is the source of truth — a limiter
    // the lint still checks against the token group.
    values?: string[];
    // string[] = explicit list; true = mirror every resolved positive value
    // that has a matching neg-<value> token (resolved in token-source.ts).
    negativeValues?: string[] | boolean;
    // Token values to drop from both axes after derivation — lets a family take
    // the whole group minus a few keys instead of enumerating every wanted one.
    exclude?: string[];
    // Extra non-token values mapped to verbatim CSS (e.g. { auto: "auto" }).
    // Added to the positive axis alongside the token scale; they flow through
    // edges / edgeProperties / modifiers but skip token resolution and negative
    // mirroring. Resolved in token-source.ts, emitted verbatim in generate.ts.
    literals?: Record<string, string>;
    aliases?: Record<string, string>;
  };
  tokens?: {
    group: string;
    varPrefix: string;
    edgeInToken?: boolean;
    types?: string[];
  };
  modifiers?: {
    hover?: boolean;
    responsive?: string[];
  };
  knownExceptions?: {
    extra?: string[];
    missing?: string[];
  };
  statePattern?: StatePattern;
  generator?: {
    edgeProperties?: Record<string, string[]>;
    valueMap?: Record<string, string>;
    declarations?: Record<string, Record<string, string>>;
    rawScss?: string;
    staticScss?: string;
  };
};

export type UtilityManifest = {
  name: string;
  key: string;
  description: string;
  domain: "layout" | "spacing" | "typography" | "color" | "border" | "effects" | "interaction";
  layer?: string;
  families: UtilityFamily[];
};

export type Expansion = {
  /** Every class the family claims, including hover and breakpoint prefixes. */
  classes: Set<string>;
  /** Classes without breakpoint prefixes (hover variants included). */
  baseClasses: Set<string>;
  aliasErrors: string[];
};

/** Expand a family's grammar into the full set of class names it claims. */
export function expandFamily(family: UtilityFamily): Expansion {
  const core = new Set<string>();
  const aliasErrors: string[] = [];

  if (family.statePattern) {
    const sp = family.statePattern;
    const enabledStates: StatePatternStateName[] =
      sp.states === true ? [...STATE_PATTERN_STATES] : sp.states;
    const combos = statePatternAxisCombos(sp);
    for (const [roleName] of Object.entries(sp.roles)) {
      for (const axisBindings of combos) {
        const bindings = { role: roleName, ...axisBindings };
        const baseClass = instantiateTemplate(sp.class, bindings);
        if (!baseClass) continue;
        for (const state of enabledStates) {
          core.add(state === "base" ? baseClass : `${state}:${baseClass}`);
        }
      }
    }
  } else if (family.classes) {
    for (const cls of family.classes) core.add(cls);
  } else if (family.rules) {
    for (const cls of classesFromRules(family.rules)) core.add(cls);
  } else if (family.pattern) {
    const pattern = family.pattern;
    const edges: Array<string | null> = pattern.edgeRequired ? [] : [null];
    for (const edge of pattern.edges ?? []) edges.push(edge);

    for (const edge of edges) {
      const stem = edge ? `${pattern.base}-${edge}` : pattern.base;
      for (const value of pattern.values ?? []) core.add(`${stem}-${value}`);
      const negatives = Array.isArray(pattern.negativeValues) ? pattern.negativeValues : [];
      for (const value of negatives) core.add(`${stem}-neg-${value}`);
    }

    for (const [alias, target] of Object.entries(pattern.aliases ?? {})) {
      if (!core.has(target)) {
        aliasErrors.push(`alias '${alias}' targets '${target}', which the grammar does not produce.`);
        continue;
      }
      core.add(alias);
    }
  }

  const baseClasses = new Set(core);
  if (family.modifiers?.hover) {
    for (const cls of core) baseClasses.add(`hover:${cls}`);
  }

  const classes = new Set(baseClasses);
  for (const breakpoint of family.modifiers?.responsive ?? []) {
    for (const cls of baseClasses) classes.add(`${breakpoint}:${cls}`);
  }

  return { classes, baseClasses, aliasErrors };
}
