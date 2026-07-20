/**
 * @jest-environment node
 */
import fs from 'fs-extra';
import path from 'node:path';
import { glob } from 'glob';
import {
  toDtcgDocument,
  toDtcgDocuments,
  fromDtcgDocument,
  toStrictDtcgDocument,
  validateDtcgDocument,
} from './dtcg-document';
import { mergeTokens } from './compile-token-helpers';
import { isDtcgSpecType } from '@definitions/dtcg';
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

  describe('toDtcgDocuments', () => {
    it('serializes every module of a build to its DTCG document', () => {
      const tokens = {
        'zbk-a': { x: { $value: 1, $type: 'number', $description: 'x' } },
        'zbk-b': { y: { $value: 'auto', $type: 'cssDimension', $description: 'y' } },
      } as unknown as Record<string, TokenInterface>;

      const docs = toDtcgDocuments({
        tokens,
        layers: { 'zbk-a': 'base', 'zbk-b': 'components' },
        externalModules: new Set(['zbk-b']),
      });

      expect(Object.keys(docs).sort()).toEqual(['zbk-a', 'zbk-b']);
      expect(docs['zbk-a'].$type).toBe('number'); // hoisted for the homogeneous module
      expect(docs['zbk-a'].$extensions).toEqual({ 'dev.zebkit': { layer: 'base' } });
      // The emission-external module carries its cssEmission on the group block.
      expect(docs['zbk-b'].$extensions).toEqual({
        'dev.zebkit': { layer: 'components', cssEmission: 'external' },
      });
    });
  });

  describe('toStrictDtcgDocument (D9)', () => {
    it('keeps spec-typed entries, drops proprietary ones, and lists the drops', () => {
      const doc = {
        $extensions: { 'dev.zebkit': { layer: 'base' } },
        brand: {
          $value: { colorSpace: 'hsl', components: [0, 0, 0] },
          $type: 'color',
          $description: 'c',
        },
        gap: { $value: { value: 1, unit: 'rem' }, $type: 'dimension', $description: 'g' },
        auto: { $value: 'auto', $type: 'cssDimension', $description: 'a' },
        cell: { $value: 'table-cell', $type: 'display', $description: 'd' },
      };

      const { document, dropped } = toStrictDtcgDocument(doc);

      const kept = fromDtcgDocument(document).entries;
      expect(Object.keys(kept).sort()).toEqual(['brand', 'gap']);
      for (const entry of Object.values(kept)) {
        expect(isDtcgSpecType(entry.$type)).toBe(true);
      }
      expect([...dropped].sort((a, b) => a.name.localeCompare(b.name))).toEqual([
        { name: 'auto', $type: 'cssDimension' },
        { name: 'cell', $type: 'display' },
      ]);
    });

    it('drops an entire module whose type is proprietary', () => {
      const doc = {
        $type: 'cssDimension',
        $extensions: { 'dev.zebkit': { layer: 'base' } },
        auto: { $value: 'auto', $description: 'a' },
        full: { $value: '100%', $description: 'f' },
      };
      const { document, dropped } = toStrictDtcgDocument(doc);
      expect(fromDtcgDocument(document).entries).toEqual({});
      expect(dropped.map((d) => d.name).sort()).toEqual(['auto', 'full']);
    });
    // Corpus-level assurance (strict is spec-only across every real module, and
    // actually sheds proprietary tokens) is hermetic and lives in the
    // `check:dtcg-validate` gate, which builds the documents fresh from source.
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
