#!/usr/bin/env tsx
// Slot contract generator: writes each component's slot-contract.ts from its
// zbk-{name}.manifest.json, so the runtime warnings (unknown slot, missing
// required content) share one source of truth with the docs and agent
// context. lint:components rule C6 fails on drift.
//
// Run: npm run generate:components

import fs from "fs-extra";
import path from "node:path";
import chalk from "chalk";
import { globSync } from "glob";
import { renderSlotContract } from "./render.js";

async function main() {
  const rootDir = process.cwd();

  for (const file of globSync("src/components/*/zbk-*.manifest.json", { cwd: rootDir }).sort()) {
    const manifest = await fs.readJson(path.resolve(rootDir, file));
    const outPath = path.join(path.dirname(path.resolve(rootDir, file)), "slot-contract.ts");
    await fs.writeFile(outPath, renderSlotContract(manifest));
    console.log(chalk.green(`Wrote ${path.relative(rootDir, outPath)}`));
  }
}

main().catch((error) => {
  console.error(chalk.red(error?.stack ?? String(error)));
  process.exitCode = 1;
});
