#!/usr/bin/env tsx
/**
 * Phase 2a step 4 codemod (plans/dtcg-alignment/plan.md, decisions D4/D5/D11):
 * collapses the legacy dimension-family `$type` names — `spacing`, `sizing`,
 * `rootSize`, `borderWidth`, `borderRadius`, `fontSize`, `rootFontSize`,
 * `letterSpacing` (and the legacy `dimension` semantics) — into the two
 * surviving types:
 *
 *   - `dimension`     structured `{value, unit}` px/rem values, per the spec
 *   - `cssDimension`  every other CSS length surface (%, ch, em, keywords,
 *                     unitless 0, calc()/clamp() expressions)
 *
 * References take the collapsed type of their (transitively resolved) target,
 * so a `{spacing.2}` alias becomes `dimension` while a `{text-measure.3}` or
 * `{font-size.md}` alias becomes `cssDimension` (measures are `ch`; font-size
 * steps resolve to fluid `clamp()` strings). The resolution oracle is the
 * merged default-theme snapshot under `dist/cli/defaults/` — build it first.
 *
 * Touches:
 *   - src/** tokens/tokens.ts token modules (AST-guided `$type` text edits)
 *   - theme/** zbk-*.tokens.json override files (their `$type` is descriptive —
 *     the merge keeps `$type` base-controlled — but editor schemas pin it as a
 *     const, so documents must carry the base entry's collapsed type)
 *
 * Variant files are out of scope (I8). Idempotent: collapsed entries no longer
 * carry a dying type. Deleted at the end of Phase 4 (D11).
 */
import path from "path";
import fs from "fs-extra";
import ts from "typescript";
import { glob } from "glob";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), "..");
const DEFAULTS_DIR = path.join(REPO_ROOT, "dist", "cli", "defaults");

const DYING_TYPES = new Set([
  "spacing",
  "sizing",
  "dimension", // legacy semantics; entries re-classify by value shape
  "rootSize",
  "borderWidth",
  "borderRadius",
  "fontSize",
  "rootFontSize",
  "letterSpacing",
]);

/** Virtual reference targets (tokenAliasMap) that survive as hand-written CSS vars. */
const VIRTUAL_TARGET_TYPES: Record<string, string> = {
  tracking: "cssDimension",
  "letter-spacing": "dimension", // real module wins in practice; kept for safety
  "font-weight": "fontWeight",
};

let tsFilesChanged = 0;
let jsonFilesChanged = 0;
let entriesRetyped = 0;
const warnings: string[] = [];

// ---------------------------------------------------------------------------
// Collapsed-type oracle, built from dist/cli/defaults (merged default theme)
// ---------------------------------------------------------------------------

interface OracleEntry {
  $type?: unknown;
  $value?: unknown;
}

type Oracle = Map<string, Map<string, OracleEntry>>;

function isDimensionValue(v: unknown): boolean {
  return (
    !!v &&
    typeof v === "object" &&
    typeof (v as { value?: unknown }).value === "number" &&
    ((v as { unit?: unknown }).unit === "px" || (v as { unit?: unknown }).unit === "rem")
  );
}

function isReference(v: unknown): v is string {
  return typeof v === "string" && v.startsWith("{") && v.endsWith("}");
}

async function loadOracle(): Promise<Oracle> {
  const oracle: Oracle = new Map();
  const files = await glob("zbk-*.json", { cwd: DEFAULTS_DIR, absolute: true });
  for (const file of files.sort()) {
    const data = (await fs.readJson(file)) as Record<string, unknown>;
    const key = typeof data._key === "string" ? data._key.replace(/^zbk-/, "") : undefined;
    const moduleKey = key ?? path.basename(file, ".json").replace(/^zbk-/, "");
    const entries = new Map<string, OracleEntry>();
    for (const [entryKey, entry] of Object.entries(data)) {
      if (entry && typeof entry === "object" && "$type" in entry) {
        entries.set(entryKey, entry as OracleEntry);
      }
    }
    if (entries.size > 0) oracle.set(moduleKey, entries);
  }
  if (oracle.size === 0) {
    throw new Error(
      `No token modules found under ${DEFAULTS_DIR}. Run the token build (or \`npm run build\`) first — the oracle is the merged defaults snapshot.`
    );
  }
  return oracle;
}

/** The collapsed `$type` for one (module, entry), resolving reference chains. */
function collapsedType(
  oracle: Oracle,
  moduleKey: string,
  entryKey: string,
  seen: Set<string> = new Set()
): string {
  const id = `${moduleKey}.${entryKey}`;
  if (seen.has(id)) {
    warnings.push(`circular reference chain at ${id}; defaulting to cssDimension`);
    return "cssDimension";
  }
  seen.add(id);

  const entry = oracle.get(moduleKey)?.get(entryKey);
  if (!entry) {
    const virtual = VIRTUAL_TARGET_TYPES[moduleKey];
    if (virtual) return virtual;
    warnings.push(`unresolvable reference target ${id}; defaulting to cssDimension`);
    return "cssDimension";
  }

  const type = typeof entry.$type === "string" ? entry.$type : "";
  if (!DYING_TYPES.has(type)) return type;

  const value = entry.$value;
  if (isDimensionValue(value)) return "dimension";
  if (isReference(value)) {
    const target = value.slice(1, -1).split(".");
    if (target.length === 2) return collapsedType(oracle, target[0], target[1], seen);
    warnings.push(`malformed reference ${value} at ${id}; defaulting to cssDimension`);
    return "cssDimension";
  }
  // Steps (no $value, scale index) resolve to clamp()/calc() strings; string
  // literals in the dimension family are %, ch, em, keywords, or unitless 0.
  if (value == null || typeof value === "string" || typeof value === "number") {
    return "cssDimension";
  }
  warnings.push(`unclassifiable $value at ${id}; defaulting to cssDimension`);
  return "cssDimension";
}

