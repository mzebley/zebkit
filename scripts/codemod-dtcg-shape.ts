#!/usr/bin/env tsx
/**
 * Phase 1 codemod (plans/dtcg-alignment/plan.md, decision D11): rewrites the token
 * entry shape from `{ value, type, description, a11y?, <font meta> }` to the DTCG
 * form `{ $value, $type, $description, $extensions?: { "dev.zebkit": { a11y?, font? } } }`.
 *
 * Touches:
 *   - theme/** zbk-*.tokens.json override files (data transform)
 *   - src/** tokens/tokens.ts token modules (AST-guided text edits — comments,
 *     template literals, and computed values are preserved verbatim)
 *
 * Variant files (*.variant.*.json / *.variants.json) are explicitly out of scope (I8).
 *
 * This is a migration tool, not a compat layer: it is deleted at the end of Phase 4.
 * Idempotent — already-migrated entries are left alone.
 */
import path from "path";
import fs from "fs-extra";
import ts from "typescript";
import { glob } from "glob";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), "..");

const VENDOR_KEY = "dev.zebkit";
const FONT_META_KEYS = ["source", "fallback", "weights", "styles", "faces", "display"] as const;

let jsonFilesChanged = 0;
let tsFilesChanged = 0;
let entriesMigrated = 0;
const warnings: string[] = [];

// ---------------------------------------------------------------------------
// JSON override files
// ---------------------------------------------------------------------------

type JsonEntry = Record<string, unknown>;

function isLegacyEntry(entry: unknown): entry is JsonEntry {
  return (
    !!entry &&
    typeof entry === "object" &&
    !Array.isArray(entry) &&
    ("value" in entry || "type" in entry || "index" in entry) &&
    !("$value" in entry) &&
    !("$type" in entry)
  );
}

function migrateJsonEntry(entry: JsonEntry, context: string): JsonEntry {
  const out: JsonEntry = {};
  const extension: JsonEntry = {};
  const font: JsonEntry = {};
  const isFont = entry.type === "fontFamily";

  for (const [key, value] of Object.entries(entry)) {
    if (key === "value") out.$value = value;
    else if (key === "type") out.$type = value;
    else if (key === "description") out.$description = value;
    else if (key === "a11y") extension.a11y = value;
    else if (key === "additional") warnings.push(`${context}: dropped unused 'additional' field`);
    else if (isFont && (FONT_META_KEYS as readonly string[]).includes(key)) font[key] = value;
    else if (key === "index" || key === "growth") out[key] = value; // build-time fields; move in Phase 2a
    else {
      warnings.push(`${context}: unrecognized entry field '${key}' kept as-is`);
      out[key] = value;
    }
  }

  if (Object.keys(font).length > 0) extension.font = font;
  if (Object.keys(extension).length > 0) out.$extensions = { [VENDOR_KEY]: extension };
  entriesMigrated += 1;
  return out;
}

