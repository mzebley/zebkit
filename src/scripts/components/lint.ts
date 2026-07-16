#!/usr/bin/env tsx
// Component manifest linter.
//
// zbk-*.manifest.json files are the hand-authored guidance layer of a
// component's contract: the slot vocabulary and semantics, usage guidance, and
// canonical examples. Attributes, tokens, events, and variants stay derived
// from code (CEM, token modules, variant registry) — the manifest never
// restates them, and this linter keeps the two halves honest:
//
//   C1  manifest validates against schemas/component-manifest.schema.json
//   C2  integrity: tag has a CEM declaration and the manifest lives in that
//       component's directory; related / notWhen.instead zbk-* tags exist;
//       variantTiers keys are registered variants; slot tokens.size/color are
//       real keys in the component's token module
//   C3  examples are executable documentation: every zbk-* tag exists in the
//       CEM; attributes on zbk-* elements exist in the CEM (global HTML
//       attributes pass); slot="..." values are slots this manifest declares;
//       variant="..." names are registered for that component; a tier below
//       recommended carries a `why`
//   C4  coverage: every zbk-* tag in the CEM has a manifest
//       (MISSING_MANIFESTS is the migration ledger)
//   C5  delivery diff: the slots the manifest declares match the slots the
//       component source consumes, in both directions
//   C6  the generated slot-contract.ts matches what the manifest would emit
//       (run `npm run generate:components` on drift)
//   C7  component styles/runtime token references exactly match their token module
//   C8  every component is imported, re-exported, and defined by the registry
//   C9  INSTALL.md and component README HTML fences are executable documentation
//
// C5 is deliberately asymmetric. "Declared but never delivered" accepts any
// quoted occurrence of the slot name (delivery often flows through private
// wrappers like renderIndicator('checked')). "Delivered but never declared"
// uses only the precise base-class call sites — slotted()/hasSlotted()
// literals and the icon helpers whose name parameter defaults to "icon" —
// because a broad literal match would false-positive on attribute names that
// shadow the vocabulary ('checked' the attribute vs checked the slot).
//
// MISSING_MANIFESTS is the debt ledger: shrink it, never grow it.
//
// Run: npm run lint:components

import fs from "fs-extra";
import path from "node:path";
import { pathToFileURL } from "node:url";
import chalk from "chalk";
import { globSync } from "glob";
import Ajv from "ajv/dist/2020.js";
import { loadTokenModules } from "../utilities/token-source.js";
import { renderSlotContract } from "./render.js";
import { extractZbkTokens } from "../prune/content-scan.js";

type Finding = { rule: string; file: string; subject: string; message: string };

const SCHEMA_PATH = "schemas/component-manifest.schema.json";
const MANIFEST_GLOB = "src/components/*/zbk-*.manifest.json";
const CEM_PATH = "custom-elements.json";

// Components in the CEM that predate the manifest system. Author the
// manifest, then DELETE the tag here. Never add to this list.
// zbk-heading is pre-grammar (LitElement + shadow slot, no ZebkitElement
// content adoption) — it stays until it is rebuilt on the base class.
const MISSING_MANIFESTS = new Set(["zbk-heading"]);

// C7 is deliberately empty. Add an entry only for a token whose consumption is
// genuinely indirect, with a reason; remove it as soon as the indirection goes away.
const KNOWN_TOKEN_EXCEPTIONS: Record<string, ReadonlySet<string>> = {};

// Attributes examples may use on any zbk-* element without a CEM declaration.
// aria-*, data-*, and on* pass by prefix.
const GLOBAL_ATTRIBUTES = new Set([
  "accesskey",
  "autocapitalize",
  "autofocus",
  "class",
  "contenteditable",
  "dir",
  "draggable",
  "hidden",
  "id",
  "inert",
  "is",
  "lang",
  "part",
  "popover",
  "role",
  "slot",
  "spellcheck",
  "style",
  "tabindex",
  "title",
  "translate",
]);

