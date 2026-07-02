/**
 * @jest-environment node
 */

import os from 'os';
import path from 'path';
import fs from 'fs-extra';
import { scanContent } from './content-scan';

describe('scanContent', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'zbk-scan-'));
  });

  afterEach(async () => {
    await fs.remove(dir);
  });

  const write = (rel: string, contents: string) =>
    fs.outputFile(path.join(dir, rel), contents);

  it('extracts class candidates from content files', async () => {
    await write('src/App.svelte', `<div class="button text-center p-1"></div>`);
    const result = await scanContent({
      contentGlobs: ['src/**/*.svelte'],
      cwd: dir,
      inputCssPath: path.join(dir, 'dist/zbk.min.css'),
    });

    expect(result.candidates.has('button')).toBe(true);
    expect(result.candidates.has('text-center')).toBe(true);
    expect(result.candidates.has('p-1')).toBe(true);
    expect(result.files).toBe(1);
  });

  // Hazard 2: Svelte `class:x` directive glues the class to a prefix. Without
  // colon-suffix expansion the bare class is lost.
  it('registers every colon-split suffix (Svelte class: directive)', async () => {
    await write('src/Drag.svelte', `<div class:padding-inline-start-025={canDrag}></div>`);
    const result = await scanContent({
      contentGlobs: ['src/**/*.svelte'],
      cwd: dir,
      inputCssPath: path.join(dir, 'dist/zbk.min.css'),
    });

    expect(result.candidates.has('padding-inline-start-025')).toBe(true);
  });

  it('keeps the full token for responsive variants (tablet:text-sm)', async () => {
    await write('src/Page.html', `<span class="tablet:text-sm"></span>`);
    const result = await scanContent({
      contentGlobs: ['src/**/*.html'],
      cwd: dir,
      inputCssPath: path.join(dir, 'dist/zbk.min.css'),
    });

    // Full token (for `.tablet\:text-sm`) and the suffix (for `class:` usage) both present.
    expect(result.candidates.has('tablet:text-sm')).toBe(true);
    expect(result.candidates.has('text-sm')).toBe(true);
  });

  it('collects --zbk-* token roots from content and project CSS', async () => {
    await write('src/Theme.ts', `el.style.setProperty('--zbk-brand', '#f00')`);
    await write('src/app.css', `.hero{background:var(--zbk-body-background)}`);
    const result = await scanContent({
      contentGlobs: ['src/**/*.{ts,svelte}'],
      cwd: dir,
      inputCssPath: path.join(dir, 'dist/zbk.min.css'),
    });

    expect(result.tokenRoots.has('--zbk-brand')).toBe(true);
    expect(result.tokenRoots.has('--zbk-body-background')).toBe(true);
  });

  it('excludes the input CSS from the token-root sweep', async () => {
    await write('src/index.ts', `console.log('hi')`);
    // The built CSS lives under the content base; it must not seed token roots
    // (that would keep every token and defeat the pass).
    await write('src/generated/zbk.min.css', `:root{--zbk-should-not-seed:#000}`);
    const result = await scanContent({
      contentGlobs: ['src/**/*.ts'],
      cwd: dir,
      inputCssPath: path.join(dir, 'src/generated/zbk.min.css'),
    });

    expect(result.tokenRoots.has('--zbk-should-not-seed')).toBe(false);
  });
});
