#!/usr/bin/env tsx
// Utility class linter.
//
// *utilities.manifest.json files are the hand-authored contracts for utility
// class families. Each family declares a grammar — base x edges x values,
// plus hover/breakpoint modifier axes — and this linter keeps that grammar
// honest against the SCSS that emits the classes:
//
//   U1  manifest validates against schemas/utility-manifest.schema.json
//   U2  family integrity: unique names, alias targets resolve, declared
//       tokens.group is a real token module key, every pattern value is a
//       real token key in that module, source file exists, breakpoints and
//       layers are known
//   U3  expansion <-> SCSS diff per source file: every class the grammar
//       predicts exists; every utility class in the file is claimed by a
//       family (knownExceptions absorb documented irregularities)
//   U4  no utility class is defined in more than one covered SCSS file
//   U5  every src/core/styles/utilities/_*.scss partial is covered by a
//       manifest (legacy mixin-driven partials are allowlisted until migrated)
//
// knownExceptions and LEGACY_PARTIALS are the debt ledger: shrink them,
// never grow them to make a build pass.
//
// Run: npm run lint:utilities

import fs from "fs-extra";
import path from "node:path";
import chalk from "chalk";
import { globSync } from "glob";
import Ajv from "ajv/dist/2020.js";
import { loadTokenModules, resolvePatternValues } from "./token-source.js";
import { BREAKPOINTS, MANIFEST_GLOB, expandFamily, type UtilityFamily } from "./expand.js";

type Finding = { rule: string; file: string; subject: string; message: string };

const SCHEMA_PATH = "schemas/utility-manifest.schema.json";
const UTILITIES_PARTIALS_GLOB = "src/core/styles/utilities/_*.scss";
const KNOWN_LAYERS = new Set(["utilities"]);

// Mixin/variable libraries — they define no classes themselves.
const IGNORED_PARTIALS = new Set(["_generators.scss", "_index.scss"]);

// Pre-manifest partials whose classes are emitted via Sass mixins (static
// extraction can't see them). Migrate each by authoring a manifest family and
// running generate:utilities, then DELETE it from this list. Never add to it.
const LEGACY_PARTIALS = new Set([
  "_border.scss",
  "_color.scss",
  "_flex.scss",
  "_font.scss",
  "_object.scss",
  "_pointer.scss",
  "_position.scss",
  "_spacing.scss",
  "_text.scss",
  "_visibility.scss",
]);

