/**
 * @jest-environment node
 */

import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';
import type { TokenInterface } from '@definitions/tokens';
import {
  deriveDirectTokenCssDestinations,
  loadTokenCssDestinations,
  propagateTokenCssDestinations,
  tokenCssValueError,
  validateTokenCssValues,
} from './css-token-destinations';

function fixtureTokens(entries: Record<string, unknown>): Record<string, TokenInterface> {
  return { 'zbk-demo': entries as TokenInterface };
}

describe('CSS token destinations', () => {
  it('discovers SCSS, generated-style SCSS, and inline TypeScript declarations', async () => {
    const sourceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'zbk-css-destinations-'));
    await fs.outputFile(
      path.join(sourceRoot, 'styles.scss'),
      '.demo { border-width: var(--#{prefix.$cssVar}-demo-border); }\n'
    );
    await fs.outputFile(
      path.join(sourceRoot, 'generated', 'utilities.scss'),
      '.width-demo { width: var(--zbk-demo-size); }\n'
    );
    await fs.outputFile(
      path.join(sourceRoot, 'component.ts'),
      'const style = `\n  transition-delay: var(--zbk-demo-delay);\n`;\n'
    );
    const tokens = fixtureTokens({
      border: { $value: 'medium', $type: 'cssDimension' },
      size: { $value: '1rem', $type: 'cssDimension' },
      delay: { $value: '0ms', $type: 'duration' },
    });

    await expect(deriveDirectTokenCssDestinations(tokens, sourceRoot)).resolves.toEqual({
      'demo.border': ['border-width'],
      'demo.delay': ['transition-delay'],
      'demo.size': ['width'],
    });
  });

  it('recomputes destination reachability from final local aliases', () => {
    const tokens = fixtureTokens({
      consumer: { $value: '{base}', $type: 'cssDimension' },
      base: { $value: '1rem', $type: 'cssDimension' },
    });

    expect(propagateTokenCssDestinations(tokens, { 'demo.consumer': ['width'] })).toEqual({
      'demo.base': ['width'],
      'demo.consumer': ['width'],
    });
  });

  it('loads the shared default artifact for an installed preset layout', async () => {
    const packageRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'zbk-installed-preset-'));
    const presetFile = path.join(
      packageRoot,
      'dist',
      'cli',
      'presets',
      'sample',
      'zbk-demo.tokens.json'
    );
    const artifact = path.join(packageRoot, 'dist', 'cli', 'defaults', 'css-properties.json');
    await fs.outputJson(presetFile, {});
    await fs.outputJson(artifact, { 'demo.size': ['width'] });

    await expect(loadTokenCssDestinations({}, [presetFile])).resolves.toEqual({
      'demo.size': ['width'],
    });
  });

  it('validates raw values against every concrete property destination', () => {
    expect(
      tokenCssValueError('zbk-demo', 'border', 'cssDimension', 'medium', {
        'demo.border': ['border-width'],
      })
    ).toBeUndefined();
    expect(
      tokenCssValueError('zbk-demo', 'size', 'cssDimension', 'medium', {
        'demo.size': ['width'],
      })
    ).toMatch(/demo\.size[\s\S]*width/);
    expect(
      tokenCssValueError('zbk-demo', 'delay', 'duration', '0', {
        'demo.delay': ['transition-delay'],
      })
    ).toMatch(/demo\.delay[\s\S]*transition-delay/);
    expect(
      tokenCssValueError('zbk-demo', 'delay', 'duration', '0ms', {
        'demo.delay': ['transition-delay'],
      })
    ).toBeUndefined();
    expect(
      tokenCssValueError('zbk-demo', 'color', 'color', 'definitely-not-a-color', {
        'demo.color': ['color'],
      })
    ).toMatch(/demo\.color[\s\S]*color/);
  });

  it('accepts indeterminate CSS functions only when their surrounding grammar is valid', () => {
    const destinations = { 'demo.size': ['width'] };
    expect(
      tokenCssValueError('zbk-demo', 'size', 'cssDimension', 'calc(var(--space) + 1rem)', destinations)
    ).toBeUndefined();
    expect(
      tokenCssValueError('zbk-demo', 'size', 'cssDimension', 'var(--space) garbage', destinations)
    ).toMatch(/fails width/);
    expect(
      tokenCssValueError(
        'zbk-demo',
        'size',
        'cssDimension',
        'attr(data-size type(<length>), 1rem)',
        destinations
      )
    ).toBeUndefined();
    expect(
      tokenCssValueError(
        'zbk-demo',
        'size',
        'cssDimension',
        'attr(data-size type(<length>), 1rem) garbage',
        destinations
      )
    ).toMatch(/fails width/);
    expect(
      tokenCssValueError('zbk-demo', 'size', 'cssDimension', 'var(space)', destinations)
    ).toMatch(/custom-property/);
  });

  it('validates canonical DTCG literals against destination-specific constraints', () => {
    const tokens = fixtureTokens({
      width: { $value: { value: -1, unit: 'px' }, $type: 'dimension' },
      opacity: { $value: 2, $type: 'number' },
      delay: { $value: { value: -100, unit: 'ms' }, $type: 'duration' },
      duration: { $value: { value: -100, unit: 'ms' }, $type: 'duration' },
    });
    const errors = validateTokenCssValues(tokens, {
      'demo.width': ['width'],
      'demo.opacity': ['opacity'],
      'demo.delay': ['transition-delay'],
      'demo.duration': ['transition-duration'],
    });

    expect(errors).toEqual([
      expect.stringMatching(/zbk-demo\.width[\s\S]*fails width/),
      expect.stringMatching(/zbk-demo\.opacity[\s\S]*fails opacity/),
      expect.stringMatching(/zbk-demo\.duration[\s\S]*fails transition-duration/),
    ]);
  });

  it('propagates shadow member grammar instead of the whole box-shadow destination', () => {
    const tokens = fixtureTokens({
      card: {
        $value: {
          color: '{ink}',
          offsetX: { value: 0, unit: 'px' },
          offsetY: { value: 1, unit: 'px' },
          blur: '{blur}',
          spread: '{spread}',
        },
        $type: 'shadow',
      },
      ink: { $value: '#000', $type: 'color' },
      blur: { $value: { value: 4, unit: 'px' }, $type: 'dimension' },
      spread: { $value: { value: -1, unit: 'px' }, $type: 'dimension' },
    });
    const destinations = propagateTokenCssDestinations(tokens, {
      'demo.card': ['box-shadow'],
    });

    expect(destinations).toMatchObject({
      'demo.ink': ['<color>'],
      'demo.blur': ['<nonnegative-length>'],
      'demo.spread': ['<length>'],
    });
    expect(validateTokenCssValues(tokens, destinations)).toEqual([]);

    (tokens['zbk-demo'].blur as any).$value = { value: -1, unit: 'px' };
    expect(validateTokenCssValues(tokens, destinations)).toEqual([
      expect.stringMatching(/zbk-demo\.blur[\s\S]*nonnegative-length/),
    ]);
  });

  it('skips only unresolved generated-scale placeholders, not pinned steps', () => {
    const tokens = fixtureTokens({
      generated: {
        $type: 'cssDimension',
        $extensions: { 'dev.zebkit': { scale: { index: -1 } } },
      },
      pinned: {
        $value: { value: -1, unit: 'px' },
        $type: 'dimension',
        $extensions: { 'dev.zebkit': { scale: { index: 1, valueSource: 'pinned' } } },
      },
      brokenPinned: {
        $type: 'cssDimension',
        $extensions: { 'dev.zebkit': { scale: { index: 2, valueSource: 'pinned' } } },
      },
    });
    const errors = validateTokenCssValues(tokens, {
      'demo.generated': ['font-size'],
      'demo.pinned': ['font-size'],
      'demo.brokenPinned': ['font-size'],
    });

    expect(errors).toEqual([
      expect.stringMatching(/zbk-demo\.pinned[\s\S]*fails font-size/),
      expect.stringMatching(/zbk-demo\.brokenPinned[\s\S]*fails font-size/),
    ]);
  });
});
