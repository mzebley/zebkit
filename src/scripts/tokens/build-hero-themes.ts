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

/** Preset name → its `theme/zebkit-hero-<name>` override directory. Mirror of the docs config overlays. */
const HERO_THEMES = ["apple", "material", "atlassian", "carbon", "uber", "fluent"] as const;

/**
 * Reads a preset's override `*.tokens.json` files and flattens them into a
 * `{ "<token-key>": "<pretty value>" }` map — exactly the set of tokens that
 * differ from the zebkit base, powering the hero's token-diff panel.
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

async function main(): Promise<void> {
  console.log(chalk.cyan("Building hero reskin diff manifest..."));
  const diffs: Record<string, Record<string, string>> = {};
  for (const name of HERO_THEMES) {
    diffs[name] = await readThemeDiff(name);
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
