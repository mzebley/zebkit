/**
 * @jest-environment node
 */

import { pruneCss } from './engine';
import type { PruneOptions } from './types';

const run = (css: string, options: Partial<PruneOptions> & { candidates: Set<string> }) =>
  pruneCss(css, options);

describe('pruneCss — selector retention', () => {
  it('keeps rules for referenced classes and drops the rest', () => {
    const css = `.button{color:red}.unused{color:blue}`;
    const result = run(css, { candidates: new Set(['button']) });

    expect(result.css).toContain('.button');
    expect(result.css).not.toContain('.unused');
    expect(result.selectors).toEqual({ kept: 1, dropped: 1 });
    expect(result.classes.kept).toEqual(['button']);
    expect(result.classes.dropped).toEqual(['unused']);
  });

  it('splits a comma selector, keeping only the referenced part', () => {
    const css = `.a,.b{color:red}`;
    const result = run(css, { candidates: new Set(['a']) });

    expect(result.css).toContain('.a');
    expect(result.css).not.toContain('.b');
    expect(result.selectors).toEqual({ kept: 1, dropped: 1 });
  });

  // Hazard 1: state variants are `[class~="…"]` attribute selectors, not classes.
  // Walking only class nodes leaves these behind — the bulk of the dead CSS.
  it('honors the [class~="…"] state-variant convention', () => {
    const css = `[class~="hover:border-action"]:hover{border-color:blue}[class~="disabled:canvas-accent"]{opacity:.5}`;
    const result = run(css, { candidates: new Set(['hover:border-action']) });

    expect(result.css).toContain('hover:border-action');
    expect(result.css).not.toContain('disabled:canvas-accent');
  });

  it('treats [class="x"] (exact) as membership too', () => {
    const css = `[class="kept"]{color:red}[class="gone"]{color:blue}`;
    const result = run(css, { candidates: new Set(['kept']) });

    expect(result.css).toContain('kept');
    expect(result.css).not.toContain('gone');
  });

  // Hazard 3: responsive variants are escaped-colon classes; unescape before lookup.
  it('unescapes `\\:` in responsive-variant classes before candidate lookup', () => {
    const css = `.tablet\\:text-sm{font-size:1rem}.desktop\\:text-lg{font-size:2rem}`;
    const result = run(css, { candidates: new Set(['tablet:text-sm']) });

    expect(result.css).toContain('tablet\\:text-sm');
    expect(result.css).not.toContain('desktop\\:text-lg');
  });

  it('keeps element/pseudo-only selectors (nothing class-gated)', () => {
    const css = `body{margin:0}a:hover{color:red}`;
    const result = run(css, { candidates: new Set<string>() });

    expect(result.css).toContain('body');
    expect(result.css).toContain('a:hover');
  });

  it('keeps a bare [class] existence selector', () => {
    const css = `[class]{outline:0}`;
    const result = run(css, { candidates: new Set<string>() });
    expect(result.css).toContain('[class]');
  });

  it('keeps and warns on unsupported attribute operators (*=, ^=, $=)', () => {
    const css = `[class*="transition-"]{transition:all}`;
    const result = run(css, { candidates: new Set<string>() });

    expect(result.css).toContain('transition-');
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toMatch(/unsupported attribute operator "\*="/);
  });
});