function isGlobalAttribute(name: string): boolean {
  return (
    GLOBAL_ATTRIBUTES.has(name) ||
    name.startsWith("aria-") ||
    name.startsWith("data-") ||
    name.startsWith("on")
  );
}

interface CemDeclaration {
  tagName?: string;
  attributes?: { name: string }[];
}

/** tag -> attribute names declared in the Custom Elements Manifest. */
async function loadCem(rootDir: string): Promise<Map<string, Set<string>>> {
  const cem = (await fs.readJson(path.resolve(rootDir, CEM_PATH))) as {
    modules: { declarations?: CemDeclaration[] }[];
  };
  const tags = new Map<string, Set<string>>();
  for (const decl of cem.modules.flatMap((mod) => mod.declarations ?? [])) {
    if (!decl.tagName?.startsWith("zbk-")) continue;
    tags.set(decl.tagName, new Set((decl.attributes ?? []).map((attr) => attr.name)));
  }
  return tags;
}

/** component name -> registered shipped-variant names, from variants/index.ts modules. */
async function loadVariantNames(rootDir: string): Promise<Map<string, Set<string>>> {
  const byComponent = new Map<string, Set<string>>();
  for (const file of globSync("src/components/*/variants/index.ts", { cwd: rootDir }).sort()) {
    const component = path.basename(path.dirname(path.dirname(file)));
    const mod = await import(pathToFileURL(path.resolve(rootDir, file)).href);
    const names = byComponent.get(component) ?? new Set<string>();
    for (const value of Object.values(mod as Record<string, unknown>)) {
      if (!Array.isArray(value)) continue;
      for (const entry of value) {
        const name = (entry as { name?: unknown })?.name;
        if (typeof name === "string") names.add(name);
      }
    }
    byComponent.set(component, names);
  }
  return byComponent;
}

type ScannedElement = { tag: string; attrs: Map<string, string> };

