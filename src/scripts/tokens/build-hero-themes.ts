#!/usr/bin/env tsx
/**
 * Builds the docs "Reskin hero" theme stylesheets.
 *
 * Each hero preset is a real zebkit theme (default base + a `theme/zebkit-hero-<name>`
 * override set). Unlike the full token build, this emits ONLY the scoped token layer
 * (`@layer ... { [data-zbk-theme="<name>"] { --zbk-*: ... } }`) — no primitive color
 * ramps and no utility classes, because those already exist globally in the base
 * `zbk-default.min.css` and token references resolve to `var(--zbk-color-*)`.
 *
 * The result: switching `data-zbk-theme` on the hero root re-skins the whole subtree via
 * pure CSS inheritance, with no `:root` duplication. (See DOCS-BUILD-PLAN.md T5.1 / Phase C.)
 */
import path from "path";
import fs from "fs-extra";
import chalk from "chalk";
import { gatherZebkitFiles } from "@token-scripts/gather-files";
import { buildZebkitTokens } from "@token-scripts/compile-tokens";
import { convertTokensToCssVars } from "@token-scripts/token-converter";
import { resolveTypeScale } from "@token-scripts/build-type-scale";
import { resolveSpaceScale } from "@token-scripts/build-space-scale";

const REPO_ROOT = path.resolve(process.cwd());
const THEME_DIR = path.join(REPO_ROOT, "theme");
const OUTPUT_DIR = path.join(REPO_ROOT, "docs", "static", "zebkit", "themes");
const DIFF_OUTPUT = path.join(
  REPO_ROOT,
  "docs",
  "src",
  "lib",
  "data",
  "generated",
  "hero-themes.json"
);

/** Preset name → its `theme/zebkit-hero-<name>` override directory. */
const HERO_THEMES = ["apple", "material", "atlassian", "carbon", "uber"] as const;

/**
 * Reads a preset's override `*.tokens.json` files and flattens them into a
 * `{ "<token-key>": "<pretty value>" }` map — exactly the set of tokens that
 * differ from the zebkit base. Powers the hero's token-diff panel (T5.2): the
 * panel reads the same source files the scoped CSS was compiled from, so it
 * cannot drift.
 */
async function readThemeDiff(name: string): Promise<Record<string, string>> {
  const dir = path.join(THEME_DIR, `zebkit-hero-${name}`);
  const files = (await fs.readdir(dir)).filter((f) => f.endsWith(".tokens.json"));
  const diff: Record<string, string> = {};
  for (const file of files) {
    const moduleKey = file.replace(/^zbk-/, "").replace(/\.tokens\.json$/, "");
    const json = (await fs.readJson(path.join(dir, file))) as Record<
      string,
      { value?: string }
    >;
    for (const [tokenKey, entry] of Object.entries(json)) {
      if (!entry || typeof entry.value !== "string") continue;
      // `{color.red-600}` → `red-600`, `{spacing.0}` → `0`, fonts kept verbatim.
      const pretty = entry.value.replace(/^\{[a-z-]+\.(.+)\}$/, "$1");
      diff[`${moduleKey}-${tokenKey}`] = pretty;
    }
  }
  return diff;
}

async function buildHeroTheme(
  name: string,
  tokenFiles: string[]
): Promise<void> {
  const customTokenPath = path.join(THEME_DIR, `zebkit-hero-${name}`);
  if (!(await fs.pathExists(customTokenPath))) {
    throw new Error(`Hero theme override dir not found: ${customTokenPath}`);
  }

  // Build the merged token map (default base + this preset's overrides).
  // exportFile=false → no JSON artifacts written; OUTPUT_DIR is only a placeholder.
  const { tokens, layers } = await buildZebkitTokens(
    name,
    tokenFiles,
    OUTPUT_DIR,
    customTokenPath,
    [],
    { splitMode: "combined" },
    false
  );

  // Emit ONLY the scoped token layer — primitives/utilities stay global in the base CSS.
  // Resolve the fluid spacing + font-size scales so generated steps reach the converter
  // fully formed (space first; it reads the shared anchors type-scale then strips).
  const selector = `[data-zbk-theme="${name}"]`;
  const css = convertTokensToCssVars(
    resolveTypeScale(resolveSpaceScale(tokens)),
    { layers, selector }
  );

  const outFile = path.join(OUTPUT_DIR, `${name}.css`);
  await fs.ensureDir(OUTPUT_DIR);
  await fs.writeFile(outFile, css);
  console.log(chalk.green(`  ${name} → ${path.relative(REPO_ROOT, outFile)}`));
}

async function main(): Promise<void> {
  console.log(chalk.cyan("Building hero reskin themes..."));
  // Core token modules are identical across presets; gather once.
  const { tokenFiles } = await gatherZebkitFiles([]);

  const diffs: Record<string, Record<string, string>> = {};
  for (const name of HERO_THEMES) {
    await buildHeroTheme(name, tokenFiles);
    diffs[name] = await readThemeDiff(name);
  }

  await fs.ensureDir(path.dirname(DIFF_OUTPUT));
  await fs.writeJson(DIFF_OUTPUT, diffs, { spaces: 2 });
  console.log(
    chalk.green(`  diff → ${path.relative(REPO_ROOT, DIFF_OUTPUT)}`)
  );
  console.log(chalk.cyan(`Done — ${HERO_THEMES.length} hero themes.`));
}

main().catch((error) => {
  console.error(chalk.red("Failed to build hero themes:"), error);
  process.exit(1);
});