async function migrateJsonFile(file: string): Promise<void> {
  const data = (await fs.readJson(file)) as Record<string, unknown>;
  let changed = false;
  const next: Record<string, unknown> = {};
  for (const [name, entry] of Object.entries(data)) {
    if (isLegacyEntry(entry)) {
      next[name] = migrateJsonEntry(entry, `${path.relative(REPO_ROOT, file)} → ${name}`);
      changed = true;
    } else {
      next[name] = entry;
    }
  }
  if (changed) {
    await fs.writeFile(file, `${JSON.stringify(next, null, 2)}\n`);
    jsonFilesChanged += 1;
  }
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

/** A token entry literal: has a `type` property plus `value`/`index`/`description`. */
function isEntryLiteral(node: ts.ObjectLiteralExpression): boolean {
  const names = new Set(node.properties.map(propName).filter(Boolean));
  return (
    names.has("type") &&
    (names.has("value") || names.has("index") || names.has("description")) &&
    !names.has("$type")
  );
}

function entryTypeText(node: ts.ObjectLiteralExpression): string | undefined {
  for (const prop of node.properties) {
    if (propName(prop) === "type" && ts.isPropertyAssignment(prop)) {
      const init = prop.initializer;
      if (ts.isStringLiteralLike(init)) return init.text;
    }
  }
  return undefined;
}

/** End position of a property plus its trailing comma (and preceding gap), if present. */
function endPastComma(source: string, prop: ts.Node): number {
  let end = prop.getEnd();
  let cursor = end;
  while (cursor < source.length && /\s/.test(source[cursor])) cursor += 1;
  if (source[cursor] === ",") return cursor + 1;
  return end;
}

function migrateEntryLiteral(
  node: ts.ObjectLiteralExpression,
  sourceFile: ts.SourceFile,
  edits: Edit[],
  context: string
): void {
  const isFont = entryTypeText(node) === "fontFamily";
  const moved: { prop: ts.PropertyAssignment; name: string }[] = [];

  for (const prop of node.properties) {
    const name = propName(prop);
    if (!name || !ts.isPropertyAssignment(prop)) continue;
    if (name === "value" || name === "type" || name === "description") {
      edits.push({
        start: prop.name.getStart(sourceFile),
        end: prop.name.getEnd(),
        replacement: `$${name}`,
      });
    } else if (name === "a11y" || (isFont && (FONT_META_KEYS as readonly string[]).includes(name))) {
      moved.push({ prop, name });
    } else if (name === "additional") {
      warnings.push(`${context}: 'additional' field needs manual review`);
    } else if (name !== "index" && name !== "growth") {
      warnings.push(`${context}: unrecognized entry field '${name}' left in place`);
    }
  }

  if (moved.length > 0) {
    const a11yParts = moved
      .filter(({ name }) => name === "a11y")
      .map(({ prop }) => prop.getText(sourceFile));
    const fontParts = moved
      .filter(({ name }) => name !== "a11y")
      .map(({ prop }) => prop.getText(sourceFile));
    const pieces = [...a11yParts];
    if (fontParts.length > 0) pieces.push(`font: { ${fontParts.join(", ")} }`);
    const replacement = `$extensions: { "${VENDOR_KEY}": { ${pieces.join(", ")} } }`;

    const [first, ...rest] = moved;
    edits.push({
      start: first.prop.getStart(sourceFile),
      end: first.prop.getEnd(),
      replacement,
    });
    const source = sourceFile.getFullText();
    for (const { prop } of rest) {
      edits.push({
        start: prop.getFullStart(),
        end: endPastComma(source, prop),
        replacement: "",
      });
    }
  }

  entriesMigrated += 1;
}

async function migrateTsFile(file: string): Promise<void> {
  const source = await fs.readFile(file, "utf8");
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const edits: Edit[] = [];
  const context = path.relative(REPO_ROOT, file);

  const visit = (node: ts.Node): void => {
    if (ts.isObjectLiteralExpression(node) && isEntryLiteral(node)) {
      migrateEntryLiteral(node, sourceFile, edits, context);
      // Entries do not nest entries; still recurse for safety (faces arrays etc.
      // never satisfy isEntryLiteral).
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

async function main(): Promise<void> {
  // Explicit file arguments: apply only the TS entry-literal transform to those
  // files (used for test fixtures). No arguments = full sweep.
  const fileArgs = process.argv.slice(2).filter((arg) => !arg.startsWith("-"));
  if (fileArgs.length > 0) {
    for (const arg of fileArgs) {
      const file = path.isAbsolute(arg) ? arg : path.resolve(REPO_ROOT, arg);
      if (file.endsWith(".json")) await migrateJsonFile(file);
      else await migrateTsFile(file);
    }
    console.log(
      `Codemod complete: ${jsonFilesChanged} JSON file(s), ${tsFilesChanged} TS file(s), ${entriesMigrated} entrie(s) migrated.`
    );
    for (const warning of warnings) console.log(`  - ${warning}`);
    return;
  }

  const jsonFiles = await glob("theme/**/zbk-*.tokens.json", {
    cwd: REPO_ROOT,
    absolute: true,
    nodir: true,
  });
  for (const file of jsonFiles.sort()) await migrateJsonFile(file);

  const tsFiles = await glob(["src/tokens/**/tokens/tokens.ts", "src/components/*/tokens/tokens.ts"], {
    cwd: REPO_ROOT,
    absolute: true,
    nodir: true,
  });
  for (const file of tsFiles.sort()) await migrateTsFile(file);

  console.log(
    `Codemod complete: ${jsonFilesChanged} JSON file(s), ${tsFilesChanged} TS module(s), ${entriesMigrated} entrie(s) migrated.`
  );
  if (warnings.length > 0) {
    console.log(`\n${warnings.length} warning(s):`);
    for (const warning of warnings) console.log(`  - ${warning}`);
  }
}

main().catch((error) => {
  console.error("codemod-dtcg-shape failed:", error);
  process.exit(1);
});
