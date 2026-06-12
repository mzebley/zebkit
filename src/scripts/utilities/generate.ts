#!/usr/bin/env tsx
// Generates utility SCSS partials from hand-authored *utilities.manifest.json
// contracts. Each family's `source` partial is overwritten wholesale — edit
// the manifest and regenerate, never the partial. lint.ts validates the
// round trip.
//
// Run: npm run generate:utilities

import fs from "fs-extra";
import path from "node:path";
import { globSync } from "glob";
import postcss from "postcss";
import {
  BREAKPOINTS,
  MANIFEST_GLOB,
  expandFamily,
  type UtilityFamily,
  type UtilityManifest,
} from "./expand.js";

type SourcePlan = {
  source: string;
  manifestPaths: Set<string>;
  families: UtilityFamily[];
};

type PatternEntry = {
  className: string;
  edge: string | null;
  value: string;
  negative: boolean;
};

class GenerationError extends Error {}

function escapeClassName(className: string): string {
  return className.replace(/:/g, "\\:");
}

function selectorForClass(className: string): string {
  return `.${escapeClassName(className)}`;
}

function renderRule(selectors: string[], declarations: Array<[string, string]>): string {
  if (declarations.length === 0) return "";
  return `${selectors.join(",\n")} {\n${declarations
    .map(([prop, value]) => `  ${prop}: ${value};`)
    .join("\n")}\n}\n`;
}

function patternEntries(family: UtilityFamily): PatternEntry[] {
  if (!family.pattern) return [];

  const pattern = family.pattern;
  const edges: Array<string | null> = pattern.edgeRequired ? [] : [null];
  for (const edge of pattern.edges ?? []) edges.push(edge);

  const entries: PatternEntry[] = [];
  const byClass = new Map<string, PatternEntry>();

  for (const edge of edges) {
    const stem = edge ? `${pattern.base}-${edge}` : pattern.base;
    for (const value of pattern.values) {
      const entry = { className: `${stem}-${value}`, edge, value, negative: false };
      entries.push(entry);
      byClass.set(entry.className, entry);
    }
    for (const value of pattern.negativeValues ?? []) {
      const entry = { className: `${stem}-neg-${value}`, edge, value, negative: true };
      entries.push(entry);
      byClass.set(entry.className, entry);
    }
  }

  for (const [alias, target] of Object.entries(pattern.aliases ?? {})) {
    const targetEntry = byClass.get(target);
    if (!targetEntry) continue;
    entries.push({ ...targetEntry, className: alias });
  }

  return entries;
}

// valueMap entries are verbatim final values; they can be keyed by full class
// name (for aliases), neg-<value>, or value suffix.
function resolveValue(
  family: UtilityFamily,
  entry: PatternEntry
): { css: string; verbatim: boolean } {
  const valueMap = family.generator?.valueMap;
  const mappedValue =
    valueMap?.[entry.className] ??
    (entry.negative ? valueMap?.[`neg-${entry.value}`] : undefined) ??
    valueMap?.[entry.value];
  if (mappedValue !== undefined) {
    return { css: mappedValue, verbatim: true };
  }

  if (family.tokens) {
    const edgeSegment = family.tokens.edgeInToken && entry.edge ? `-${entry.edge}` : "";
    const tokenName = entry.negative
      ? `${family.tokens.varPrefix}${edgeSegment}-neg-${entry.value}`
      : `${family.tokens.varPrefix}${edgeSegment}-${entry.value}`;
    return { css: `var(--#{prefix.$cssVar}-${tokenName})`, verbatim: false };
  }

  return { css: entry.negative ? `-${entry.value}` : entry.value, verbatim: false };
}

function resolveProperties(family: UtilityFamily, edge: string | null): string[] {
  const edgeProperties = family.generator?.edgeProperties;
  if (!edgeProperties) return family.properties;
  return edgeProperties[edge ?? ""] ?? [];
}

function withImportant(family: UtilityFamily, value: string): string {
  if (!family.important || value.endsWith("!important")) return value;
  return `${value} !important`;
}

// Only prefix class tokens the family itself claims — structural companions in
// compound selectors keep their unprefixed form.
function prefixSelectors(scss: string, breakpoint: string, claimed: Set<string>): string {
  const root = postcss.parse(scss);
  root.walkRules((rule) => {
    rule.selectors = rule.selectors.map((selector) =>
      selector.replace(/\.((?:\\:|[a-zA-Z0-9_-])+)/g, (match, classToken: string) => {
        const normalized = classToken.replace(/\\:/g, ":");
        if (!claimed.has(normalized)) return match;
        return selectorForClass(`${breakpoint}:${normalized}`);
      })
    );
  });
  return root.toString();
}