/** Extract start tags + attributes from an example's html (end tags skipped). */
function scanElements(html: string): ScannedElement[] {
  const elements: ScannedElement[] = [];
  for (const tagMatch of html.matchAll(/<([a-zA-Z][\w-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g)) {
    const attrs = new Map<string, string>();
    for (const attrMatch of tagMatch[2].matchAll(
      /([\w-]+(?::[\w-]+)?)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g,
    )) {
      attrs.set(attrMatch[1], attrMatch[2] ?? attrMatch[3] ?? attrMatch[4] ?? "");
    }
    elements.push({ tag: tagMatch[1].toLowerCase(), attrs });
  }
  return elements;
}

type ExampleValidationContext = {
  cemTags: Map<string, Set<string>>;
  variantNames: Map<string, Set<string>>;
  slotsByTag: Map<string, Set<string>>;
  declaredSlots: Set<string>;
};

/** Shared C3/C9 validator for manifest examples and Markdown HTML fences. */
function validateExampleHtml(
  html: string,
  context: ExampleValidationContext,
  onFinding: (message: string) => void,
): void {
  const elements = scanElements(html);
  const exampleSlots = new Set(context.declaredSlots);
  for (const element of elements) {
    for (const name of context.slotsByTag.get(element.tag) ?? []) exampleSlots.add(name);
  }
  for (const element of elements) {
    const isZbk = element.tag.startsWith("zbk-");
    if (isZbk && !context.cemTags.has(element.tag)) {
      onFinding(`<${element.tag}> has no CEM declaration.`);
      continue;
    }
    for (const [attr, value] of element.attrs) {
      if (isZbk && !context.cemTags.get(element.tag)!.has(attr) && !isGlobalAttribute(attr)) {
        onFinding(`<${element.tag}> has no attribute '${attr}' (CEM: ${[...context.cemTags.get(element.tag)!].join(", ")}).`);
      }
      if (attr === "slot" && !exampleSlots.has(value)) {
        onFinding(`slot="${value}" is not declared by any component in this example (declared: ${[...exampleSlots].join(", ")}).`);
      }
      if (attr === "variant" && isZbk) {
        const registered = context.variantNames.get(element.tag.replace(/^zbk-/, "")) ?? new Set<string>();
        for (const name of value.split(/\s+/).filter(Boolean)) {
          if (!registered.has(name)) {
            onFinding(`variant '${name}' is not registered for ${element.tag} (registered: ${[...registered].join(", ") || "none"}).`);
          }
        }
      }
    }
  }
}

function htmlFences(markdown: string): { html: string; line: number }[] {
  const fences: { html: string; line: number }[] = [];
  const pattern = /^```html(?:\s+(no-lint))?\s*\n([\s\S]*?)^```\s*$/gim;
  for (const match of markdown.matchAll(pattern)) {
    if (match[1] === "no-lint") continue;
    fences.push({ html: match[2], line: markdown.slice(0, match.index).split("\n").length });
  }
  return fences;
}

/**
 * Slot names the component source consumes, split into the precise set (safe
 * to flag as undeclared) and the broad set (safe only to satisfy delivery) —
 * see the C5 note in the header.
 */
function deliveredSlots(source: string, vocabulary: Set<string>): {
  precise: Set<string>;
  broad: Set<string>;
} {
  const code = source
    .replace(/\/\/[^\n]*/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "");
  const precise = new Set<string>();

  // Bare slotted()/hasSlotted() render the default content.
  if (/\b(?:slotted|hasSlotted)\(\s*\)/.test(code)) precise.add("default");
  for (const match of code.matchAll(/\b(?:slotted|hasSlotted)\(\s*["']([^"']+)["']/g)) {
    precise.add(match[1]);
  }
  // Icon helpers: the name parameter defaults to "icon"; positions are the
  // other string literals these calls carry.
  for (const match of code.matchAll(/\b(?:renderIcon|iconsAt|hasIcon)\(([^)]*)\)/g)) {
    const literals = [...match[1].matchAll(/["']([^"']+)["']/g)].map((m) => m[1]);
    precise.add(literals.find((value) => value !== "start" && value !== "end") ?? "icon");
  }

  const broad = new Set(precise);
  for (const match of code.matchAll(/["']([a-z-]+)["']/g)) {
    if (vocabulary.has(match[1])) broad.add(match[1]);
  }
  return { precise, broad };
}

async function main() {
  const rootDir = process.cwd();
  const findings: Finding[] = [];

  const schema = await fs.readJson(path.resolve(rootDir, SCHEMA_PATH));
  const ajv = new Ajv({ allErrors: true, allowUnionTypes: true });
  const validate = ajv.compile<any>(schema);

  // The schema's slot-name enum IS the shared vocabulary (GRAMMAR.md §7).
  const vocabulary = new Set<string>(schema.properties.slots.propertyNames.enum);

  const cemTags = await loadCem(rootDir);
  const variantNames = await loadVariantNames(rootDir);
  const tokenModules = await loadTokenModules(rootDir);

  const manifestFiles = globSync(MANIFEST_GLOB, { cwd: rootDir }).sort();
  const manifestTags = new Set<string>();
  let slotCount = 0;
  let exampleCount = 0;

  // Pass 1 — read + C1, and collect each valid manifest's declared slots so
  // pass 2 can validate composed examples (a tooltip example slotting an icon
  // into a nested zbk-button) against every participating component.
  const valid: { file: string; manifest: any }[] = [];
  const slotsByTag = new Map<string, Set<string>>();

  for (const file of manifestFiles) {
    const manifest: any = await fs.readJson(path.resolve(rootDir, file));
    const subjectBase = manifest.tag ?? file;

    // C1 — schema validation
    if (!validate(manifest)) {
      for (const error of validate.errors ?? []) {
        findings.push({
          rule: "C1",
          file,
          subject: `${subjectBase}${error.instancePath}`,
          message: error.message ?? "schema violation",
        });
      }
      continue;
    }

    valid.push({ file, manifest });
    manifestTags.add(manifest.tag);
    slotsByTag.set(manifest.tag, new Set(Object.keys(manifest.slots)));
  }

  // Pass 2 — everything that needs the full manifest set in view.
  for (const { file, manifest } of valid) {
    const tag: string = manifest.tag;
    const component = tag.replace(/^zbk-/, "");

    // C2 — the tag is a real component and the manifest lives beside it
    if (!cemTags.has(tag)) {
      findings.push({
        rule: "C2",
        file,
        subject: tag,
        message: `tag '${tag}' has no declaration in ${CEM_PATH} — is the component exported and build:cem current?`,
      });
      continue;
    }
    const expectedPath = `src/components/${component}/${tag}.manifest.json`;
    if (file !== expectedPath) {
      findings.push({
        rule: "C2",
        file,
        subject: tag,
        message: `manifest for '${tag}' must live at ${expectedPath}.`,
      });
    }

    // C2 — cross-references resolve. `instead` may be prose ("zbk-input with
    // mask"); validate the leading tag token so a typo'd tag still fails.
    const referencedTags = [
      ...(manifest.related ?? []),
      ...(manifest.notWhen ?? [])
        .map((entry: { instead?: string }) => /^(zbk-[a-z0-9-]+)/.exec(entry.instead ?? "")?.[1])
        .filter((instead: string | undefined): instead is string => Boolean(instead)),
    ];
    for (const ref of referencedTags) {
      if (!cemTags.has(ref)) {
        findings.push({
          rule: "C2",
          file,
          subject: `${tag}.${ref}`,
          message: `referenced component '${ref}' has no CEM declaration (known: ${[...cemTags.keys()].join(", ")}).`,
        });
      }
    }

    const registered = variantNames.get(component) ?? new Set<string>();
    for (const name of Object.keys(manifest.variantTiers ?? {})) {
      if (!registered.has(name)) {
        findings.push({
          rule: "C2",
          file,
          subject: `${tag}.variantTiers.${name}`,
          message: `'${name}' is not a registered ${component} variant (registered: ${[...registered].join(", ") || "none"}).`,
        });
      }
    }

    // C2 — slot token references are real keys in the component's token module
    const moduleKeys = tokenModules.get(component);
    for (const [slotName, slot] of Object.entries(manifest.slots) as [string, any][]) {
      slotCount++;
      for (const [kind, key] of Object.entries(slot.tokens ?? {}) as [string, string][]) {
        if (!moduleKeys) {
          findings.push({
            rule: "C2",
            file,
            subject: `${tag}.slots.${slotName}`,
            message: `no token module with key '${component}' found to validate tokens.${kind} against.`,
          });
        } else if (!moduleKeys.has(key)) {
          findings.push({
            rule: "C2",
            file,
            subject: `${tag}.slots.${slotName}`,
            message: `tokens.${kind} '${key}' is not a token key in module '${component}'.`,
          });
        }
      }
    }

    // C3 — examples are executable documentation
    const declaredSlots = new Set(Object.keys(manifest.slots));
    for (const example of manifest.examples as {
      title: string;
      html: string;
      tier?: string;
      why?: string;
    }[]) {
      exampleCount++;
      const subject = `${tag}.examples['${example.title}']`;

      if (example.tier && example.tier !== "recommended" && !example.why) {
        findings.push({
          rule: "C3",
          file,
          subject,
          message: `tier '${example.tier}' needs a 'why' — say what breaks or when it applies.`,
        });
      }

      validateExampleHtml(
        example.html,
        { cemTags, variantNames, slotsByTag, declaredSlots },
        (message) => findings.push({ rule: "C3", file, subject, message }),
      );
    }

    // C6 — the generated runtime slot contract matches the manifest
    const contractPath = `src/components/${component}/slot-contract.ts`;
    const expected = renderSlotContract(manifest);
    const actual = (await fs.pathExists(path.resolve(rootDir, contractPath)))
      ? await fs.readFile(path.resolve(rootDir, contractPath), "utf8")
      : null;
    if (actual !== expected) {
      findings.push({
        rule: "C6",
        file,
        subject: tag,
        message:
          actual === null
            ? `${contractPath} does not exist — run \`npm run generate:components\`.`
            : `${contractPath} does not match the manifest — run \`npm run generate:components\`.`,
      });
    }

    // C5 — delivery diff against the component source
    const sourcePath = path.resolve(rootDir, `src/components/${component}/index.ts`);
    if (!(await fs.pathExists(sourcePath))) {
      findings.push({
        rule: "C5",
        file,
        subject: tag,
        message: `src/components/${component}/index.ts does not exist to check slot delivery against.`,
      });
      continue;
    }
    const { precise, broad } = deliveredSlots(await fs.readFile(sourcePath, "utf8"), vocabulary);
    for (const slotName of declaredSlots) {
      if (!broad.has(slotName)) {
        findings.push({
          rule: "C5",
          file,
          subject: `${tag}.slots.${slotName}`,
          message: `declared slot '${slotName}' is never consumed by src/components/${component}/index.ts — deliver it or drop the declaration.`,
        });
      }
    }
    for (const slotName of precise) {
      if (!declaredSlots.has(slotName)) {
        findings.push({
          rule: "C5",
          file,
          subject: `${tag}.slots.${slotName}`,
          message: `source consumes slot '${slotName}' but the manifest does not declare it.`,
        });
      }
    }
  }

  // C7 — token delivery diff. A component surface is only honest when every
  // defined token is consumed and every consumed component token is defined.
  const tokenComponentDirs = globSync("src/components/*/tokens/tokens.ts", { cwd: rootDir })
    .map((file) => path.basename(path.dirname(path.dirname(file))));
  for (const component of tokenComponentDirs) {
    const keys = tokenModules.get(component)!;
    const componentDir = path.resolve(rootDir, "src/components", component);
    const sources = await Promise.all(
      ["styles.scss", "index.ts"].map(async (name) => {
        const sourcePath = path.join(componentDir, name);
        return (await fs.pathExists(sourcePath)) ? fs.readFile(sourcePath, "utf8") : "";
      }),
    );
    const prefix = `--zbk-${component}-`;
    const referenced = new Set(
      sources.flatMap((source) =>
        extractZbkTokens(
          source
            .replace(/\/\/[^\n]*/g, "")
            .replace(/\/\*[\s\S]*?\*\//g, "")
            .replace(/--#\{prefix\.\$cssVar\}/g, "--zbk"),
        ).filter((token) => token.startsWith(prefix) && token !== prefix),
      ),
    );
    const defined = new Set([...keys.keys()].map((key) => `${prefix}${key}`));
    const exceptions = KNOWN_TOKEN_EXCEPTIONS[component] ?? new Set<string>();
    for (const token of referenced) {
      if (!defined.has(token)) {
        findings.push({
          rule: "C7",
          file: `src/components/${component}/styles.scss`,
          subject: `zbk-${component}`,
          message: `references '${token}' but tokens/tokens.ts does not define it — add the token to the component surface or use a defined token (${[...defined].join(", ")}).`,
        });
      }
    }
    for (const token of defined) {
      if (!referenced.has(token) && !exceptions.has(token)) {
        findings.push({
          rule: "C7",
          file: `src/components/${component}/tokens/tokens.ts`,
          subject: `zbk-${component}`,
          message: `defines '${token}' but styles.scss and index.ts never consume it — deliver the token or delete the dead surface.`,
        });
      }
    }
  }

  // C8 — src/components/index.ts is the single manual registry seam.
  const registryPath = "src/components/index.ts";
  const registrySource = await fs.readFile(path.resolve(rootDir, registryPath), "utf8");
  const componentDirs = globSync("src/components/*/index.ts", { cwd: rootDir })
    .map((file) => path.basename(path.dirname(file)))
    .filter((name) => name !== "base");
  for (const component of componentDirs) {
    const pascal = component.replace(/(^|-)([a-z])/g, (_, _dash, letter) => letter.toUpperCase());
    const className = `Zbk${pascal}`;
    const defineName = `defineZbk${pascal}`;
    const imported = new RegExp(`import\\s+\\{[^}]*\\b${className}\\b[^}]*\\b${defineName}\\b[^}]*\\}\\s+from\\s+["']\\./${component}["']`).test(registrySource);
    const reExported = new RegExp(`export\\s+\\{[\\s\\S]*?\\b${className}\\b[\\s\\S]*?\\b${defineName}\\b[\\s\\S]*?\\}`, "m").test(registrySource);
    const defined = new RegExp(`defineZebkitComponents[\\s\\S]*?\\b${defineName}\\(\\)`).test(registrySource);
    if (!imported || !reExported || !defined) {
      findings.push({
        rule: "C8",
        file: registryPath,
        subject: `zbk-${component}`,
        message: `is not fully registered — import ${className} and ${defineName} from './${component}', re-export both, and call ${defineName}() inside defineZebkitComponents().`,
      });
    }
  }

  // C9 — Markdown examples use the same parser and validation as C3. Docs
  // MDX remains intentionally out of scope because its template expressions
  // need an MDX-aware parser.
  const markdownFiles = ["INSTALL.md", ...globSync("src/components/*/README.md", { cwd: rootDir }).sort()];
  for (const file of markdownFiles) {
    const source = await fs.readFile(path.resolve(rootDir, file), "utf8");
    for (const fence of htmlFences(source)) {
      validateExampleHtml(
        fence.html,
        { cemTags, variantNames, slotsByTag, declaredSlots: new Set() },
        (message) => findings.push({ rule: "C9", file, subject: `html fence at line ${fence.line}`, message }),
      );
    }
  }

  // C4 — every component has a manifest (or sits on the migration ledger)
  for (const tag of [...cemTags.keys()].sort()) {
    if (manifestTags.has(tag) || MISSING_MANIFESTS.has(tag)) continue;
    findings.push({
      rule: "C4",
      file: CEM_PATH,
      subject: tag,
      message: `no manifest at src/components/${tag.replace(/^zbk-/, "")}/${tag}.manifest.json.`,
    });
  }
  for (const tag of MISSING_MANIFESTS) {
    if (manifestTags.has(tag)) {
      findings.push({
        rule: "C4",
        file: CEM_PATH,
        subject: tag,
        message: `'${tag}' has a manifest — delete it from MISSING_MANIFESTS in src/scripts/components/lint.ts.`,
      });
    }
  }

  if (findings.length === 0) {
    const debt =
      MISSING_MANIFESTS.size > 0
        ? chalk.yellow(` ${MISSING_MANIFESTS.size} component(s) awaiting manifests.`)
        : "";
    console.log(
      chalk.green(
        `Component lint passed (${manifestFiles.length} manifest(s), ${slotCount} slots, ${exampleCount} examples).`,
      ) + debt,
    );
    return;
  }

  console.error(chalk.red(`Component lint failed with ${findings.length} finding(s):`));
  const limit = process.argv.includes("--all") ? Infinity : 100;
  let shown = 0;
  for (const finding of findings) {
    if (shown++ >= limit) {
      console.error(chalk.yellow(`... ${findings.length - limit} more (run with --all to see everything).`));
      break;
    }
    console.error(
      `${chalk.yellow("-")} [${finding.rule}] ${chalk.cyan(finding.subject)} (${finding.file})\n  ${finding.message}`,
    );
  }
  process.exitCode = 1;
}

main().catch((error) => {
  console.error(chalk.red(error?.stack ?? String(error)));
  process.exitCode = 1;
});
