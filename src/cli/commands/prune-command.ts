import path from 'path';
import {
  DEFAULT_PRUNE_CONTENT,
  DEFAULT_PRUNE_KEEP_LAYERS,
  type PruneConfig,
  type TokensConfig,
  type ZebkitConfig,
} from '../../scripts/config.js';
import { slugifyFileSegment } from '../../scripts/tokens/build-helpers.js';
import {
  loadComponentTokens,
  type scanContent as scanContentFn,
} from '../../scripts/prune/content-scan.js';
import type { pruneCss as pruneCssFn } from '../../scripts/prune/engine.js';
import { assembleReport, renderConsoleSummary } from '../../scripts/prune/report.js';
import type { PruneMode, PruneReport } from '../../scripts/prune/types.js';

/** Flags parsed by the standalone `zebkit prune` command. */
export interface PruneCommandOptions {
  /** `-c/--config` path. */
  config?: string;
  /** `--css` input CSS override. */
  css?: string;
  /** `--out` output path; implies alongside mode. */
  out?: string;
  /** `--replace` prune in place (mutually exclusive with `--out`). */
  replace?: boolean;
  /** `--dry-run` compute + report only, write no files. */
  dryRun?: boolean;
  /** `--report` JSON report path. */
  report?: string;
}

export interface PruneCommandDeps {
  readConfig: (
    configPath?: string
  ) => Promise<{ config: ZebkitConfig; path: string } | undefined>;
  scanContent: typeof scanContentFn;
  pruneCss: typeof pruneCssFn;
  readFile: (filePath: string) => Promise<string>;
  writeFile: (filePath: string, data: string) => Promise<void>;
  pathExists: (filePath: string) => Promise<boolean>;
  ensureDir: (dirPath: string) => Promise<void>;
  writeJson: (filePath: string, data: unknown) => Promise<void>;
  zebkitVersion: string;
  /** zebkit package root — locates the shipped component-token list. */
  zebkitPackageRoot: string;
  /** Working directory CLI flags resolve against (defaults handled by the caller). */
  cwd: string;
  log: (message: string) => void;
}

/** Turns `zbk-x.min.css` / `zbk-x.css` into its alongside `.pruned` sibling. */
export function derivePrunedPath(inputPath: string): string {
  return inputPath.replace(/(\.min)?\.css$/, '.pruned$1.css');
}

/** Report path derived from the output CSS path (`…\/zbk-x.min.css` → `…\/zbk-x.prune-report.json`). */
export function deriveReportPath(outputPath: string): string {
  return outputPath.replace(/(\.min)?\.css$/, '.prune-report.json');
}

/**
 * Default input: `<destinationPath>/zbk-<theme>.min.css`, resolved relative to `cwd`
 * exactly like the build writes it. `--css` overrides everything.
 */
export function resolveInputCssPath(
  options: PruneCommandOptions,
  tokensConfig: TokensConfig | undefined,
  cwd: string
): string {
  if (options.css) {
    return path.resolve(cwd, options.css);
  }
  const destination = tokensConfig?.destinationPath ?? './dist';
  const theme = tokensConfig?.themeName ?? tokensConfig?.basePreset ?? 'zebkit';
  const minifySuffix = tokensConfig?.minify === false ? '' : '.min';
  const fileName = `zbk-${slugifyFileSegment(theme)}${minifySuffix}.css`;
  return path.resolve(cwd, destination, fileName);
}

/**
 * Resolves output mode + path. Precedence: CLI flags > config > defaults. With
 * neither `--out` nor `--replace`, falls back to `tokens.prune.output`; absent that
 * too, defaults to alongside — the destructive replace path is never implicit.
 */
export function resolveOutput(
  options: PruneCommandOptions,
  pruneConfig: PruneConfig,
  inputPath: string,
  cwd: string
): { mode: PruneMode; outputPath: string } {
  if (options.replace && options.out) {
    throw new Error('`--replace` and `--out` are mutually exclusive.');
  }
  if (options.replace) {
    return { mode: 'replace', outputPath: inputPath };
  }
  if (options.out) {
    return { mode: 'alongside', outputPath: path.resolve(cwd, options.out) };
  }

  const configMode = pruneConfig.output?.mode;
  if (configMode === 'replace') {
    return { mode: 'replace', outputPath: inputPath };
  }
  const configuredPath = pruneConfig.output?.path?.trim();
  if (configuredPath) {
    return { mode: 'alongside', outputPath: path.resolve(cwd, configuredPath) };
  }
  return { mode: 'alongside', outputPath: derivePrunedPath(inputPath) };
}

/**
 * Runs a standalone prune: load config, scan content, prune the built CSS, write
 * output + report (unless `--dry-run`), and print a summary. Returns the report.
 */
export async function runPruneCommand(
  deps: PruneCommandDeps,
  options: PruneCommandOptions = {}
): Promise<PruneReport> {
  const loaded = await deps.readConfig(options.config);
  const configDir = loaded ? path.dirname(loaded.path) : deps.cwd;
  const tokensConfig = loaded?.config.tokens;
  const pruneConfig: PruneConfig = tokensConfig?.prune ?? {};

  const contentGlobs =
    pruneConfig.content && pruneConfig.content.length > 0
      ? pruneConfig.content
      : DEFAULT_PRUNE_CONTENT;
  const safelist = pruneConfig.safelist ?? [];
  const blocklist = pruneConfig.blocklist ?? [];
  const keepLayers = pruneConfig.keepLayers ?? DEFAULT_PRUNE_KEEP_LAYERS;
  const pruneTokens = pruneConfig.tokens !== false;

  const inputPath = resolveInputCssPath(options, tokensConfig, deps.cwd);
  if (!(await deps.pathExists(inputPath))) {
    throw new Error(
      `Input CSS not found at ${inputPath}. Run \`zebkit build\` first, or pass --css <path>.`
    );
  }

  const { mode, outputPath } = resolveOutput(options, pruneConfig, inputPath, deps.cwd);

  const componentTokens = await loadComponentTokens(deps.zebkitPackageRoot);
  const scan = await deps.scanContent({
    contentGlobs,
    cwd: configDir,
    inputCssPath: inputPath,
    componentTokens,
  });

  const inputCss = await deps.readFile(inputPath);
  const engineResult = deps.pruneCss(inputCss, {
    candidates: scan.candidates,
    tokenRoots: scan.tokenRoots,
    safelist,
    blocklist,
    tokens: pruneTokens,
    keepLayers,
  });

  const report = assembleReport(engineResult, {
    zebkitVersion: deps.zebkitVersion,
    inputPath,
    inputCss,
    outputPath,
    outputCss: engineResult.css,
    mode,
    contentFiles: scan.files,
    candidateCount: scan.candidates.size,
    safelistEntries: safelist.length,
  });

  const dryRun = options.dryRun === true;
  if (!dryRun) {
    await deps.ensureDir(path.dirname(outputPath));
    await deps.writeFile(outputPath, engineResult.css);

    const writeReport = options.report !== undefined || pruneConfig.report !== false;
    if (writeReport) {
      const reportPath = options.report
        ? path.resolve(deps.cwd, options.report)
        : deriveReportPath(outputPath);
      await deps.ensureDir(path.dirname(reportPath));
      await deps.writeJson(reportPath, report);
    }
  }

  deps.log(renderConsoleSummary(report, dryRun));
  return report;
}
