#!/usr/bin/env tsx
/**
 * DTCG migration golden-baseline runner (plans/dtcg-alignment/plan.md, Phase 0).
 *
 * Rebuilds every representative CSS artifact (docs base + hero overlays, each
 * custom theme dir, and one pruned build — all minify-off) into tmp/ and
 * byte-compares against the checked-in baseline under
 * plans/dtcg-alignment/baseline/. Enforces invariants I1–I3: emitted custom
 * property names, values, and @layer structure never change during the migration.
 *
 * Also runs the entry-order-shuffle check (invariant I7): the token pipeline must
 * derive an identical declaration set when module and entry order is reversed.
 *
 * Usage:
 *   npm run check:dtcg-baseline             # rebuild + diff (fails on any drift)
 *   npm run check:dtcg-baseline -- --update # re-baseline (builds twice to prove
 *                                           # determinism, then overwrites)
 */
import path from "path";
import crypto from "node:crypto";
import fs from "fs-extra";
import chalk from "chalk";
import { fileURLToPath } from "node:url";
import { runTokenBuild } from "../src/scripts/tokens/build-tokens.js";
import { gatherZebkitFiles } from "../src/scripts/tokens/gather-files.js";
import { buildZebkitTokens } from "../src/scripts/tokens/compile-tokens.js";
import { resolveSpaceScale } from "../src/scripts/tokens/build-space-scale.js";
import { resolveTypeScale } from "../src/scripts/tokens/build-type-scale.js";
import { convertTokensToCssVars } from "../src/scripts/tokens/token-converter.js";
import type { ZebkitConfig, TokensConfig } from "../src/scripts/config.js";
import type { TokenInterface } from "../src/definitions/tokens.js";
import type { LayerName } from "../src/definitions/layers.js";

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), "..");
const TMP_ROOT = path.join(REPO_ROOT, "tmp", "dtcg-baseline");
const BASELINE_DIR = path.join(REPO_ROOT, "plans", "dtcg-alignment", "baseline");
const BASELINE_FILES_DIR = path.join(BASELINE_DIR, "files");
const MANIFEST_PATH = path.join(BASELINE_DIR, "manifest.json");
/** Prune content fixture; see the note inside the fixture before touching it. */
const PRUNE_CONTENT_GLOB = "plans/dtcg-alignment/fixtures/*.html";

/** Only these artifacts are golden: CSS bundles and font head snippets. */
const ARTIFACT_PATTERN = /(\.css|\.fonts\.html)$/;

interface BaselineBuild {
  name: string;
  config: () => Promise<ZebkitConfig>;
}

function buildDir(name: string): string {
  return path.join(TMP_ROOT, name);
}

function absFromRoot(p: string): string {
  return path.isAbsolute(p) ? p : path.resolve(REPO_ROOT, p);
}

/** Strips export/lookup side-outputs and forces minify-off into a temp destination. */
function toBaselineTokensConfig(tokens: TokensConfig, name: string): TokensConfig {
  const next: TokensConfig = {
    ...tokens,
    destinationPath: buildDir(name),
    minify: false,
    exportTokens: false,
    writeVariantRegistry: false,
    writeTokenLookup: false,
    writeAllowedTokenTypes: false,
  };
  delete next.tokenLookupOutputPath;
  if (next.tokenPath) next.tokenPath = absFromRoot(next.tokenPath);
  if (next.overlays) {
    next.overlays = next.overlays.map((overlay) => ({
      ...overlay,
      tokenPath: absFromRoot(overlay.tokenPath),
      destinationPath: path.join(buildDir(name), "themes"),
    }));
  }
  return next;
}

async function configFromFile(configFile: string, name: string): Promise<ZebkitConfig> {
  const raw = (await fs.readJson(absFromRoot(configFile))) as ZebkitConfig;
  return {
    configVersion: raw.configVersion,
    tokens: toBaselineTokensConfig(raw.tokens ?? {}, name),
  };
}