describe('pruneCss — safelist / blocklist', () => {
  it('force-keeps exact and regex safelist entries', () => {
    const css = `.swiper-slide{color:red}.zbk-thing{color:blue}.dropme{color:green}`;
    const result = run(css, {
      candidates: new Set<string>(),
      safelist: ['/^swiper/', 'zbk-thing'],
    });

    expect(result.css).toContain('swiper-slide');
    expect(result.css).toContain('zbk-thing');
    expect(result.css).not.toContain('dropme');
    expect(result.safelistHits).toEqual(['/^swiper/', 'zbk-thing']);
  });

  it('blocklist beats safelist beats candidate set', () => {
    const css = `.keep-me{color:red}`;
    const result = run(css, {
      candidates: new Set(['keep-me']),
      safelist: ['keep-me'],
      blocklist: ['keep-me'],
    });

    expect(result.css).not.toContain('keep-me');
    expect(result.classes.dropped).toContain('keep-me');
  });

  it('throws, naming the entry, on an invalid regex', () => {
    expect(() =>
      run(`.a{color:red}`, { candidates: new Set(), safelist: ['/[/'] })
    ).toThrow(/\/\[\//);
  });
});

describe('pruneCss — empty at-rule collapse', () => {
  it('removes media/layer shells emptied by pruning, keeping the layer statement', () => {
    const css = `@layer theme,base,utilities;@layer utilities{@media (min-width:40em){.gone{color:red}}}`;
    const result = run(css, { candidates: new Set<string>() });

    expect(result.css).not.toContain('.gone');
    expect(result.css).not.toContain('@media');
    // The layer-ordering statement (no body) must survive.
    expect(result.css).toContain('@layer theme,base,utilities');
  });
});

describe('pruneCss — keepLayers', () => {
  it('never prunes rules inside a kept layer even when unreferenced', () => {
    const css = `@layer base{.reset-thing{margin:0}}@layer utilities{.gone{color:red}}`;
    const result = run(css, {
      candidates: new Set<string>(),
      keepLayers: ['base'],
    });

    expect(result.css).toContain('reset-thing');
    expect(result.css).not.toContain('.gone');
  });
});

describe('pruneCss — token-graph reachability', () => {
  // Hazard 4: reachability must be transitive. A surviving alias var() references a
  // primitive; dropping the primitive because no *class* uses it directly breaks it.
  it('keeps a transitively referenced token chain', () => {
    const css = [
      ':root{',
      '--zbk-neutral-120:#111;',
      '--zbk-h1-color:var(--zbk-neutral-120);',
      '--zbk-unused:#eee;',
      '}',
      '.title{color:var(--zbk-h1-color)}',
    ].join('');
    const result = run(css, { candidates: new Set(['title']) });

    expect(result.css).toContain('--zbk-h1-color');
    expect(result.css).toContain('--zbk-neutral-120');
    expect(result.css).not.toContain('--zbk-unused');
    expect(result.tokens.dropped).toBe(1);
    expect(result.tokens.droppedNames).toEqual(['--zbk-unused']);
  });

  it('seeds reachability from tokenRoots (inline styles / JS / project CSS)', () => {
    const css = `:root{--zbk-brand:#f00;--zbk-orphan:#0f0}`;
    const result = run(css, {
      candidates: new Set<string>(),
      tokenRoots: ['--zbk-brand'],
    });

    expect(result.css).toContain('--zbk-brand');
    expect(result.css).not.toContain('--zbk-orphan');
  });

  it('force-keeps tokens matched by a safelist regex', () => {
    const css = `:root{--zbk-font-heading:x;--zbk-unused:y}`;
    const result = run(css, {
      candidates: new Set<string>(),
      safelist: ['/^--zbk-font-/'],
    });

    expect(result.css).toContain('--zbk-font-heading');
    expect(result.css).not.toContain('--zbk-unused');
  });

  it('removes a :root rule emptied by token pruning', () => {
    const css = `:root{--zbk-unused:#000}.a{color:red}`;
    const result = run(css, { candidates: new Set(['a']) });

    expect(result.css).not.toContain(':root');
    expect(result.css).toContain('.a');
  });

  it('leaves all tokens when tokens:false', () => {
    const css = `:root{--zbk-unused:#000}.a{color:red}`;
    const result = run(css, { candidates: new Set(['a']), tokens: false });

    expect(result.css).toContain('--zbk-unused');
    expect(result.tokens).toEqual({ kept: 1, dropped: 0, droppedNames: [] });
  });

  it('does not prune custom properties declared outside :root (overlay scopes)', () => {
    const css = `[data-zbk-theme="dark"]{--zbk-unused:#000}.a{color:red}`;
    const result = run(css, { candidates: new Set(['a']) });

    expect(result.css).toContain('--zbk-unused');
  });
});
