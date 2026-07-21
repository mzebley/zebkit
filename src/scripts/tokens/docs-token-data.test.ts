/** @jest-environment node */

import {
  projectDocsTokenData,
  projectPrimitivePalette,
  projectThemeTokenDiff,
} from './docs-token-data';

describe('docs token data projection', () => {
  it('flattens DTCG groups and adds canonical display values', () => {
    const projected = projectDocsTokenData({
      'zbk-demo': {
        nested: {
          $type: 'duration',
          slow: {
            $value: { value: 250, unit: 'ms' },
            $description: 'Slow duration',
          },
        },
        enabled: {
          $value: true,
          $type: 'boolean',
          $description: 'Enabled',
        },
      },
    });

    expect(projected['zbk-demo']['nested-slow'].$displayValue).toBe('250ms');
    expect(projected['zbk-demo'].enabled.$displayValue).toBe('true');
    expect(JSON.stringify(projected)).not.toContain('[object Object]');
  });

  it('resolves structured shadow references through the full token collection', () => {
    const projected = projectDocsTokenData({
      'zbk-color': {
        ink: {
          $type: 'color',
          $value: { colorSpace: 'srgb', components: [0, 0, 0] },
          $description: 'Ink.',
        },
      },
      'zbk-elevation': {
        focus: {
          $type: 'shadow',
          $description: 'Focus.',
          $value: [{
            color: '{color.ink}',
            offsetX: { value: 0, unit: 'px' },
            offsetY: { value: 1, unit: 'px' },
            blur: { value: 2, unit: 'px' },
            spread: { value: 0, unit: 'px' },
          }],
        },
      },
    });

    expect(projected['zbk-elevation'].focus.$displayValue).toBe(
      '0 1px 2px 0 var(--zbk-color-ink)'
    );
  });

  it('derives primitive palette docs from structured color tokens', () => {
    const registry = projectDocsTokenData({
      'zbk-color': {
        $type: 'color',
        'ember-500': {
          $value: { colorSpace: 'hsl', components: [18, 80, 50] },
          $description: 'Ember 500',
        },
        'global-transparent': {
          $value: {
            colorSpace: 'srgb',
            components: [0, 0, 0],
            alpha: 0,
            hex: '#000000',
          },
          $description: 'Transparent',
        },
      },
    });

    expect(projectPrimitivePalette(registry)).toEqual({
      steps: [500],
      families: [
        {
          name: 'ember',
          hue: 18,
          saturation: 80,
          swatches: [
            {
              step: 500,
              lightness: 50,
              cssVar: '--zbk-color-ember-500',
              hsl: 'hsl(18, 80%, 50%)',
            },
          ],
        },
      ],
      globals: [
        {
          name: 'global-transparent',
          cssVar: '--zbk-color-global-transparent',
          value: 'transparent',
        },
      ],
    });
  });

  it('keeps structured and nested values in hero theme diffs', () => {
    expect(
      projectThemeTokenDiff('transition', {
        motion: {
          $type: 'duration',
          slow: {
            $value: { value: 250, unit: 'ms' },
            $description: 'Slow duration',
          },
        },
        color: {
          $value: '{color.ember.600}',
          $type: 'color',
          $description: 'Nested alias',
        },
      })
    ).toEqual({
      'transition-motion-slow': '250ms',
      'transition-color': 'ember.600',
    });
  });
});