/** A custom theme dir that has no checked-in config: build it against the default base. */
function syntheticThemeConfig(name: string, tokenPath: string): ZebkitConfig {
  return {
    configVersion: 1,
    tokens: toBaselineTokensConfig(
      {
        assetFilePath: "/",
        basePreset: "default",
        tokenPath,
        themeName: name,
      },
      name
    ),
  };
}

const BUILDS: BaselineBuild[] = [
  // Docs base theme + all six hero overlays (invariants I1–I3 for the primary surface).
  { name: "docs", config: () => configFromFile("theme/zebkit.docs.config.json", "docs") },
  // Custom theme dirs — every theme/*.tokens.json file the migration rewrites is
  // exercised by one of these builds (hero dirs via the docs overlays above).
  { name: "dynamowaves", config: () => configFromFile("theme/dynamowaves.config.json", "dynamowaves") },
  { name: "mark-down", config: () => configFromFile("theme/markdown.config.json", "mark-down") },
  {
    name: "nudge-deck",
    config: async () => syntheticThemeConfig("nudge-deck", path.join(REPO_ROOT, "theme", "nudge-deck")),
  },
  // One pruned build (alongside mode) over a fixed content fixture.
  {
    name: "pruned",
    config: async () => ({
      configVersion: 1,
      tokens: {
        destinationPath: buildDir("pruned"),
        assetFilePath: "/assets/",
        basePreset: "default",
        themeName: "default",
        minify: false,
        prune: {
          enabled: true,
          content: [PRUNE_CONTENT_GLOB],
          output: { mode: "alongside" },
          report: false,
        },
      },
    }),
  },
];

async function runBuilds(): Promise<void> {
  for (const build of BUILDS) {
    console.log(chalk.cyan(`\n--- baseline build: ${build.name} ---`));
    await runTokenBuild({ overrideConfig: await build.config() });
  }
}

async function collectArtifacts(root: string): Promise<Map<string, string>> {
  const artifacts = new Map<string, string>();
  const walk = async (dir: string): Promise<void> => {
    if (!(await fs.pathExists(dir))) return;
    for (const entry of (await fs.readdir(dir, { withFileTypes: true })).sort((a, b) =>
      a.name.localeCompare(b.name)
    )) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (ARTIFACT_PATTERN.test(entry.name)) {
        const content = await fs.readFile(full);
        const rel = path.relative(root, full).split(path.sep).join("/");
        artifacts.set(rel, crypto.createHash("sha256").update(content).digest("hex"));
      }
    }
  };
  await walk(root);
  return artifacts;
}

/** First differing line between two texts, with a little context, for diff reports. */
function firstDifference(baseline: string, built: string): string {
  const a = baseline.split("\n");
  const b = built.split("\n");
  const max = Math.max(a.length, b.length);
  for (let i = 0; i < max; i += 1) {
    if (a[i] !== b[i]) {
      return [
        `    first difference at line ${i + 1}:`,
        `      baseline: ${a[i] ?? "<missing>"}`,
        `      built:    ${b[i] ?? "<missing>"}`,
      ].join("\n");
    }
  }
  return "    (same line content — whitespace/encoding difference)";
}

