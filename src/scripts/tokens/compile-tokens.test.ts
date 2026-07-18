/**
 * @jest-environment node
 */

import { z } from 'zod';
import type { TokenGroupExtensions, TokenInterface } from '@definitions/tokens';
import {
  buildFilePayload,
  inferTokenKeyFromFilename,
  isCanonicalTokenOverrideFile,
  isVariantOverrideFile,
  mergeGroupExtensions,
  mergeTokens,
  validateTokenExport,
} from './compile-token-helpers';

describe('compile-tokens helpers', () => {
  const tokenSchema = z.object({
    canvas: z.object({
      $value: z.string(),
      $type: z.literal('color'),
    }),
    radius: z.object({
      $value: z.string(),
      $type: z.literal('dimension'),
    }),
  });

  const defaultTokens = {
    canvas: { $value: '#fff', $type: 'color', $description: 'canvas' },
    radius: { $value: '4px', $type: 'dimension', $description: 'radius' },
  } as TokenInterface;

  it('infers token keys from token filenames', () => {
    expect(inferTokenKeyFromFilename('/tmp/zbk-button.tokens.json')).toBe('zbk-button');
    expect(inferTokenKeyFromFilename('/tmp/button.tokens.json')).toBeUndefined();
    expect(inferTokenKeyFromFilename('/tmp/button.json')).toBeUndefined();
    expect(isCanonicalTokenOverrideFile('/tmp/zbk-button.tokens.json')).toBe(true);
    expect(isCanonicalTokenOverrideFile('/tmp/zbk-button.json')).toBe(false);
  });

  it('detects variant override files by naming convention', () => {
    expect(isVariantOverrideFile('/tmp/zbk-button.variant.large.json')).toBe(true);
    expect(isVariantOverrideFile('/tmp/button-variants.json')).toBe(true);
    expect(isVariantOverrideFile('/tmp/zbk-button.tokens.json')).toBe(false);
  });

  it('merges valid overrides and ignores invalid ones', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const merged = mergeTokens(
      defaultTokens,
      {
        canvas: { $value: '#000' },
        radius: ['bad'],
        extra: { $value: 'ignored' },
      },
      tokenSchema,
      'zbk-button'
    );

    expect(merged.canvas.$value).toBe('#000');
    expect(merged.radius.$value).toBe('4px');
    expect('extra' in merged).toBe(false);
    expect(warnSpy).toHaveBeenCalled();
  });

  it('merges group scale extensions control-by-control and records touched controls', () => {
    const groupExtensions: Record<string, TokenGroupExtensions> = {
      'zbk-spacing': { 'dev.zebkit': { scale: { 'max-scale': 1.25 } } },
    };
    const touched: Record<string, Set<string>> = {};

    mergeGroupExtensions(
      'zbk-spacing',
      { 'dev.zebkit': { scale: { 'max-scale': 1.175 } } },
      groupExtensions,
      touched
    );

    expect(groupExtensions['zbk-spacing']['dev.zebkit']?.scale).toEqual({
      'max-scale': 1.175,
    });
    // The overridden control name lands in `touched`; it never exists as a token
    // entry, which is how the emission closure recognizes a consumed control.
    expect([...touched['zbk-spacing']]).toEqual(['max-scale']);

    // Controls merge key-by-key: overriding one control keeps the others.
    mergeGroupExtensions(
      'zbk-font-size',
      { 'dev.zebkit': { scale: { 'min-viewport': '360px', 'min-base': '1rem' } } },
      groupExtensions
    );
    mergeGroupExtensions(
      'zbk-font-size',
      { 'dev.zebkit': { scale: { 'min-base': '1.125rem' } } },
      groupExtensions
    );
    expect(groupExtensions['zbk-font-size']['dev.zebkit']?.scale).toEqual({
      'min-viewport': '360px',
      'min-base': '1.125rem',
    });

    // Invalid extension blocks are ignored, leaving the collected state alone.
    mergeGroupExtensions(
      'zbk-spacing',
      { 'dev.zebkit': { scale: 'not-an-object' } },
      groupExtensions
    );
    expect(groupExtensions['zbk-spacing']['dev.zebkit']?.scale).toEqual({
      'max-scale': 1.175,
    });
  });

  it('builds token export payloads for supported formats', () => {
    expect(buildFilePayload('json', '/tmp/zbk-default-tokens', { ok: true })).toEqual({
      filePath: '/tmp/zbk-default-tokens.json',
      fileContent: JSON.stringify({ ok: true }, null, 2),
    });
    expect(buildFilePayload('typescript', '/tmp/zbk-default-tokens', { ok: true })).toEqual({
      filePath: '/tmp/zbk-default-tokens.ts',
      fileContent: `export default ${JSON.stringify({ ok: true }, null, 2)};\n`,
    });
    expect(() => buildFilePayload('yaml', '/tmp/zbk-default-tokens', {})).toThrow(
      'Unsupported format: yaml'
    );
  });

  it('reports the exact nested path for schema failures', () => {
    expect(
      validateTokenExport(
        {
          canvas: { $value: 123, $type: 'color' },
          radius: { $value: '4px', $type: 'dimension' },
        },
        tokenSchema
      )
    ).toEqual(expect.arrayContaining([expect.stringContaining('canvas.$value →')]));
  });

});
