/**
 * @jest-environment node
 */

import { z } from 'zod';
import type { TokenInterface } from '@definitions/tokens';
import {
  buildFilePayload,
  inferTokenKeyFromFilename,
  isVariantOverrideFile,
  mergeTokens,
  validateTokenExport,
} from './compile-token-helpers';

describe('compile-tokens helpers', () => {
  const tokenSchema = z.object({
    canvas: z.object({
      value: z.string(),
      type: z.literal('color'),
    }),
    radius: z.object({
      value: z.string(),
      type: z.literal('dimension'),
    }),
  });

  const defaultTokens = {
    canvas: { value: '#fff', type: 'color', description: 'canvas' },
    radius: { value: '4px', type: 'dimension', description: 'radius' },
  } as TokenInterface;

  it('infers token keys from token filenames', () => {
    expect(inferTokenKeyFromFilename('/tmp/zbk-button.tokens.json')).toBe('zbk-button');
    expect(inferTokenKeyFromFilename('/tmp/button.tokens.json')).toBe('zbk-button');
    expect(inferTokenKeyFromFilename('/tmp/button.json')).toBe('zbk-button');
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
        canvas: { value: '#000' },
        radius: ['bad'],
        extra: { value: 'ignored' },
      },
      tokenSchema,
      'zbk-button'
    );

    expect(merged.canvas.value).toBe('#000');
    expect(merged.radius.value).toBe('4px');
    expect('extra' in merged).toBe(false);
    expect(warnSpy).toHaveBeenCalled();
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
          canvas: { value: 123, type: 'color' },
          radius: { value: '4px', type: 'dimension' },
        },
        tokenSchema
      )
    ).toEqual(expect.arrayContaining([expect.stringContaining('canvas.value →')]));
  });

});