async function diffAgainstBaseline(): Promise<boolean> {
  if (!(await fs.pathExists(MANIFEST_PATH))) {
    console.error(
      chalk.red(
        `No baseline manifest at ${path.relative(REPO_ROOT, MANIFEST_PATH)}. ` +
          `Run \`npm run check:dtcg-baseline -- --update\` on a known-good tree first.`
      )
    );
    return false;
  }

  const manifest = (await fs.readJson(MANIFEST_PATH)) as Record<string, string>;
  const built = await collectArtifacts(TMP_ROOT);
  const problems: string[] = [];

  for (const [rel, hash] of Object.entries(manifest)) {
    const builtHash = built.get(rel);
    if (!builtHash) {
      problems.push(`missing artifact (in baseline, not produced by build): ${rel}`);
      continue;
    }
    if (builtHash !== hash) {
      const baselineFile = path.join(BASELINE_FILES_DIR, rel);
      let detail = "";
      if (await fs.pathExists(baselineFile)) {
        detail =
          "\n" +
          firstDifference(
            await fs.readFile(baselineFile, "utf8"),
            await fs.readFile(path.join(TMP_ROOT, rel), "utf8")
          ) +
          `\n    inspect: diff ${path.relative(REPO_ROOT, baselineFile)} ${path.relative(
            REPO_ROOT,
            path.join(TMP_ROOT, rel)
          )}`;
      }
      problems.push(`changed artifact: ${rel}${detail}`);
    }
  }
  for (const rel of built.keys()) {
    if (!(rel in manifest)) {
      problems.push(`new artifact (produced by build, not in baseline): ${rel}`);
    }
  }

  if (problems.length > 0) {
    console.error(chalk.red(`\nGolden baseline drift detected (${problems.length} problem(s)):`));
    for (const problem of problems) console.error(chalk.red(`  - ${problem}`));
    console.error(
      chalk.yellow(
        "\nIf this change is intentional (only the phase explicitly allowed to change bytes), " +
          "re-baseline with `npm run check:dtcg-baseline -- --update` and review the git diff."
      )
    );
    return false;
  }

  console.log(chalk.green(`\nGolden baseline OK — ${built.size} artifact(s) byte-identical.`));
  return true;
}

async function updateBaseline(): Promise<void> {
  // Prove determinism before baking a baseline: two clean builds must agree.
  const firstPass = await collectArtifacts(TMP_ROOT);
  await fs.emptyDir(TMP_ROOT);
  await runBuilds();
  const secondPass = await collectArtifacts(TMP_ROOT);

  const stable =
    firstPass.size === secondPass.size &&
    [...firstPass].every(([rel, hash]) => secondPass.get(rel) === hash);
  if (!stable) {
    throw new Error(
      "Build output is not deterministic across two consecutive runs — refusing to write a baseline."
    );
  }

  await fs.emptyDir(BASELINE_FILES_DIR);
  for (const rel of secondPass.keys()) {
    await fs.copy(path.join(TMP_ROOT, rel), path.join(BASELINE_FILES_DIR, rel));
  }
  const manifest = Object.fromEntries(
    [...secondPass.entries()].sort(([a], [b]) => a.localeCompare(b))
  );
  await fs.writeJson(MANIFEST_PATH, manifest, { spaces: 2 });
  console.log(
    chalk.green(
      `\nBaseline updated — ${secondPass.size} artifact(s) written to ${path.relative(
        REPO_ROOT,
        BASELINE_DIR
      )} (determinism verified across two builds).`
    )
  );
}

// ---------------------------------------------------------------------------
// Entry-order-shuffle check (invariant I7)
// ---------------------------------------------------------------------------

/** Reverses module order and, within each module, entry order. (Integer-like keys
 * keep JS's numeric-first iteration either way — that is part of the invariant.) */
function reverseTokenMap(tokens: Record<string, TokenInterface>): Record<string, TokenInterface> {
  const out: Record<string, TokenInterface> = {};
  for (const [key, module] of Object.entries(tokens).reverse()) {
    out[key] = Object.fromEntries(Object.entries(module).reverse()) as TokenInterface;
  }
  return out;
}