/** Extract every class name defined in an SCSS file (escaped ':' prefixes unescaped). */
function extractClasses(scss: string): Set<string> {
  const css = scss
    .replace(/\/\/[^\n]*/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/#\{[^{}]*\}/g, "zbk"); // neutralize SCSS interpolation braces
  const classes = new Set<string>();
  const selectorChunk = /(^|[}{;])\s*([^{}@;]+)\{/g;
  let match: RegExpExecArray | null;
  while ((match = selectorChunk.exec(css))) {
    for (const cls of match[2].matchAll(/\.((?:[a-zA-Z]|\\:)(?:[a-zA-Z0-9_-]|\\:)*)/g)) {
      classes.add(cls[1].replace(/\\:/g, ":"));
    }
  }
  return classes;
}

async function main() {
  const rootDir = process.cwd();
  const findings: Finding[] = [];

  const ajv = new Ajv({ allErrors: true, allowUnionTypes: true });
  const validate = ajv.compile<any>(await fs.readJson(path.resolve(rootDir, SCHEMA_PATH)));

  const tokenModules = await loadTokenModules(rootDir);
  const breakpointKeys = new Set(BREAKPOINTS);

  const manifestFiles = globSync(MANIFEST_GLOB, { cwd: rootDir }).sort();
  if (manifestFiles.length === 0) {
    console.log(chalk.yellow("No utility manifests found."));
    return;
  }

  const familyNames = new Map<string, string>();
  const bySource = new Map<string, { family: UtilityFamily; file: string }[]>();
  let manifestCount = 0;
  let familyCount = 0;
  let exceptionCount = 0;

  for (const file of manifestFiles) {
    const manifest: any = await fs.readJson(path.resolve(rootDir, file));
    const subjectBase = manifest.name ?? file;
    manifestCount++;

    // U1 — schema validation
    if (!validate(manifest)) {
      for (const error of validate.errors ?? []) {
        findings.push({ rule: "U1", file, subject: `${subjectBase}${error.instancePath}`, message: error.message ?? "schema violation" });
      }
      continue;
    }

    for (const family of manifest.families as UtilityFamily[]) {
      familyCount++;
      const subject = `${subjectBase}.${family.name}`;

      // Resolve pattern value axes (derive omitted values, mirror
      // negativeValues: true, apply exclude) in place, so the rest of the lint
      // and the generator see the same concrete lists. No-op when no tokens.
      resolvePatternValues(family, tokenModules);

      if (family.pattern) {
        // A pattern family with no values that cannot be auto-derived emits
        // nothing — flag the structurally-invalid cases (an unknown tokens.group
        // is reported separately below, so don't double-flag it here).
        if (!family.pattern.values && (!family.tokens || family.tokens.edgeInToken)) {
          findings.push({ rule: "U2", file, subject, message: `pattern.values is required unless the family binds a token group (without edgeInToken) to derive them from.` });
        } else if (Array.isArray(family.pattern.values) && family.pattern.values.length === 0) {
          findings.push({ rule: "U2", file, subject, message: `pattern resolves to no values — check tokens.types and pattern.exclude.` });
        }
        // negativeValues: true mirrors the positives off the token group, so it
        // needs the same binding as deriving values.
        if (family.pattern.negativeValues === true && (!family.tokens || family.tokens.edgeInToken)) {
          findings.push({ rule: "U2", file, subject, message: `pattern.negativeValues: true requires a token group bound without edgeInToken.` });
        }
      }

      // U2 — family integrity
      if (familyNames.has(family.name)) {
        findings.push({ rule: "U2", file, subject, message: `Family name '${family.name}' is already declared in ${familyNames.get(family.name)}.` });
      }
      familyNames.set(family.name, file);

      if (family.tokens) {
        const moduleKeys = tokenModules.get(family.tokens.group);
        if (!moduleKeys) {
          findings.push({ rule: "U2", file, subject, message: `tokens.group '${family.tokens.group}' is not an existing token module key.` });
        } else if (family.pattern && !family.tokens.edgeInToken) {
          const valueMap = family.generator?.valueMap ?? {};
          const allowedTypes = family.tokens.types ? new Set(family.tokens.types) : undefined;
          const literals = family.pattern.literals ?? {};
          for (const value of family.pattern.values ?? []) {
            if (valueMap[value] !== undefined) continue; // valueMap entries are literal CSS, exempt
            if (literals[value] !== undefined) continue; // literals are non-token by design
            if (!moduleKeys.has(value)) {
              findings.push({ rule: "U2", file, subject, message: `pattern value '${value}' is not a token key in module '${family.tokens.group}'.` });
            } else if (allowedTypes && !allowedTypes.has(moduleKeys.get(value)!)) {
              findings.push({ rule: "U2", file, subject, message: `pattern value '${value}' has type '${moduleKeys.get(value)}'; this family only allows token type(s) [${family.tokens.types!.join(", ")}]. Map it in generator.valueMap to use it as a literal.` });
            }
          }
          const negatives = Array.isArray(family.pattern.negativeValues) ? family.pattern.negativeValues : [];
          for (const value of negatives) {
            const negKey = `neg-${value}`;
            if (valueMap[negKey] !== undefined) continue;
            if (!moduleKeys.has(negKey)) {
              findings.push({ rule: "U2", file, subject, message: `negative value '${value}' has no '${negKey}' token in module '${family.tokens.group}'.` });
            } else if (allowedTypes && !allowedTypes.has(moduleKeys.get(negKey)!)) {
              findings.push({ rule: "U2", file, subject, message: `negative value '${value}' (token '${negKey}') has type '${moduleKeys.get(negKey)}'; this family only allows token type(s) [${family.tokens.types!.join(", ")}].` });
            }
          }
          // exclude entries must name real tokens, else a typo silently removes nothing.
          for (const value of family.pattern.exclude ?? []) {
            if (!moduleKeys.has(value)) {
              findings.push({ rule: "U2", file, subject, message: `exclude value '${value}' is not a token key in module '${family.tokens.group}'.` });
            }
          }
          // A literal that shares a token's name would silently shadow it with verbatim CSS.
          for (const value of Object.keys(literals)) {
            if (moduleKeys.has(value)) {
              findings.push({ rule: "U2", file, subject, message: `literal '${value}' shadows a token of the same name in module '${family.tokens.group}'; rename the literal or drop it.` });
            }
          }
        }
      }

      for (const breakpoint of family.modifiers?.responsive ?? []) {
        if (!breakpointKeys.has(breakpoint)) {
          findings.push({ rule: "U2", file, subject, message: `responsive modifier '${breakpoint}' is not a known breakpoint (${BREAKPOINTS.join(", ")}).` });
        }
      }

      const layer = family.layer ?? manifest.layer;
      if (layer !== undefined && !KNOWN_LAYERS.has(layer)) {
        findings.push({ rule: "U2", file, subject, message: `layer '${layer}' is not a known layer (${[...KNOWN_LAYERS].join(", ")}).` });
      }

      // valueTiers keys must name a value/class the family actually declares,
      // otherwise a typo silently tiers nothing.
      if (family.valueTiers) {
        const vocab = new Set<string>([
          ...(family.classes ?? []),
          ...(family.pattern?.values ?? []),
          ...(Array.isArray(family.pattern?.negativeValues) ? family.pattern!.negativeValues : []).map((v) => `neg-${v}`),
          ...Object.keys(family.pattern?.literals ?? {}),
          ...Object.keys(family.pattern?.aliases ?? {}),
        ]);
        for (const key of Object.keys(family.valueTiers)) {
          if (!vocab.has(key)) {
            findings.push({ rule: "U2", file, subject, message: `valueTiers key '${key}' is not a value or class declared by family '${family.name}'.` });
          }
        }
      }

      let sourcesOk = true;
      for (const source of [family.source].flat()) {
        if (!(await fs.pathExists(path.resolve(rootDir, source)))) {
          findings.push({ rule: "U2", file, subject, message: `source '${source}' does not exist.` });
          sourcesOk = false;
        }
      }
      if (!sourcesOk) continue;

      exceptionCount += (family.knownExceptions?.extra?.length ?? 0) + (family.knownExceptions?.missing?.length ?? 0);

      for (const source of [family.source].flat()) {
        const sources = bySource.get(source) ?? [];
        sources.push({ family, file });
        bySource.set(source, sources);
      }
    }
  }

  // Read each covered SCSS file once
  const fileClasses = new Map<string, Set<string>>();
  const definedIn = new Map<string, string[]>(); // class -> source files (for U4)
  for (const source of bySource.keys()) {
    const scss = await fs.readFile(path.resolve(rootDir, source), "utf8");
    const found = extractClasses(scss);
    fileClasses.set(source, found);
    for (const cls of found) definedIn.set(cls, [...(definedIn.get(cls) ?? []), source]);
  }

  // U3a — every class the grammar predicts exists in the union of the family's sources
  const expansions = new Map<UtilityFamily, Set<string>>();
  const seenFamilies = new Set<UtilityFamily>();
  for (const entries of bySource.values()) {
    for (const { family, file } of entries) {
      if (seenFamilies.has(family)) continue;
      seenFamilies.add(family);
      const subject = family.name;
      const { classes: expected, aliasErrors } = expandFamily(family);
      expansions.set(family, expected);
      for (const message of aliasErrors) findings.push({ rule: "U2", file, subject, message });

      const sources = [family.source].flat();
      const missingOk = new Set(family.knownExceptions?.missing ?? []);
      for (const cls of expected) {
        if (!sources.some((s) => fileClasses.get(s)?.has(cls)) && !missingOk.has(cls)) {
          findings.push({ rule: "U3", file, subject, message: `grammar predicts '.${cls}' but ${sources.join(", ")} does not define it.` });
        }
      }
    }
  }

  // U3b — every class found in a covered file is claimed by some family on that file
  for (const [source, entries] of bySource) {
    const claimed = new Set<string>();
    for (const { family } of entries) {
      for (const cls of expansions.get(family) ?? []) claimed.add(cls);
      for (const cls of family.knownExceptions?.missing ?? []) claimed.add(cls);
      for (const cls of family.knownExceptions?.extra ?? []) claimed.add(cls);
    }
    for (const cls of fileClasses.get(source) ?? []) {
      if (!claimed.has(cls)) {
        findings.push({ rule: "U3", file: entries[0].file, subject: source, message: `'.${cls}' is defined but no family claims it.` });
      }
    }
  }

  // U4 — cross-file duplicate definitions
  for (const [cls, sources] of definedIn) {
    if (sources.length > 1) {
      findings.push({ rule: "U4", file: sources[0], subject: `.${cls}`, message: `defined in ${sources.length} files: ${sources.join(", ")}.` });
    }
  }

  // U5 — every utilities partial is covered (or on the legacy migration list)
  for (const partial of globSync(UTILITIES_PARTIALS_GLOB, { cwd: rootDir }).sort()) {
    const basename = path.basename(partial);
    if (bySource.has(partial) || IGNORED_PARTIALS.has(basename) || LEGACY_PARTIALS.has(basename)) continue;
    findings.push({ rule: "U5", file: partial, subject: partial, message: "Utility partial is not covered by any utilities manifest family." });
  }

  if (findings.length === 0) {
    const legacy = LEGACY_PARTIALS.size > 0 ? chalk.yellow(` ${LEGACY_PARTIALS.size} legacy partial(s) awaiting migration.`) : "";
    const debt = exceptionCount > 0 ? chalk.yellow(` ${exceptionCount} known exception(s) on the ledger.`) : "";
    console.log(chalk.green(`Utility lint passed (${manifestCount} manifest(s), ${familyCount} families).`) + debt + legacy);
    return;
  }

  console.error(chalk.red(`Utility lint failed with ${findings.length} finding(s):`));
  const limit = process.argv.includes("--all") ? Infinity : 100;
  let shown = 0;
  for (const finding of findings) {
    if (shown++ >= limit) {
      console.error(chalk.yellow(`... ${findings.length - limit} more (run with --all to see everything).`));
      break;
    }
    console.error(`${chalk.yellow("-")} [${finding.rule}] ${chalk.cyan(finding.subject)} (${finding.file})\n  ${finding.message}`);
  }
  process.exitCode = 1;
}

main().catch((error) => {
  console.error(chalk.red(error?.stack ?? String(error)));
  process.exitCode = 1;
});
