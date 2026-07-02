/**
 * Report shaping and console rendering. The report exists because dynamically
 * constructed class names (`` `text-${color}` ``) are invisible to a static
 * scanner — the dropped-class list is what makes that failure findable.
 */
import zlib from 'node:zlib';
import chalk from 'chalk';
import type { PruneEngineResult, PruneMode, PruneReport } from './types';

/** Gzipped byte length of a string, for the before/after size comparison. */
export function gzipSize(text: string): number {
  return zlib.gzipSync(text).length;
}

export interface ReportContext {
  zebkitVersion: string;
  inputPath: string;
  inputCss: string;
  outputPath: string;
  outputCss: string;
  mode: PruneMode;
  contentFiles: number;
  candidateCount: number;
  safelistEntries: number;
}

/** Combines engine statistics with IO context into the full, serializable report. */
export function assembleReport(
  engine: PruneEngineResult,
  ctx: ReportContext
): PruneReport {
  return {
    zebkitVersion: ctx.zebkitVersion,
    generatedAt: new Date().toISOString(),
    input: {
      path: ctx.inputPath,
      bytes: Buffer.byteLength(ctx.inputCss),
      gzipBytes: gzipSize(ctx.inputCss),
    },
    output: {
      path: ctx.outputPath,
      bytes: Buffer.byteLength(ctx.outputCss),
      gzipBytes: gzipSize(ctx.outputCss),
      mode: ctx.mode,
    },
    content: { files: ctx.contentFiles, candidates: ctx.candidateCount },
    selectors: engine.selectors,
    classes: engine.classes,
    tokens: engine.tokens,
    safelist: { entries: ctx.safelistEntries, hits: engine.safelistHits },
    warnings: engine.warnings,
  };
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

function percentDrop(before: number, after: number): string {
  if (before === 0) return '0%';
  return `${(((before - after) / before) * 100).toFixed(1)}%`;
}

/**
 * Above this count, warnings collapse to a single summary line in the console. The
 * full list always stays in `report.warnings`. Keeps benign, always-present notes
 * (e.g. zebkit's `[class^=transition-]` base rules) from drowning out the warnings
 * channel that exists to flag dynamically constructed class names.
 */
const MAX_INLINE_WARNINGS = 3;

/** Compact colored summary for the terminal. `dryRun` swaps the "wrote" line. */
export function renderConsoleSummary(report: PruneReport, dryRun: boolean): string {
  const { input, output, selectors, tokens, content } = report;
  const lines = [
    chalk.cyan('zebkit prune'),
    `  raw   ${formatBytes(input.bytes)} → ${formatBytes(output.bytes)}  (${chalk.green(
      `-${percentDrop(input.bytes, output.bytes)}`
    )})`,
    `  gzip  ${formatBytes(input.gzipBytes)} → ${formatBytes(output.gzipBytes)}  (${chalk.green(
      `-${percentDrop(input.gzipBytes, output.gzipBytes)}`
    )})`,
    `  selectors  kept ${selectors.kept}  dropped ${selectors.dropped}`,
    `  tokens     kept ${tokens.kept}  dropped ${tokens.dropped}`,
    `  content    ${content.files} files, ${content.candidates} candidates`,
  ];

  if (report.safelist.hits.length > 0) {
    lines.push(`  safelist   ${report.safelist.hits.length} entr${report.safelist.hits.length === 1 ? 'y' : 'ies'} matched`);
  }
  if (report.warnings.length > MAX_INLINE_WARNINGS) {
    lines.push(chalk.yellow(`  ${report.warnings.length} warnings — see report.warnings`));
  } else {
    for (const warning of report.warnings) {
      lines.push(chalk.yellow(`  warning: ${warning}`));
    }
  }

  lines.push(
    dryRun
      ? chalk.yellow(`  dry run — no file written (would write ${output.path}, mode: ${output.mode})`)
      : chalk.green(`  wrote ${output.path} (mode: ${output.mode})`)
  );

  return lines.join('\n');
}
