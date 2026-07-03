/**
 * @jest-environment node
 */

import { assembleReport, gzipSize, renderConsoleSummary } from './report';
import type { PruneEngineResult } from './types';

const engineResult = (): PruneEngineResult => ({
  css: '.a{color:red}',
  selectors: { kept: 1, dropped: 9 },
  classes: { kept: ['a'], dropped: ['b', 'c'] },
  tokens: { kept: 3, dropped: 2, droppedNames: ['--zbk-x', '--zbk-y'] },
  safelistHits: ['/^swiper/'],
  warnings: ['Kept selector "[class*=x]" — unsupported attribute operator "*="'],
});

const context = () => ({
  zebkitVersion: '0.7.0',
  inputPath: '/p/dist/zbk-x.min.css',
  inputCss: 'a'.repeat(1000),
  outputPath: '/p/dist/zbk-x.pruned.min.css',
  outputCss: '.a{color:red}',
  mode: 'alongside' as const,
  contentFiles: 12,
  candidateCount: 130,
  safelistEntries: 1,
});

describe('assembleReport', () => {
  it('merges engine stats with IO context into the full report shape', () => {
    const report = assembleReport(engineResult(), context());

    expect(report.zebkitVersion).toBe('0.7.0');
    expect(report.input.bytes).toBe(1000);
    expect(report.input.gzipBytes).toBe(gzipSize('a'.repeat(1000)));
    expect(report.output.mode).toBe('alongside');
    expect(report.content).toEqual({ files: 12, candidates: 130 });
    expect(report.selectors).toEqual({ kept: 1, dropped: 9 });
    expect(report.classes.dropped).toEqual(['b', 'c']);
    expect(report.tokens.droppedNames).toEqual(['--zbk-x', '--zbk-y']);
    expect(report.safelist).toEqual({ entries: 1, hits: ['/^swiper/'] });
    expect(report.warnings).toHaveLength(1);
    expect(() => new Date(report.generatedAt).toISOString()).not.toThrow();
  });
});

describe('renderConsoleSummary', () => {
  it('shows before/after sizes, counts, and the written path', () => {
    const summary = renderConsoleSummary(assembleReport(engineResult(), context()), false);

    expect(summary).toContain('zebkit prune');
    expect(summary).toContain('selectors  kept 1  dropped 9');
    expect(summary).toContain('tokens     kept 3  dropped 2');
    expect(summary).toContain('wrote /p/dist/zbk-x.pruned.min.css');
    expect(summary).toContain('unsupported attribute operator');
  });

  it('marks a dry run and names the would-be output', () => {
    const summary = renderConsoleSummary(assembleReport(engineResult(), context()), true);

    expect(summary).toContain('dry run');
    expect(summary).toContain('would write /p/dist/zbk-x.pruned.min.css');
    expect(summary).not.toContain('wrote /p/dist');
  });

  it('lists warnings inline at or below the threshold', () => {
    const result = { ...engineResult(), warnings: ['w1', 'w2', 'w3'] };
    const summary = renderConsoleSummary(assembleReport(result, context()), false);

    expect(summary).toContain('warning: w1');
    expect(summary).toContain('warning: w3');
    expect(summary).not.toContain('see report.warnings');
  });

  it('collapses to a summary line above the threshold, keeping the full list in the report', () => {
    const warnings = ['w1', 'w2', 'w3', 'w4', 'w5', 'w6'];
    const report = assembleReport({ ...engineResult(), warnings }, context());
    const summary = renderConsoleSummary(report, false);

    expect(summary).toContain('6 warnings — see report.warnings');
    expect(summary).not.toContain('warning: w1');
    // The report itself still carries every warning for debugging.
    expect(report.warnings).toEqual(warnings);
  });
});