// ---------------------------------------------------------------------------
// TypeScript token modules
// ---------------------------------------------------------------------------

interface Edit {
  start: number;
  end: number;
  replacement: string;
}

function propName(prop: ts.ObjectLiteralElementLike): string | undefined {
  if (!ts.isPropertyAssignment(prop)) return undefined;
  if (ts.isIdentifier(prop.name) || ts.isStringLiteral(prop.name)) return prop.name.text;
  return undefined;
}

/** The module's exported `key` (`export const key = "spacing"`). */
function moduleKeyOf(sourceFile: ts.SourceFile): string | undefined {
  let key: string | undefined;
  sourceFile.forEachChild((node) => {
    if (!ts.isVariableStatement(node)) return;
    for (const decl of node.declarationList.declarations) {
      if (
        ts.isIdentifier(decl.name) &&
        decl.name.text === "key" &&
        decl.initializer &&
        ts.isStringLiteralLike(decl.initializer)
      ) {
        key = decl.initializer.text;
      }
    }
  });
  return key;
}

async function migrateTsFile(file: string, oracle: Oracle): Promise<void> {
  const source = await fs.readFile(file, "utf8");
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const context = path.relative(REPO_ROOT, file);
  const moduleKey = moduleKeyOf(sourceFile);
  if (!moduleKey) return;

  const edits: Edit[] = [];

  const visit = (node: ts.Node): void => {
    if (ts.isPropertyAssignment(node) && ts.isObjectLiteralExpression(node.initializer)) {
      const entryKey = propName(node);
      const entryLiteral = node.initializer;
      for (const prop of entryLiteral.properties) {
        if (propName(prop) !== "$type" || !ts.isPropertyAssignment(prop)) continue;
        const init = prop.initializer;
        if (!ts.isStringLiteralLike(init) || !DYING_TYPES.has(init.text)) continue;
        if (!entryKey) {
          warnings.push(`${context}: $type "${init.text}" on unnamed entry left in place`);
          continue;
        }
        const next = collapsedType(oracle, moduleKey, entryKey);
        if (next === init.text) continue;
        edits.push({
          start: init.getStart(sourceFile),
          end: init.getEnd(),
          replacement: `"${next}"`,
        });
        entriesRetyped += 1;
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);

  if (edits.length === 0) return;
  edits.sort((a, b) => b.start - a.start);
  let output = source;
  for (const edit of edits) {
    output = output.slice(0, edit.start) + edit.replacement + output.slice(edit.end);
  }
  await fs.writeFile(file, output);
  tsFilesChanged += 1;
}

// ---------------------------------------------------------------------------
// Theme override documents
// ---------------------------------------------------------------------------

async function migrateJsonFile(file: string, oracle: Oracle): Promise<void> {
  const moduleKey = path.basename(file, ".tokens.json").replace(/^zbk-/, "");
  const data = (await fs.readJson(file)) as Record<string, unknown>;
  const context = path.relative(REPO_ROOT, file);
  let changed = false;

  for (const [entryKey, entry] of Object.entries(data)) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const record = entry as Record<string, unknown>;
    const type = record.$type;
    if (typeof type !== "string" || !DYING_TYPES.has(type)) continue;

    // The document's `$type` mirrors the base entry (editor schemas pin it as a
    // const); entries with no base counterpart classify by their own value.
    let next: string;
    if (oracle.get(moduleKey)?.has(entryKey)) {
      next = collapsedType(oracle, moduleKey, entryKey);
    } else if (isDimensionValue(record.$value)) {
      next = "dimension";
    } else if (isReference(record.$value)) {
      const target = record.$value.slice(1, -1).split(".");
      next =
        target.length === 2
          ? collapsedType(oracle, target[0], target[1])
          : "cssDimension";
      warnings.push(`${context}: ${entryKey} has no base entry; typed from its reference`);
    } else {
      next = "cssDimension";
      warnings.push(`${context}: ${entryKey} has no base entry; typed cssDimension`);
    }

    if (next !== type) {
      record.$type = next;
      entriesRetyped += 1;
      changed = true;
    }
  }

  if (!changed) return;
  await fs.writeFile(file, `${JSON.stringify(data, null, 2)}\n`);
  jsonFilesChanged += 1;
}

// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const oracle = await loadOracle();

  const tsFiles = await glob(
    ["src/tokens/**/tokens/tokens.ts", "src/components/*/tokens/tokens.ts"],
    { cwd: REPO_ROOT, absolute: true, nodir: true }
  );
  for (const file of tsFiles.sort()) await migrateTsFile(file, oracle);

  const jsonFiles = await glob("theme/**/zbk-*.tokens.json", {
    cwd: REPO_ROOT,
    absolute: true,
    nodir: true,
  });
  for (const file of jsonFiles.sort()) await migrateJsonFile(file, oracle);

  console.log(
    `D5 collapse complete: ${tsFilesChanged} TS module(s), ${jsonFilesChanged} theme file(s), ${entriesRetyped} entrie(s) retyped.`
  );
  if (warnings.length > 0) {
    console.log(`\n${warnings.length} warning(s):`);
    for (const warning of warnings) console.log(`  - ${warning}`);
  }
}

main().catch((error) => {
  console.error("codemod-d5-collapse failed:", error);
  process.exit(1);
});