function classDeclarationsOrThrow(
  family: UtilityFamily,
  className: string
): Record<string, string> {
  const classDeclarations = family.generator?.declarations?.[className];
  if (!classDeclarations || Object.keys(classDeclarations).length === 0) {
    throw new GenerationError(
      `family '${family.name}': no declarations for class '${className}'. ` +
        `An empty rule would be silently dropped by Sass — add generator.declarations['${className}'] (or rawScss).`
    );
  }
  return classDeclarations;
}

function selectorsFor(family: UtilityFamily, className: string, breakpoint?: string): string[] {
  const prefixed = breakpoint ? `${breakpoint}:${className}` : className;
  if (!family.modifiers?.hover) return [selectorForClass(prefixed)];
  const hoverName = breakpoint ? `${breakpoint}:hover:${className}` : `hover:${className}`;
  return [selectorForClass(prefixed), selectorForClass(hoverName) + ":hover"];
}

function renderFamilyRules(family: UtilityFamily, breakpoint?: string): string {
  if (family.generator?.rawScss) {
    const raw = family.generator.rawScss.trim();
    if (breakpoint) {
      return prefixSelectors(raw, breakpoint, expandFamily(family).baseClasses);
    }
    const staticScss = family.generator.staticScss ? `${family.generator.staticScss.trim()}\n\n` : "";
    return `${staticScss}${raw}\n`;
  }

  if (family.classes) {
    const staticScss =
      !breakpoint && family.generator?.staticScss ? `${family.generator.staticScss.trim()}\n\n` : "";
    return (
      staticScss +
      family.classes
        .map((className) =>
          renderRule(
            selectorsFor(family, className, breakpoint),
            Object.entries(classDeclarationsOrThrow(family, className)).map(([prop, value]) => [
              prop,
              withImportant(family, value),
            ])
          )
        )
        .join("\n")
    );
  }

  return patternEntries(family)
    .map((entry) => {
      const properties = resolveProperties(family, entry.edge);
      if (properties.length === 0) {
        throw new GenerationError(
          `family '${family.name}': no properties resolve for class '${entry.className}' (edge '${entry.edge ?? ""}').`
        );
      }
      const resolved = resolveValue(family, entry);
      const value = resolved.verbatim ? resolved.css : withImportant(family, resolved.css);
      return renderRule(
        selectorsFor(family, entry.className, breakpoint),
        properties.map((property) => [property, value])
      );
    })
    .join("\n");
}

function indent(value: string, spaces: number): string {
  const pad = " ".repeat(spaces);
  return value
    .split("\n")
    .map((line) => (line.length === 0 ? line : `${pad}${line}`))
    .join("\n");
}

function renderSourceFile(plan: SourcePlan): string {
  const manifestList = Array.from(plan.manifestPaths).sort().join(", ");
  const layer = plan.families[0]?.layer ?? "utilities";

  const blocks = plan.families
    .map((family) => renderFamilyRules(family).trim())
    .filter(Boolean);

  for (const breakpoint of BREAKPOINTS) {
    const rulesForBreakpoint = plan.families
      .filter((family) => (family.modifiers?.responsive ?? []).includes(breakpoint))
      .map((family) => renderFamilyRules(family, breakpoint).trim())
      .filter(Boolean)
      .join("\n\n");
    if (!rulesForBreakpoint) continue;
    blocks.push(`@include gen.from-breakpoint('${breakpoint}') {\n${indent(rulesForBreakpoint, 2)}\n}`);
  }

  return [
    `// GENERATED by generate:utilities from ${manifestList} — do not edit; edit the manifest and regenerate.`,
    `@use 'core/styles/variables/prefix' as prefix;`,
    `@use 'core/styles/utilities/generators' as gen;`,
    ``,
    `@layer ${layer} {`,
    indent(blocks.join("\n\n"), 2),
    `}`,
    ``,
  ].join("\n");
}

async function main(): Promise<void> {
  const rootDir = process.cwd();
  const manifests = globSync(MANIFEST_GLOB, { cwd: rootDir }).sort();

  const bySource = new Map<string, SourcePlan>();
  for (const manifestPath of manifests) {
    const manifest = (await fs.readJson(path.resolve(rootDir, manifestPath))) as UtilityManifest;
    for (const family of manifest.families) {
      family.layer = family.layer ?? manifest.layer;
      for (const source of [family.source].flat()) {
        const plan = bySource.get(source) ?? {
          source,
          manifestPaths: new Set<string>(),
          families: [],
        };
        plan.manifestPaths.add(manifestPath);
        plan.families.push(family);
        bySource.set(source, plan);
      }
    }
  }

  for (const plan of Array.from(bySource.values()).sort((a, b) => a.source.localeCompare(b.source))) {
    const output = renderSourceFile(plan);
    const outputPath = path.resolve(rootDir, plan.source);
    await fs.ensureDir(path.dirname(outputPath));
    await fs.writeFile(outputPath, output, "utf8");
    console.log(`generated ${plan.source}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
