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

  it('merges valid overrides and records every explicitly authored entry', () => {
    const touched = new Set<string>();
    const merged = mergeTokens(
      defaultTokens,
      {
        canvas: { $value: '#000000' },
        radius: { $value: '4px' },
      },
      tokenSchema,
      'zbk-button',
      touched
    );

    expect(merged.canvas.$value).toBe('#000000');
    expect(merged.radius.$value).toBe('4px');
    expect([...touched]).toEqual(['canvas', 'radius']);

    const changedOnly = new Set<string>();
    mergeTokens(
      defaultTokens,
      { canvas: { $value: '#000000' }, radius: { $value: '4px' } },
      tokenSchema,
      'zbk-button',
      changedOnly,
      true
    );
    expect([...changedOnly]).toEqual(['canvas']);
  });

  it('fails invalid and unknown overrides instead of falling back to defaults', () => {
    expect(() =>
      mergeTokens(
        defaultTokens,
        { radius: ['bad'], extra: { $value: 'ignored' } },
        tokenSchema,
        'zbk-button'
      )
    ).toThrow(/zbk-button\.radius[\s\S]*zbk-button\.extra/);
  });

  it('rejects unsupported raw values and incompatible explicit types', () => {
    expect(() =>
      mergeTokens(
        defaultTokens,
        { canvas: { $value: 'not-a-color' } },
        tokenSchema,
        'zbk-button'
      )
    ).toThrow(/unsupported raw CSS value/);
    expect(() =>
      mergeTokens(
        defaultTokens,
        { canvas: { $value: 'hsl(360, 90%, 50%)' } },
        tokenSchema,
        'zbk-button'
      )
    ).toThrow(/unsupported raw CSS value|outside the hsl range/);
    expect(() =>
      mergeTokens(
        defaultTokens,
        { canvas: { $value: '#000000', $type: 'duration' } },
        tokenSchema,
        'zbk-button'
      )
    ).toThrow(/explicit \$type 'duration' is incompatible with base type 'color'/);

    expect(
      mergeTokens(
        defaultTokens,
        { canvas: { $value: 'hsl(10, 90%, 50%)' } },
        tokenSchema,
        'zbk-button'
      ).canvas.$value
    ).toBe('hsl(10, 90%, 50%)');

    expect(
      mergeTokens(
        defaultTokens,
        { radius: { $value: '0.67em' } },
        tokenSchema,
        'zbk-button'
      ).radius.$value
    ).toBe('0.67em');
  });

  it('clears stale value provenance while preserving and merging author metadata', () => {
    const defaults = {
      border: {
        $value: '',
        $type: 'color',
        $description: 'Base description',
        $extensions: {
          'dev.zebkit': {
            emptyColorPlaceholder: true,
            rawCssValue: 'transparent',
            originalType: 'color',
            a11y: true,
          },
          'example.vendor': { retained: true },
        },
      },
    } as unknown as TokenInterface;

    const merged = mergeTokens(
      defaults,
      {
        border: {
          $value: '{brand.border}',
          $description: 'Theme border',
          $deprecated: 'Use border-subtle.',
          $extensions: {
            'dev.zebkit': { a11y: '--custom-modifier' },
            'theme.vendor': { retained: true },
          },
        },
      },
      undefined,
      'zbk-app'
    ) as unknown as Record<string, any>;

    expect(merged.border).toMatchObject({
      $value: '{brand.border}',
      $type: 'color',
      $description: 'Theme border',
      $deprecated: 'Use border-subtle.',
      $extensions: {
        'dev.zebkit': { a11y: '--custom-modifier' },
        'example.vendor': { retained: true },
        'theme.vendor': { retained: true },
      },
    });
    expect(merged.border.$extensions['dev.zebkit']).not.toHaveProperty('emptyColorPlaceholder');
    expect(merged.border.$extensions['dev.zebkit']).not.toHaveProperty('rawCssValue');
    expect(merged.border.$extensions['dev.zebkit']).not.toHaveProperty('originalType');
  });

  it('does not manufacture an empty-color marker for non-color strings', () => {
    const defaults = {
      content: {
        $value: 'initial',
        $type: 'content',
        $description: 'Generated content.',
      },
    } as TokenInterface;
    const merged = mergeTokens(
      defaults,
      { content: { $value: '' } },
      undefined,
      'zbk-example'
    ) as unknown as Record<string, any>;

    expect(merged.content.$value).toBe('');
    expect(merged.content.$extensions).toBeUndefined();
  });

  it('field-merges known metadata and clears generated scale provenance', () => {
    const defaults = {
      primary: {
        $value: 'System UI',
        $type: 'fontFamily',
        $description: 'Primary family.',
        $extensions: {
          'dev.zebkit': {
            font: { source: 'google', fallback: 'sans', weights: '300..700' },
          },
        },
      },
      size: {
        $value: '1rem',
        $type: 'cssDimension',
        $description: 'Generated size.',
        $extensions: {
          'dev.zebkit': { scale: { index: 1, valueSource: 'generated' } },
        },
      },
    } as unknown as TokenInterface;

    const merged = mergeTokens(
      defaults,
      {
        primary: {
          $value: 'Inter',
          $extensions: { 'dev.zebkit': { font: { weights: [400, 700] } } },
        },
        size: { $value: '1.125rem' },
      },
      undefined,
      'zbk-example'
    ) as unknown as Record<string, any>;

    expect(merged.primary.$extensions['dev.zebkit'].font).toEqual({
      source: 'google',
      fallback: 'sans',
      weights: [400, 700],
    });
    expect(merged.size.$extensions['dev.zebkit'].scale).toEqual({ index: 1 });
  });

  it('preserves a base custom a11y variable when an override uses generic opt-in', () => {
    const defaults = {
      size: {
        $value: '1rem',
        $type: 'dimension',
        $description: 'Size.',
        $extensions: { 'dev.zebkit': { a11y: '--zbk-a11y-spacing-modifier' } },
      },
    } as unknown as TokenInterface;

    const merged = mergeTokens(
      defaults,
      {
        size: {
          $value: '2rem',
          $extensions: { 'dev.zebkit': { a11y: true } },
        },
      },
      undefined,
      'zbk-spacing'
    ) as unknown as Record<string, any>;

    expect(merged.size.$extensions['dev.zebkit'].a11y).toBe(
      '--zbk-a11y-spacing-modifier'
    );
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

    groupExtensions['zbk-palette'] = {
      'com.example.base': { retained: true },
      'dev.zebkit': { layer: 'tokens', cssEmission: 'external' },
    };
    mergeGroupExtensions(
      'zbk-palette',
      {
        'com.example.override': { authored: true },
        'dev.zebkit': { layer: 'theme' },
      },
      groupExtensions
    );
    expect(groupExtensions['zbk-palette']).toEqual({
      'com.example.base': { retained: true },
      'com.example.override': { authored: true },
      'dev.zebkit': { layer: 'theme', cssEmission: 'external' },
    });

    // Invalid extension blocks are fatal; configured scale input must never be
    // discarded in favor of a default build.
    expect(() =>
      mergeGroupExtensions(
        'zbk-spacing',
        { 'dev.zebkit': { scale: 'not-an-object' } },
        groupExtensions
      )
    ).toThrow(/Invalid group \$extensions for 'zbk-spacing'/);
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
