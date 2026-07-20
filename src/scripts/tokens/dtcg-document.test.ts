/**
 * @jest-environment node
 */
import fs from 'fs-extra';
import path from 'node:path';
import { glob } from 'glob';
import { toDtcgDocument, fromDtcgDocument, validateDtcgDocument } from './dtcg-document';
import { mergeTokens } from './compile-token-helpers';
import type { TokenInterface } from '@definitions/tokens';

describe('DTCG document transforms (Phase 3)', () => {
  it('round-trips a homogeneous module through hoist/expand', () => {
    const entries = {
      '0': { $value: 0, $type: 'number', $description: 'a' },
      '50': { $value: 0.5, $type: 'number', $description: 'b' },
    } as unknown as TokenInterface;

    const doc = toDtcgDocument(entries, { layer: 'base' });
    expect(doc.$type).toBe('number'); // hoisted to the group
    expect('$type' in (doc['0'] as object)).toBe(false); // dropped from the entry
    expect(doc.$extensions).toEqual({ 'dev.zebkit': { layer: 'base' } });

    const back = fromDtcgDocument(doc);
    expect(back.entries).toEqual(entries);
    expect(back.meta.layer).toBe('base');
  });

  it('keeps per-entry $type for a heterogeneous module', () => {
    const entries = {
      a: { $value: 1, $type: 'number', $description: 'x' },
      b: { $value: 'auto', $type: 'cssDimension', $description: 'y' },
    } as unknown as TokenInterface;

    const doc = toDtcgDocument(entries, { layer: 'base' });
    expect(doc.$type).toBeUndefined();
    expect((doc.a as { $type: string }).$type).toBe('number');
    expect(fromDtcgDocument(doc).entries).toEqual(entries);
  });

  it('flattens nested groups by joining segments with "-" and inherits the group $type (D6)', () => {
    const doc = {
      $type: 'dimension',
      padding: {
        inline: { $value: { value: 1, unit: 'rem' } },
        block: { $value: { value: 0.5, unit: 'rem' }, $type: 'dimension' },
      },
    };
    const { entries } = fromDtcgDocument(doc);
    expect(Object.keys(entries).sort()).toEqual(['padding-block', 'padding-inline']);
    expect(entries['padding-inline'].$type).toBe('dimension'); // inherited from the group
  });

  it('rejects $ref and $extends with an actionable error', () => {
    expect(() => fromDtcgDocument({ a: { $ref: '#/x' } })).toThrow(/\$ref/);
    expect(() =>
      fromDtcgDocument({ g: { $extends: '{x.y}', a: { $value: 1, $type: 'number' } } })
    ).toThrow(/\$extends/);
  });

  it('round-trips structured color and shadow values', () => {
    const entries = {
      brand: {
        $value: { colorSpace: 'hsl', components: [210, 50, 40] },
        $type: 'color',
        $description: 'c',
      },
      lift: {
        $value: [
          {
            color: { colorSpace: 'srgb', components: [0, 0, 0], alpha: 0.1 },
            offsetX: { value: 0, unit: 'px' },
            offsetY: { value: 1, unit: 'px' },
            blur: { value: 2, unit: 'px' },
            spread: { value: 0, unit: 'px' },
          },
        ],
        $type: 'shadow',
        $description: 's',
      },
    } as unknown as TokenInterface;

    expect(fromDtcgDocument(toDtcgDocument(entries, { layer: 'base' })).entries).toEqual(entries);
  });

  describe('validateDtcgDocument', () => {
    it('accepts a valid hoisted document', () => {
      expect(
        validateDtcgDocument({
          $type: 'number',
          $extensions: { 'dev.zebkit': { layer: 'base' } },
          '0': { $value: 0, $description: 'a' },
        })
      ).toEqual([]);
    });

    it('flags an unknown $type', () => {
      const errors = validateDtcgDocument({ a: { $value: 1, $type: 'bogus', $description: 'x' } });
      expect(errors[0]).toMatch(/unknown \$type/);
    });

    it('flags a rejected reference form', () => {
      expect(validateDtcgDocument({ a: { $ref: '#/x' } })[0]).toMatch(/\$ref/);
    });

    it('every exported default snapshot is a valid DTCG document', async () => {
      const files = await glob('dist/cli/defaults/zbk-*.json', { absolute: true });
      expect(files.length).toBeGreaterThan(0);
      for (const file of files) {
        const doc = await fs.readJson(file);
        expect(validateDtcgDocument(doc, path.basename(file))).toEqual([]);
      }
    });
  });

  it('re-ingests an exported module as an override to an identical merge (round-trip)', () => {
    const defaults = {
      brand: {
        $value: { colorSpace: 'hsl', components: [0, 0, 0] },
        $type: 'color',
        $description: 'd',
      },
    } as unknown as TokenInterface;

    // Export → re-ingest the structured document as an override; merging it over
    // the same defaults must reproduce them exactly (structured-value ingestion).
    const { entries: reingested } = fromDtcgDocument(toDtcgDocument(defaults, { layer: 'base' }));
    const merged = mergeTokens(defaults, reingested as Record<string, unknown>, undefined, 'zbk-x');
    expect(merged).toEqual(defaults);
  });
});
