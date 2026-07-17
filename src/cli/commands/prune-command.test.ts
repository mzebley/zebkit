/**
 * @jest-environment node
 */

import os from 'os';
import path from 'path';
import fs from 'fs-extra';
import { loadZebkitConfig } from '../../scripts/config';
import { scanContent } from '../../scripts/prune/content-scan';
import { pruneCss } from '../../scripts/prune/engine';
import {
  derivePrunedPath,
  deriveReportPath,
  resolveInputCssPath,
  resolveOutput,
  runPruneCommand,
  type PruneCommandDeps,
} from './prune-command';

describe('path derivation', () => {
  it('derives the alongside .pruned sibling of a min.css', () => {
    expect(derivePrunedPath('/p/dist/zbk-x.min.css')).toBe('/p/dist/zbk-x.pruned.min.css');
    expect(derivePrunedPath('/p/dist/zbk-x.css')).toBe('/p/dist/zbk-x.pruned.css');
  });

  it('derives the report path from the output CSS path', () => {
    expect(deriveReportPath('/p/dist/zbk-x.pruned.min.css')).toBe(
      '/p/dist/zbk-x.pruned.prune-report.json'
    );
  });
});

describe('resolveInputCssPath', () => {
  it('defaults to <destinationPath>/zbk-<theme>.min.css', () => {
    const result = resolveInputCssPath(
      {},
      { destinationPath: './dist', themeName: 'My Theme' },
      '/proj'
    );
    expect(result).toBe(path.resolve('/proj/dist/zbk-my-theme.min.css'));
  });

  it('drops .min when minify is disabled', () => {
    const result = resolveInputCssPath({}, { themeName: 'x', minify: false }, '/proj');
    expect(result).toBe(path.resolve('/proj/dist/zbk-x.css'));
  });

  it('falls back to basePreset then "zebkit" for the theme name', () => {
    expect(resolveInputCssPath({}, { basePreset: 'dusk' }, '/proj')).toBe(
      path.resolve('/proj/dist/zbk-dusk.min.css')
    );
    expect(resolveInputCssPath({}, undefined, '/proj')).toBe(
      path.resolve('/proj/dist/zbk-zebkit.min.css')
    );
  });

  it('honors an explicit --css override', () => {
    expect(resolveInputCssPath({ css: 'build/out.css' }, undefined, '/proj')).toBe(
      path.resolve('/proj/build/out.css')
    );
  });
});

describe('resolveOutput', () => {
  const input = '/proj/dist/zbk-x.min.css';

  it('throws on --replace + --out together', () => {
    expect(() =>
      resolveOutput({ replace: true, out: 'x.css' }, {}, input, '/proj')
    ).toThrow(/mutually exclusive/);
  });

  it('--replace writes in place', () => {
    expect(resolveOutput({ replace: true }, {}, input, '/proj')).toEqual({
      mode: 'replace',
      outputPath: input,
    });
  });

  it('--out implies alongside mode', () => {
    expect(resolveOutput({ out: 'out/pruned.css' }, {}, input, '/proj')).toEqual({
      mode: 'alongside',
      outputPath: path.resolve('/proj/out/pruned.css'),
    });
  });

  it('falls back to config output.mode = replace', () => {
    expect(resolveOutput({}, { output: { mode: 'replace' } }, input, '/proj')).toEqual({
      mode: 'replace',
      outputPath: input,
    });
  });

  it('falls back to config output.path (alongside)', () => {
    expect(
      resolveOutput({}, { output: { mode: 'alongside', path: 'css/p.css' } }, input, '/proj')
    ).toEqual({ mode: 'alongside', outputPath: path.resolve('/proj/css/p.css') });
  });

  it('defaults to alongside derived path when nothing is set (never implicit replace)', () => {
    expect(resolveOutput({}, {}, input, '/proj')).toEqual({
      mode: 'alongside',
      outputPath: '/proj/dist/zbk-x.pruned.min.css',
    });
  });
});