/** Parses converter CSS into per-layer sorted `--name: value` declaration lists. */
function parseDeclarations(css: string): Record<string, string[]> {
  const perLayer: Record<string, string[]> = {};
  let currentLayer: string | null = null;
  for (const line of css.split("\n")) {
    const trimmed = line.trim();
    const layerOpen = trimmed.match(/^@layer ([a-z]+) \{$/);
    if (layerOpen) {
      currentLayer = layerOpen[1];
      perLayer[currentLayer] ??= [];
      continue;
    }
    if (!currentLayer) continue;
    const decl = trimmed.match(/^(--[\w-]+): (.*);$/);
    if (decl) perLayer[currentLayer].push(`${decl[1]}: ${decl[2]}`);
  }
  for (const layer of Object.keys(perLayer)) perLayer[layer].sort();
  return perLayer;
}

interface DerivedEmission {
  decls: Record<string, string[]>;
  fontHead: { preconnect: string[]; stylesheets: string[]; preloads: string[] };
}

function deriveEmission(
  tokens: Record<string, TokenInterface>,
  layers: Record<string, LayerName>
): DerivedEmission {
  let resolved = resolveSpaceScale(tokens, { mode: "fluid" });
  resolved = resolveTypeScale(resolved, { mode: "fluid" });
  // Mirror the build: breakpoints are build-time inputs, not emitted vars.
  resolved = { ...resolved };
  delete resolved["zbk-breakpoint"];

  const { css, fontHead, errors } = convertTokensToCssVars(resolved, {
    layers,
    fontStrategy: "link",
    assetFilePath: "/assets/",
  });
  if (errors.length > 0) {
    throw new Error(`Token conversion failed during order check:\n${errors.join("\n")}`);
  }
  return {
    decls: parseDeclarations(css),
    fontHead: {
      preconnect: [...fontHead.preconnect].sort(),
      stylesheets: [...fontHead.stylesheets].sort(),
      preloads: [...fontHead.preloads].sort(),
    },
  };
}

async function checkOrderInvariance(): Promise<boolean> {
  console.log(chalk.cyan("\n--- entry-order-shuffle check (I7) ---"));
  const files = await gatherZebkitFiles();
  const { tokens, layers } = await buildZebkitTokens(
    "order-check",
    files.tokenFiles,
    path.join(TMP_ROOT, "order-check"),
    undefined,
    [],
    {},
    false
  );

  const original = deriveEmission(tokens, layers);
  const reversed = deriveEmission(reverseTokenMap(tokens), layers);

  const problems: string[] = [];
  const layerNames = new Set([...Object.keys(original.decls), ...Object.keys(reversed.decls)]);
  for (const layer of layerNames) {
    const a = original.decls[layer] ?? [];
    const b = reversed.decls[layer] ?? [];
    if (a.length !== b.length) {
      problems.push(`layer ${layer}: ${a.length} vs ${b.length} declarations`);
    }
    for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
      if (a[i] !== b[i]) {
        problems.push(`layer ${layer}: "${a[i] ?? "<none>"}" vs "${b[i] ?? "<none>"}"`);
        if (problems.length > 10) break;
      }
    }
    if (problems.length > 10) break;
  }
  if (JSON.stringify(original.fontHead) !== JSON.stringify(reversed.fontHead)) {
    problems.push("font head requirements differ between orderings");
  }

  if (problems.length > 0) {
    console.error(
      chalk.red("Entry-order shuffle changed the derived output (invariant I7 violated):")
    );
    for (const problem of problems) console.error(chalk.red(`  - ${problem}`));
    return false;
  }

  const declCount = Object.values(original.decls).reduce((n, list) => n + list.length, 0);
  console.log(
    chalk.green(`Order invariance OK — ${declCount} declarations identical under reversed order.`)
  );
  return true;
}

async function main(): Promise<void> {
  const update = process.argv.includes("--update");
  process.chdir(REPO_ROOT);

  await fs.emptyDir(TMP_ROOT);
  await runBuilds();

  const orderOk = await checkOrderInvariance();

  if (update) {
    if (!orderOk) {
      throw new Error("Refusing to update the baseline while the order-invariance check fails.");
    }
    await updateBaseline();
    return;
  }

  const baselineOk = await diffAgainstBaseline();
  if (!baselineOk || !orderOk) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(chalk.red("check-dtcg-baseline failed:"), error);
  process.exit(1);
});
