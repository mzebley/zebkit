/**
 * @jest-environment node
 */

import type { TokenInterface } from '@definitions/tokens';
import {
  buildVariantMetaKey,
  extractVariantOverrideEntries,
  mergeVariantOverrideEntry,
  normalizeVariantOverrideEntry,
} from './compile-variant-helpers';

describe('compile-variants helpers', () => {
  it('normalizes variant override entry shapes', () => {
    expect(
      normalizeVariantOverrideEntry({
        component: 'button',
        name: 'outline',
        overrides: { canvas: '{color.blue-500}', radius: 4 },
      })
    ).toEqual({
      component: 'button',
      name: 'outline',
      className: 'zbk-button--outline',
      overrides: { canvas: '{color.blue-500}' },
    });

    expect(normalizeVariantOverrideEntry({ overrides: {} }, 'button', 'ghost')).toEqual({
      component: 'button',
      name: 'ghost',
      className: 'zbk-button--ghost',
      overrides: {},
    });
  });

  it('extracts entries from nested variant override data', () => {
    const entries = extractVariantOverrideEntries({
      button: {
        outline: {
          overrides: { canvas: '{color.blue-500}' },
        },
      },
      checkbox: [
        {
          name: 'dense',
          overrides: { gap: '0.25rem' },
        },
      ],
    });

    expect(entries).toEqual([
      {
        component: 'button',
        name: 'outline',
        className: 'zbk-button--outline',
        overrides: { canvas: '{color.blue-500}' },
      },
      {
        component: 'checkbox',
        name: 'dense',
        className: 'zbk-checkbox--dense',
        overrides: { gap: '0.25rem' },
      },
    ]);
  });

  it('merges sanitized overrides into the registry and metadata', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const registry = {
      button: {
        outline: {
          component: 'button',
          name: 'outline',
          className: 'zbk-button--outline',
          overrides: { radius: '4px' },
        },
      },
    };
    const tokens = {
      'zbk-button': {
        canvas: { value: '#fff', type: 'color', description: 'canvas' },
        radius: { value: '4px', type: 'dimension', description: 'radius' },
      },
    } as Record<string, TokenInterface>;
    const metadata = new Map([
      [
        buildVariantMetaKey('button', 'outline'),
        {
          component: 'button',
          name: 'outline',
          className: 'zbk-button--outline',
          inlineStyles: [],
          stylesheetPaths: [],
        },
      ],
    ]);

    mergeVariantOverrideEntry(
      {
        component: 'button',
        name: 'outline',
        className: 'zbk-button--outline-alt',
        overrides: {
          canvas: '{color.blue-500}',
          missing: 'bad',
        },
      },
      registry,
      tokens,
      metadata,
      'button.variant.outline.json'
    );

    expect(registry.button.outline).toEqual({
      component: 'button',
      name: 'outline',
      className: 'zbk-button--outline-alt',
      overrides: {
        radius: '4px',
        canvas: '{color.blue-500}',
      },
    });
    expect(metadata.get(buildVariantMetaKey('button', 'outline'))).toEqual({
      component: 'button',
      name: 'outline',
      className: 'zbk-button--outline-alt',
      inlineStyles: [],
      stylesheetPaths: [],
    });
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });
});