describe('runPruneCommand (fixture project)', () => {
  let dir: string;
  const theme = 'demo';

  // Classes referenced in the fixture markup that also exist in the input CSS.
  // The acceptance invariant: every one of these must survive pruning.
  const MARKUP_CLASSES = ['button', 'text-center', 'h1', 'tablet:text-sm', 'hover:border-action'];
  // Present in the CSS but never referenced by the markup.
  const DEAD_CLASSES = ['unused-util', 'disabled:opacity-50'];

  const INPUT_CSS = [
    '@layer theme, base, components, utilities;',
    '@layer base{body{margin:0}}',
    ':root{--zbk-neutral-120:#111;--zbk-h1-color:var(--zbk-neutral-120);--zbk-unused-token:#eee}',
    '@layer utilities{',
    '.button{color:red}',
    '.text-center{text-align:center}',
    '.unused-util{display:none}',
    '[class~="hover:border-action"]:hover{border-color:blue}',
    '[class~="disabled:opacity-50"]{opacity:.5}',
    '.tablet\\:text-sm{font-size:1rem}',
    '.h1{color:var(--zbk-h1-color)}',
    '}',
  ].join('\n');

  const normalize = (css: string) => css.replace(/\\/g, '');

  const realDeps = (): PruneCommandDeps => ({
    readConfig: loadZebkitConfig,
    scanContent,
    pruneCss,
    readFile: (filePath) => fs.readFile(filePath, 'utf8'),
    writeFile: (filePath, data) => fs.writeFile(filePath, data),
    pathExists: (filePath) => fs.pathExists(filePath),
    ensureDir: (dirPath) => fs.ensureDir(dirPath),
    writeJson: (filePath, data) => fs.writeJson(filePath, data, { spaces: 2 }),
    zebkitVersion: '0.7.0-test',
    zebkitPackageRoot: dir,
    cwd: dir,
    log: () => {},
  });

  const configPath = () => path.join(dir, 'zebkit.config.json');
  const inputPath = () => path.join(dir, 'dist', `zbk-${theme}.min.css`);
  const prunedPath = () => path.join(dir, 'dist', `zbk-${theme}.pruned.min.css`);

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'zbk-prune-'));
    await fs.outputJson(configPath(), {
      configVersion: 1,
      tokens: {
        destinationPath: './dist',
        themeName: theme,
        prune: { content: ['src/**/*.svelte'] },
      },
    });
    await fs.outputFile(
      path.join(dir, 'src/App.svelte'),
      `<h1 class="h1 button text-center tablet:text-sm hover:border-action">Hi</h1>`
    );
    await fs.outputFile(inputPath(), INPUT_CSS);
  });

  afterEach(async () => {
    await fs.remove(dir);
  });

  it('prunes alongside by default and preserves every referenced class (invariant)', async () => {
    const report = await runPruneCommand(realDeps(), { config: configPath() });

    const output = normalize(await fs.readFile(prunedPath(), 'utf8'));
    const inputNormalized = normalize(INPUT_CSS);

    for (const cls of MARKUP_CLASSES) {
      expect(inputNormalized).toContain(cls); // fixture sanity
      expect(output).toContain(cls); // the acceptance invariant
    }
    for (const dead of DEAD_CLASSES) {
      expect(output).not.toContain(dead);
    }
    // Token graph: the referenced chain survives, the orphan token is dropped.
    expect(output).toContain('--zbk-h1-color');
    expect(output).toContain('--zbk-neutral-120');
    expect(output).not.toContain('--zbk-unused-token');

    expect(report.output.mode).toBe('alongside');
    expect(report.selectors.dropped).toBeGreaterThan(0);
    expect(report.tokens.dropped).toBe(1);

    // Canonical input is untouched in alongside mode.
    expect(await fs.readFile(inputPath(), 'utf8')).toBe(INPUT_CSS);
  });

  it('writes the JSON report next to the output', async () => {
    await runPruneCommand(realDeps(), { config: configPath() });
    const reportPath = path.join(dir, 'dist', `zbk-${theme}.pruned.prune-report.json`);

    expect(await fs.pathExists(reportPath)).toBe(true);
    const written = await fs.readJson(reportPath);
    expect(written.classes.dropped).toContain('unused-util');
  });

  it('--replace overwrites the canonical file in place', async () => {
    await runPruneCommand(realDeps(), { config: configPath(), replace: true });

    const canonical = normalize(await fs.readFile(inputPath(), 'utf8'));
    expect(canonical).toContain('button');
    expect(canonical).not.toContain('unused-util');
    expect(await fs.pathExists(prunedPath())).toBe(false);
  });

  it('--dry-run writes nothing but returns the report', async () => {
    const report = await runPruneCommand(realDeps(), { config: configPath(), dryRun: true });

    expect(await fs.pathExists(prunedPath())).toBe(false);
    expect(await fs.readFile(inputPath(), 'utf8')).toBe(INPUT_CSS);
    expect(report.selectors.dropped).toBeGreaterThan(0);
  });

  it('errors when the input CSS is missing', async () => {
    await fs.remove(inputPath());
    await expect(
      runPruneCommand(realDeps(), { config: configPath() })
    ).rejects.toThrow(/Input CSS not found/);
  });

  it('keeps base :root tokens referenced only by a configured overlay', async () => {
    const baseCss = [
      '@layer utilities{.button{color:red}}',
      ':root{--zbk-overlay-primitive:#222;--zbk-truly-unused:#333}',
    ].join('\n');
    await fs.outputFile(inputPath(), baseCss);
    await fs.outputJson(configPath(), {
      configVersion: 1,
      tokens: {
        destinationPath: './dist',
        themeName: theme,
        overlays: [{ themeName: 'dark', tokenPath: './dark' }],
        prune: { content: ['src/**/*.svelte'] },
      },
    });
    // Overlay output references a base primitive the light theme never uses.
    await fs.outputFile(
      path.join(dir, 'dist', 'zbk-dark.css'),
      '[data-zbk-theme="dark"]{--zbk-h1-color:var(--zbk-overlay-primitive)}'
    );
    await fs.outputFile(path.join(dir, 'src/App.svelte'), '<div class="button"></div>');

    const report = await runPruneCommand(realDeps(), { config: configPath() });
    const out = await fs.readFile(prunedPath(), 'utf8');

    expect(out).toContain('--zbk-overlay-primitive'); // survives via the overlay reference
    expect(out).not.toContain('--zbk-truly-unused'); // still pruned
    expect(report.tokens.droppedNames).toContain('--zbk-truly-unused');
    expect(report.tokens.droppedNames).not.toContain('--zbk-overlay-primitive');
  });

  it('respects the report:false config (no report file)', async () => {
    await fs.outputJson(configPath(), {
      configVersion: 1,
      tokens: {
        destinationPath: './dist',
        themeName: theme,
        prune: { content: ['src/**/*.svelte'], report: false },
      },
    });
    await runPruneCommand(realDeps(), { config: configPath() });
    const reportPath = path.join(dir, 'dist', `zbk-${theme}.pruned.prune-report.json`);
    expect(await fs.pathExists(reportPath)).toBe(false);
  });
});
