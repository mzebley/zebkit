/**
 * @jest-environment node
 */

import {
  applyOptionValues,
  buildQuestions,
  getParserForPath,
  getOptionByPath,
  KNOWN_PATHS,
} from './config-options';
import { DEFAULT_PRUNE_CONTENT } from '../scripts/config';

describe('config-options registry', () => {
  it('exposes known paths for config set/get', () => {
    expect(KNOWN_PATHS).toContain('tokens.fonts.strategy');
    expect(KNOWN_PATHS).toContain('tokens.tokenPath');
    expect(KNOWN_PATHS).toContain('tokens.extendedTokens.breakpoints');
  });

  it('parses and validates enum values', () => {
    expect(getParserForPath('tokens.fonts.strategy')!('preload')).toBe('preload');
    expect(() => getParserForPath('tokens.fonts.strategy')!('nope')).toThrow(/Expected one of/);
  });

  it('parses booleans for confirm-backed options', () => {
    expect(getParserForPath('tokens.exportTokens')!('true')).toBe(true);
    expect(() => getParserForPath('tokens.exportTokens')!('yes')).toThrow(/true.*false/);
  });

  it('parses the breakpoints union (true | false | subset array)', () => {
    const parse = getParserForPath('tokens.extendedTokens.breakpoints')!;
    expect(parse('true')).toBe(true);
    expect(parse('false')).toBe(false);
    expect(parse('tablet,desktop')).toEqual(['tablet', 'desktop']);
    expect(() => parse('bogus')).toThrow(/Invalid breakpoint/);
  });

  it('returns undefined parser for unknown paths', () => {
    expect(getParserForPath('tokens.does.not.exist')).toBeUndefined();
  });

  it('parses prune options (globs, output mode)', () => {
    expect(getParserForPath('tokens.prune.enabled')!('true')).toBe(true);
    expect(getParserForPath('tokens.prune.content')!('src/**/*.svelte, src/**/*.ts')).toEqual([
      'src/**/*.svelte',
      'src/**/*.ts',
    ]);
    expect(getParserForPath('tokens.prune.output.mode')!('alongside')).toBe('alongside');
    expect(() => getParserForPath('tokens.prune.output.mode')!('wipe')).toThrow(/Expected one of/);
  });
});

describe('buildQuestions', () => {
  it('returns only the requested tiers and seeds defaults from current config', () => {
    const questions = buildQuestions(['quick'], { tokens: { destinationPath: './out' } }, {
      themeChoices: ['default', 'dark'],
      defaultProjectName: 'my-app',
    });
    const names = questions.map((q) => q.name);
    expect(names).toEqual(['destinationPath', 'assetFilePath', 'basePreset', 'themeName']);
    const dest = questions.find((q) => q.name === 'destinationPath');
    expect(dest!.default).toBe('./out');
    const theme = questions.find((q) => q.name === 'themeName');
    expect(theme!.default).toBe('my-app');
  });

  it('inverts static config values into a fluid prompt default', () => {
    const [fluid] = buildQuestions(
      ['standard'],
      { tokens: { typeScale: { static: true } } },
      {}
    ).filter((q) => q.name === 'typeScaleFluid');
    // static:true -> fluid default false
    expect(fluid.default).toBe(false);
  });
});

describe('applyOptionValues', () => {
  it('writes a complete, self-documenting config with defaults for unanswered options', () => {
    const config = applyOptionValues({}, { destinationPath: './build' }, { defaultProjectName: 'app' });
    expect(config.tokens?.destinationPath).toBe('./build');
    // unanswered standard/advanced options get their defaults
    expect(config.tokens?.fonts?.strategy).toBe('import');
    expect(config.tokens?.extendedTokens?.colors).toBe('all');
    expect(config.tokens?.typeScale?.static).toBe(false);
    expect(config.tokens?.exportTokens).toBe(false);
    expect(config.tokens?.outputFormats).toEqual(['JSON']);
    expect(config.tokens?.extendedTokens?.breakpoints).toBe(true);
    expect(config.tokens?.themeName).toBe('app');
  });

  it('maps inverted and union answers back to config shape', () => {
    const config = applyOptionValues(
      {},
      { typeScaleFluid: false, breakpoints: ['tablet', 'desktop'] },
      {}
    );
    expect(config.tokens?.typeScale?.static).toBe(true); // fluid:false -> static:true
    expect(config.tokens?.extendedTokens?.breakpoints).toEqual(['tablet', 'desktop']);
  });

  it('writes a self-documenting prune block with defaults', () => {
    const config = applyOptionValues({}, {}, {});
    expect(config.tokens?.prune?.enabled).toBe(false);
    expect(config.tokens?.prune?.content).toEqual(DEFAULT_PRUNE_CONTENT);
    expect(config.tokens?.prune?.output?.mode).toBe('replace');
    expect(config.tokens?.prune?.output?.path).toBe('');
  });

  it('maps a prune content string answer back to a glob array', () => {
    const config = applyOptionValues(
      {},
      { pruneEnabled: true, pruneContent: 'src/**/*.svelte,app/**/*.tsx' },
      {}
    );
    expect(config.tokens?.prune?.content).toEqual(['src/**/*.svelte', 'app/**/*.tsx']);
  });
});

describe('getOptionByPath', () => {
  it('locates an option by its dot-path', () => {
    expect(getOptionByPath('tokens.splitMode')?.id).toBe('splitMode');
    expect(getOptionByPath('tokens.tokenPath')).toBeUndefined();
  });
});
