#!/usr/bin/env tsx
/**
 * Builds the docs "Reskin hero" token-diff manifest (`generated/hero-themes.json`).
 *
 * The hero stylesheets themselves are now compiled by the standard token build as scoped
 * overlay themes — see the `overlays` array in `theme/zebkit.docs.config.json`. This script is the
 * docs-only remainder: it reads each hero preset's `theme/zebkit-hero-<name>` override files
 * and flattens them into the `{ "<token-key>": "<pretty value>" }` diff the hero's token-diff
 * panel renders. It reads the same source files the overlay CSS was compiled from, so the
 * panel cannot drift from the emitted theme.
 */
import path from "path";
import fs from "fs-extra";
import chalk from "chalk";
import { projectThemeTokenDiff } from "./docs-token-data";

const REPO_ROOT = path.resolve(process.cwd());
const THEME_DIR = path.join(REPO_ROOT, "theme");
const DIFF_OUTPUT = path.join(
  REPO_ROOT,
  "doc-site",
  "src",
  "lib",
  "data",
  "generated",
  "hero-themes.json"
);
const DEFAULT_TOKENS_PATH = path.join(
  REPO_ROOT,
  "doc-site",
  "static",
  "zebkit",
  "default-tokens.json"
);

/** Preset name → its `theme/zebkit-hero-<name>` override directory. Mirror of the docs config overlays. */
const HERO_THEMES = ["apple", "material", "atlassian", "carbon", "uber", "fluent"] as const;

/**
 * Reads a preset's override `*.tokens.json` files and flattens them into a
 * `{ "<token-key>": "<pretty value>" }` map — exactly the set of tokens that
 * differ from the zebkit base, powering the hero's token-diff panel.
 */
async function readThemeDiff(
  name: string,
  referenceDocuments: Record<string, Record<string, unknown>>
): Promise<Record<string, string>> {
  const dir = path.join(THEME_DIR, `zebkit-hero-${name}`);
  const files = (await fs.readdir(dir)).filter((f) => f.endsWith(".tokens.json"));
  const diff: Record<string, string> = {};
  for (const file of files) {
    const moduleKey = file.replace(/^zbk-/, "").replace(/\.tokens\.json$/, "");
    const json = (await fs.readJson(path.join(dir, file))) as Record<string, unknown>;
    Object.assign(diff, projectThemeTokenDiff(moduleKey, json, referenceDocuments));
  }
  return diff;
}

async function main(): Promise<void> {
  console.log(chalk.cyan("Building hero reskin diff manifest..."));
  const referenceDocuments = await fs.readJson(DEFAULT_TOKENS_PATH) as Record<
    string,
    Record<string, unknown>
  >;
  const diffs: Record<string, Record<string, string>> = {};
  for (const name of HERO_THEMES) {
    diffs[name] = await readThemeDiff(name, referenceDocuments);
  }

  await fs.ensureDir(path.dirname(DIFF_OUTPUT));
  await fs.writeJson(DIFF_OUTPUT, diffs, { spaces: 2 });
  console.log(chalk.green(`  diff → ${path.relative(REPO_ROOT, DIFF_OUTPUT)}`));
  console.log(chalk.cyan(`Done — ${HERO_THEMES.length} hero themes.`));
}

main().catch((error) => {
  console.error(chalk.red("Failed to build hero diff manifest:"), error);
  process.exit(1);
});
