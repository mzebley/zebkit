// Shared types and grammar expansion for utility manifests
// (schemas/utility-manifest.schema.json). Used by both lint.ts and generate.ts.

export const MANIFEST_GLOB = "src/core/**/*utilities.manifest.json";

// Must match the $breakpoints map in core/styles/variables/_breakpoints.scss.
export const BREAKPOINTS = [
  "tablet",
  "tablet-lg",
  "desktop",
  "desktop-lg",
  "widescreen",
];

export type UtilityTier = "recommended" | "situational" | "discouraged";

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
  pattern?: {
    base: string;
    edges?: string[];
    edgeRequired?: boolean;
    values: string[];
    negativeValues?: string[];
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

  if (family.classes) {
    for (const cls of family.classes) core.add(cls);
  } else if (family.pattern) {
    const pattern = family.pattern;
    const edges: Array<string | null> = pattern.edgeRequired ? [] : [null];
    for (const edge of pattern.edges ?? []) edges.push(edge);

    for (const edge of edges) {
      const stem = edge ? `${pattern.base}-${edge}` : pattern.base;
      for (const value of pattern.values) core.add(`${stem}-${value}`);
      for (const value of pattern.negativeValues ?? []) core.add(`${stem}-neg-${value}`);
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
