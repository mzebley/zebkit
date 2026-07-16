#!/usr/bin/env tsx
/**
 * Emits a fresh, per-family snapshot of the current zebkit BASELINE tokens —
 * one `zbk-<family>.tokens.json` file per token module, matching the layout of
 * the `theme/zebkit-hero-*` override folders.
 *
 * This is a reference artifact (not a build input): use it to see the
 * authoritative set of base token keys / authored values / descriptions when
 * authoring a new theme's override files. Values are the RAW authored values
 * from each core token module (no fluid space/type-scale resolution), because
 * overrides reference token KEYS, not the compiled `clamp()` output.
 */
import path from "path";
import chalk from "chalk";
import { gatherZebkitFiles } from "@token-scripts/gather-files";
import { buildZebkitTokens } from "@token-scripts/compile-tokens";

const REPO_ROOT = path.resolve(process.cwd());
const OUTPUT_DIR = path.join(REPO_ROOT, "theme", "zebkit-baseline");

async function main(): Promise<void> {
  console.log(chalk.cyan("Building baseline token reference (per-family)..."));

  // No components, no overrides — pure zebkit base.
  const { tokenFiles } = await gatherZebkitFiles();

  await buildZebkitTokens(
    "baseline",
    tokenFiles,
    OUTPUT_DIR,
    undefined,
    ["json"],
    { splitMode: "per-module" },
    true
  );

  console.log(
    chalk.green(`Done → ${path.relative(REPO_ROOT, OUTPUT_DIR)}/zbk-*.tokens.json`)
  );
}

main().catch((error) => {
  console.error(chalk.red("Failed to build baseline token reference:"), error);
  process.exit(1);
});
