/**
 * @jest-environment node
 */
import fs from 'fs-extra';
import {
  toDtcgDocument,
  toDtcgDocuments,
  fromDtcgDocument,
  toStrictDtcgDocuments,
  validateDtcgDocument,
  validateDtcgDocuments,
  assertRawTokenValueNormalizable,
} from './dtcg-document';
import { mergeTokens } from './compile-token-helpers';
import { isDtcgSpecType } from '@definitions/dtcg';
import type { TokenInterface } from '@definitions/tokens';
import {
  DTCG_COLOR_SPACES,
  serializeColorValue,
  serializeShadowValue,
} from '@definitions/tokens';
import { resolveTypeScale } from './build-type-scale';

function makeGroupExtensionsForTest() {
  return {
    'zbk-font-size': {
      'dev.zebkit': {
        scale: {
          'min-viewport': '360px',
          'max-viewport': '1240px',
          'min-base': '1rem',
          'max-base': '1.25rem',
          'min-ratio': 1.2,
          'max-ratio': 1.25,
        },
      },
    },
  } as const;
}

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

  it('round-trips metadata on structurally distinct hyphen-collision-prone groups', () => {
    const document = {
      $description: 'Root description.',
      $deprecated: 'Root deprecation.',
      $extensions: {
        'dev.zebkit': { layer: 'base' },
        'com.example.root': { retained: true },
      },
      'a-b': {
        $type: 'number',
        $description: 'Literal hyphen group.',
        $deprecated: false,
        $extensions: { 'com.example.hyphen': { retained: true } },
        c: { $value: 1, $description: 'C.' },
      },
      a: {
        $description: 'Outer group.',
        $extensions: { 'com.example.outer': { retained: true } },
        b: {
          $type: 'number',
          $description: 'Segmented group.',
          $deprecated: 'Use the other path later.',
          $extensions: { 'com.example.segmented': { retained: true } },
          d: { $value: 2, $description: 'D.' },
        },
      },
    };

    const parsed = fromDtcgDocument(document, { mode: 'runtime' });
    expect(parsed.meta.groupMetadata?.map(({ path }) => path)).toEqual([
      ['a-b'],
      ['a'],
      ['a', 'b'],
    ]);
    expect(toDtcgDocument(parsed.entries, parsed.meta, { mode: 'authoring' })).toEqual(
      document
    );
  });

  it('rejects token paths that become a token/group collision during reconstruction', () => {
    expect(() =>
      toDtcgDocument(
        {
          a: { $type: 'number', $value: 1, $description: 'A.' },
          'a-b': { $type: 'number', $value: 2, $description: 'B.' },
        },
        {
          layer: 'base',
          entryPaths: { a: ['a'], 'a-b': ['a', 'b'] },
        }
      )
    ).toThrow(/structural token paths 'a' and 'a\.b' collide/);
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

    it('requires a value even when a scale index is present', () => {
      const errors = validateDtcgDocument({
        $type: 'cssDimension',
        '3xs': {
          $type: 'cssDimension',
          $description: 'Smallest font size.',
          $extensions: { 'dev.zebkit': { scale: { index: -4 } } },
        },
      });
      expect(errors).toEqual([expect.stringContaining('.3xs: missing $value')]);
    });

    it.each([
      [{ 'min-viewport': 'nope' }, 'scale'],
      [{ 'min-ratio': 0 }, 'scale'],
      [{ 'unknown-control': 1 }, 'scale'],
      [{ 'min-viewport': '1240px', 'max-viewport': '360px' }, 'max-viewport'],
    ])('rejects invalid group scale controls before scale math', (scale, message) => {
      const errors = validateDtcgDocument({
        $extensions: { 'dev.zebkit': { scale } },
        value: { $type: 'number', $value: 1, $description: 'Value.' },
      });
      expect(errors.join('\n')).toContain(message);
    });

    it.each([
      [{ primitive: 1 }, 'expected a token or group object'],
      [{ array: [] }, 'expected a token or group object'],
      [{ '$unknown': true }, 'unknown reserved property'],
      [{ 'bad.name': { $type: 'number', $value: 1, $description: 'Bad.' } }, 'cannot begin'],
      [{ mixed: { $type: 'number', $value: 1, $description: 'Bad.', child: {} } }, 'cannot also contain child'],
    ])('reports malformed structure instead of silently dropping it', (document, message) => {
      expect(validateDtcgDocument(document)[0]).toContain(message);
    });

    it('does not throw collection validation for malformed documents', () => {
      expect(() => validateDtcgDocuments({ bad: { token: [] as unknown as Record<string, unknown> } })).not.toThrow();
      expect(validateDtcgDocuments({ bad: { token: [] as unknown as Record<string, unknown> } })[0]).toContain('expected a token or group object');
    });

    it('parses $root as a reserved terminal segment and rejects flattened collisions', () => {
      const document = {
        accent: {
          $type: 'color',
          $root: {
            $value: { colorSpace: 'srgb', components: [1, 0, 0] },
            $description: 'Accent root.',
          },
        },
      };
      expect(Object.keys(fromDtcgDocument(document).entries)).toEqual(['accent-root']);
      expect(validateDtcgDocuments({
        'zbk-color': document,
        'zbk-app': {
          accent: { $type: 'color', $value: '{color.accent.$root}', $description: 'Alias.' },
        },
      })).toEqual([]);

      const collision = validateDtcgDocument({
        accent: {
          ...document.accent,
          root: {
            $value: { colorSpace: 'srgb', components: [0, 0, 0] },
            $description: 'Collision.',
          },
        },
      });
      expect(collision).toEqual([expect.stringContaining("flattened token name 'accent-root' collides")]);
    });

    it('maps a document-level $root to flat root and rejects an ordinary root collision', () => {
      const document = {
        $type: 'number',
        $root: { $value: 1, $description: 'Root.' },
      };
      expect(fromDtcgDocument(document).entries.root.$value).toBe(1);
      expect(validateDtcgDocument(document)).toEqual([]);
      expect(validateDtcgDocument({
        ...document,
        root: { $value: 2, $description: 'Collision.' },
      })).toEqual([expect.stringContaining("flattened token name 'root' collides")]);
    });

    it('keeps literal empty placeholders structured and restores only valid runtime placeholders', () => {
      const document = {
        $type: 'color',
        empty: {
          $value: { colorSpace: 'srgb', components: [0, 0, 0], alpha: 0 },
          $description: 'Empty.',
          $extensions: { 'dev.zebkit': { emptyColorPlaceholder: true } },
        },
      };
      expect(fromDtcgDocument(document, { mode: 'literal' }).entries.empty.$value).toEqual(
        document.empty.$value
      );
      expect(fromDtcgDocument(document, { mode: 'runtime' }).entries.empty.$value).toBe('');
      expect(validateDtcgDocument({
        $type: 'color',
        empty: {
          $description: 'Missing.',
          $extensions: { 'dev.zebkit': { emptyColorPlaceholder: true } },
        },
      })).toEqual(expect.arrayContaining([expect.stringContaining('missing $value')]));
    });

    it('preserves token and group deprecation plus unknown vendor extensions', () => {
      const document = {
        $description: 'Root.',
        $deprecated: 'Use the replacement collection.',
        $extensions: {
          'dev.zebkit': { layer: 'base' },
          'com.example': { root: true },
        },
        nested: {
          $description: 'Nested.',
          $extensions: { 'com.example': { group: true } },
          token: {
            $type: 'number',
            $value: 1,
            $description: 'Token.',
            $deprecated: true,
            $extensions: { 'com.example': { token: true } },
          },
        },
      };
      const parsed = fromDtcgDocument(document, { mode: 'literal' });
      expect(parsed.entries['nested-token'].$deprecated).toBe(true);
      expect(parsed.entries['nested-token'].$extensions?.['com.example']).toEqual({ token: true });
      expect(toDtcgDocument(parsed.entries, parsed.meta)).toEqual(document);
    });

    it('infers a missing whole-alias type from its resolved target', () => {
      expect(validateDtcgDocuments({
        'zbk-color': {
          red: {
            $type: 'color',
            $value: { colorSpace: 'srgb', components: [1, 0, 0] },
            $description: 'Red.',
          },
        },
        'zbk-app': {
          accent: { $value: '{color.red}', $description: 'Accent.' },
        },
      })).toEqual([]);
    });

    it('rejects proprietary types in strict validation mode', () => {
      const errors = validateDtcgDocuments(
        {
          'zbk-layout': {
            auto: { $type: 'cssDimension', $value: 'auto', $description: 'Auto.' },
          },
        },
        'strict',
        { strict: true }
      );
      expect(errors).toEqual([expect.stringContaining("non-spec $type 'cssDimension'")]);
    });

    it.each([
      ['number', '1'],
      ['color', 1],
    ] as const)('rejects a %s token with an incompatible literal', ($type, $value) => {
      const errors = validateDtcgDocument({
        invalid: { $type, $value, $description: 'Invalid value.' },
      });
      expect(errors[0]).toMatch(/invalid|expected|must/i);
      expect(errors[0]).toContain('.invalid');
    });

    it('enforces cubic-bezier x ranges without constraining y', () => {
      expect(
        validateDtcgDocument({
          bounce: { $type: 'cubicBezier', $value: [0.2, 1.5, 0.8, -0.5], $description: 'Bounce.' },
        })
      ).toEqual([]);
      expect(
        validateDtcgDocument({
          invalid: { $type: 'cubicBezier', $value: [-0.1, 0, 0.8, 1], $description: 'Invalid.' },
        })[0]
      ).toContain('.invalid');
    });

    it('accepts a whole-value alias without validating it as a literal', () => {
      expect(
        validateDtcgDocument({
          $type: 'dimension',
          alias: { $value: '{spacing.fluid}', $description: 'Alias.' },
        })
      ).toEqual([]);
    });

    it('rejects malformed aliases rather than accepting them as typed literals', () => {
      expect(validateDtcgDocument({
        invalid: { $type: 'color', $value: '{color..red}', $description: 'Invalid.' },
      })[0]).toContain("value does not match $type 'color'");
    });

    it.each(DTCG_COLOR_SPACES)('accepts and serializes the %s color space', (colorSpace) => {
      const components = colorSpace === 'hsl' ? ['none', 50, 40] : [0.2, 'none', 0.4];
      expect(
        validateDtcgDocument({
          sample: {
            $type: 'color',
            $value: { colorSpace, components, alpha: 0.5 },
            $description: 'Sample color.',
          },
        })
      ).toEqual([]);
    });

    it('preserves none components in CSS color serialization', () => {
      expect(serializeColorValue({ colorSpace: 'hwb', components: ['none', 20, 'none'] })).toBe(
        'hwb(none 20% none)'
      );
      expect(serializeColorValue({ colorSpace: 'lab', components: [50, 'none', 'none'] })).toBe(
        'lab(50% none none)'
      );
    });

    it('preserves none components in sRGB shadow serialization', () => {
      const shadow = {
        color: { colorSpace: 'srgb', components: ['none', 0, 0] },
        offsetX: { value: 0, unit: 'px' },
        offsetY: { value: 1, unit: 'px' },
        blur: { value: 2, unit: 'px' },
        spread: { value: 0, unit: 'px' },
      } as any;
      const css = serializeShadowValue(shadow);
      expect(css).toContain('none');
      expect(css).not.toMatch(/NaN|undefined/);
    });

    it.each([
      1,
      400,
      1000,
    ])('accepts numeric font weight %s', ($value) => {
      expect(validateDtcgDocument({ weight: { $type: 'fontWeight', $value, $description: 'Weight.' } })).toEqual([]);
    });

    it.each([
      'thin', 'hairline', 'extra-light', 'ultra-light', 'light', 'normal', 'regular', 'book',
      'medium', 'semi-bold', 'demi-bold', 'bold', 'extra-bold', 'ultra-bold', 'black', 'heavy',
      'extra-black', 'ultra-black',
    ])
      ('accepts DTCG named font weight %s', ($value) => {
        expect(validateDtcgDocument({ weight: { $type: 'fontWeight', $value, $description: 'Weight.' } })).toEqual([]);
      });

    it.each([0, 1001, 'not-a-weight', 'Bold'])('rejects invalid font weight %s', ($value) => {
      expect(validateDtcgDocument({ weight: { $type: 'fontWeight', $value, $description: 'Weight.' } })[0]).toContain('.weight');
    });

    it.each([
      ['number', Number.NaN],
      ['number', Number.POSITIVE_INFINITY],
      ['dimension', { value: Number.NEGATIVE_INFINITY, unit: 'px' }],
      ['fontFamily', 42],
    ])('rejects non-JSON or wrong-shaped %s values', ($type, $value) => {
      expect(validateDtcgDocument({ invalid: { $type, $value, $description: 'Invalid.' } })[0]).toContain('.invalid');
    });

    it.each(['cursor', 'transform'])('accepts proprietary string type %s from the central registry', ($type) => {
      expect(validateDtcgDocument({ value: { $type, $value: 'none', $description: 'Value.' } })).toEqual([]);
    });

    it.each(['solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'outset', 'inset'])
      ('accepts stroke style keyword %s', ($value) => {
        expect(validateDtcgDocument({ border: { $type: 'strokeStyle', $value, $description: 'Border.' } })).toEqual([]);
      });

    it.each(['none', 'not-a-style'])('rejects invalid stroke style %s', ($value) => {
      expect(validateDtcgDocument({ border: { $type: 'strokeStyle', $value, $description: 'Border.' } })[0]).toContain('.border');
    });

    it('every exported default snapshot is a valid DTCG document', async () => {
      const exported = await fs.readJson('doc-site/static/zebkit/default-tokens.json');
      const modules = Object.entries(exported);
      expect(modules.length).toBeGreaterThan(0);
      for (const [moduleName, doc] of modules) {
        expect(validateDtcgDocument(doc, moduleName)).toEqual([]);
      }
    });
  });

  it('reports a deterministic reference cycle chain across documents', () => {
    const errors = validateDtcgDocuments({
      'zbk-a': { one: { $type: 'color', $value: '{b.two}', $description: 'One.' } },
      'zbk-b': { two: { $type: 'color', $value: '{a.one}', $description: 'Two.' } },
    });
    expect(errors).toContain('collection: reference cycle a.one -> b.two -> a.one');
  });

  it('validates references and cycles reached through shadow arrays and sub-values', () => {
    const dimension = { $type: 'dimension', $value: { value: 1, unit: 'px' }, $description: 'Dimension.' };
    const color = { $type: 'color', $value: { colorSpace: 'srgb', components: [0, 0, 0] }, $description: 'Color.' };
    const layer = {
      color: '{base.color}',
      offsetX: '{base.dimension}',
      offsetY: { value: 0, unit: 'px' },
      blur: { value: 1, unit: 'px' },
      spread: { value: 0, unit: 'px' },
    };
    expect(validateDtcgDocuments({
      'zbk-base': { color, dimension },
      'zbk-shadow': {
        one: { $type: 'shadow', $value: [layer, '{shadow.two}'], $description: 'One.' },
        two: { $type: 'shadow', $value: '{shadow.one}', $description: 'Two.' },
      },
    })).toEqual(expect.arrayContaining([
      expect.stringContaining('reference cycle shadow.one -> shadow.two -> shadow.one'),
    ]));

    expect(validateDtcgDocuments({
      'zbk-base': { color, dimension },
      'zbk-shadow': {
        wrong: {
          $type: 'shadow',
          $value: [{ ...layer, color: '{base.dimension}' }],
          $description: 'Wrong.',
        },
      },
    })).toEqual(expect.arrayContaining([expect.stringContaining("expected 'color'")]));
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

    it('materializes fluid scale values and exposes explicit literal/runtime read modes', () => {
      const tokens = {
        'zbk-font-size': {
          md: {
            $type: 'cssDimension',
            $description: 'Base.',
            $extensions: {
              'dev.zebkit': {
                a11y: '--zbk-a11y-font-size-modifier-md',
                scale: { index: 0 },
              },
            },
          },
        },
      } as unknown as Record<string, TokenInterface>;
      const groupExtensions = {
        'zbk-font-size': {
          'dev.zebkit': {
            scale: {
              'min-viewport': '360px',
              'max-viewport': '1240px',
              'min-base': '1rem',
              'max-base': '1.25rem',
              'min-ratio': 1.2,
              'max-ratio': 1.25,
            },
          },
        },
      } as const;

      const docs = toDtcgDocuments({ tokens, groupExtensions });
      const exported = docs['zbk-font-size'].md as Record<string, unknown>;
      expect(typeof exported.$value).toBe('string');
      expect(exported.$extensions).toEqual({
        'dev.zebkit': {
          a11y: '--zbk-a11y-font-size-modifier-md',
          scale: { index: 0, valueSource: 'generated' },
        },
      });

      const literal = fromDtcgDocument(docs['zbk-font-size'], { mode: 'literal' }).entries;
      expect(literal.md.$value).toBe(exported.$value);
      expect(literal.md.$extensions?.['dev.zebkit']?.scale).toEqual({
        index: 0,
        valueSource: 'generated',
      });

      const { entries, meta } = fromDtcgDocument(docs['zbk-font-size'], { mode: 'runtime' });
      expect(entries.md.$value).toBeUndefined();
      expect(entries.md.$extensions?.['dev.zebkit']?.scale).toEqual({ index: 0 });

      const changedControls = {
        ...groupExtensions,
        'zbk-font-size': {
          'dev.zebkit': {
            scale: {
              ...groupExtensions['zbk-font-size']['dev.zebkit'].scale,
              'min-base': '1.25rem',
              'max-base': '1.5rem',
            },
          },
        },
      } as const;
      const changed = resolveTypeScale(
        { 'zbk-font-size': entries },
        { mode: 'fluid', groupExtensions: changedControls }
      )['zbk-font-size'].md.$value;
      expect(changed).not.toBe(exported.$value);

      const overridden = resolveTypeScale(
        {
          'zbk-font-size': {
            ...entries,
            md: { ...entries.md, $value: '3rem' },
          },
        },
        { mode: 'fluid', groupExtensions: changedControls }
      )['zbk-font-size'].md.$value;
      expect(overridden).toBe('calc(3rem * var(--zbk-a11y-font-size-modifier-md))');

      const secondPass = toDtcgDocuments({
        tokens: { 'zbk-font-size': entries },
        groupExtensions: { 'zbk-font-size': meta.groupExtensions },
      });
      expect(secondPass['zbk-font-size'].md).toEqual(exported);
    });

    it('round-trips a pinned step and applies its a11y modifier exactly once', () => {
      const tokens = {
        'zbk-font-size': {
          md: {
            $value: '3rem',
            $type: 'cssDimension',
            $description: 'Pinned.',
            $extensions: {
              'dev.zebkit': {
                a11y: '--zbk-a11y-font-size-modifier-md',
                scale: { index: 0 },
              },
            },
          },
        },
      } as unknown as Record<string, TokenInterface>;
      const docs = toDtcgDocuments({ tokens, groupExtensions: makeGroupExtensionsForTest() });
      const literal = fromDtcgDocument(docs['zbk-font-size'], { mode: 'literal' }).entries.md;
      expect(literal.$value).toBe('3rem');
      expect(literal.$extensions?.['dev.zebkit']?.scale).toEqual({ index: 0, valueSource: 'pinned' });
      const runtime = fromDtcgDocument(docs['zbk-font-size'], { mode: 'runtime' }).entries.md;
      expect(runtime.$value).toBe('3rem');
      expect(runtime.$extensions?.['dev.zebkit']?.scale).toEqual({ index: 0 });
      const resolved = resolveTypeScale(
        { 'zbk-font-size': { md: runtime } },
        { mode: 'fluid', groupExtensions: makeGroupExtensionsForTest() }
      )['zbk-font-size'].md.$value;
      expect(resolved).toBe('calc(3rem * var(--zbk-a11y-font-size-modifier-md))');
    });

    it('fails truthfully when a raw shadow cannot be represented', () => {
      expect(() => toDtcgDocument({
        shadow: { $value: 'var(--brand-shadow)', $type: 'shadow', $description: 'Shadow.' },
      } as unknown as TokenInterface, { layer: 'base' })).toThrow(/shadow.*var\(--brand-shadow\)/i);
    });

    it('normalizes representable CSS-variable shadow sub-values as DTCG references', () => {
      const referenceTokens = {
        'zbk-spacing': {
          '025': { $type: 'dimension', $value: { value: 0.25, unit: 'rem' }, $description: 'Space.' },
        },
        'zbk-app': {
          'canvas-muted': {
            $type: 'color',
            $value: { colorSpace: 'srgb', components: [0, 0, 0] },
            $description: 'Canvas.',
          },
        },
      } as unknown as Record<string, TokenInterface>;
      const doc = toDtcgDocument({
        shadow: {
          $value: '0 var(--zbk-spacing-025) 0 var(--zbk-app-canvas-muted)',
          $type: 'shadow',
          $description: 'Referenced shadow.',
        },
      } as unknown as TokenInterface, { layer: 'base', referenceTokens });
      expect(validateDtcgDocument(doc)).toEqual([]);
      const value = (doc.shadow as Record<string, any>).$value[0];
      expect(value.color).toBe('{app.canvas-muted}');
      expect(value.offsetY).toBe('{spacing.025}');
      expect(value.spread).toEqual({ value: 0, unit: 'px' });
    });

    it('normalizes two-to-four-dimension shadows with color first or last and exact module lookup', () => {
      const referenceTokens = {
        'zbk-accent-primary': {
          canvas: {
            $type: 'color',
            $value: { colorSpace: 'srgb', components: [0, 0, 0] },
            $description: 'Canvas.',
          },
        },
      } as unknown as Record<string, TokenInterface>;
      const doc = toDtcgDocument({
        compact: {
          $type: 'shadow',
          $value: 'var(--zbk-accent-primary-canvas) 1px 2px',
          $description: 'Compact.',
        },
        layers: {
          $type: 'shadow',
          $value: 'inset 1px 2px 3px #000000, 0 1px 2px 3px var(--zbk-accent-primary-canvas)',
          $description: 'Layers.',
        },
      } as unknown as TokenInterface, { layer: 'base', referenceTokens });
      const compact = (doc.compact as Record<string, any>).$value[0];
      expect(compact.color).toBe('{accent-primary.canvas}');
      expect(compact.blur).toEqual({ value: 0, unit: 'px' });
      expect(compact.spread).toEqual({ value: 0, unit: 'px' });
      expect((doc.layers as Record<string, any>).$value).toHaveLength(2);
      expect((doc.layers as Record<string, any>).$value[0].inset).toBe(true);
    });

    it('validates raw shadow grammar before a collection lookup exists', () => {
      expect(() => assertRawTokenValueNormalizable({
        $type: 'shadow',
        $value: '0 0 0 2px var(--zbk-app-canvas-muted)',
        $description: 'Theme shadow.',
      }, 'zbk-toggle.thumb-shadow')).not.toThrow();
    });

    it('rejects unsupported raw shadows with the token path', () => {
      expect(() => toDtcgDocument({
        invalid: { $type: 'shadow', $value: '#000000 1px', $description: 'Invalid.' },
      } as unknown as TokenInterface, { layer: 'base', label: 'zbk-shadow' })).toThrow(
        /zbk-shadow\.invalid.*unsupported raw CSS value/i
      );
    });

    it('normalizes raw theme CSS values for export and restores them on re-ingest', () => {
      const entries = {
        color: { $value: '#123456', $type: 'color', $description: 'Color.' },
        size: { $value: '44px', $type: 'dimension', $description: 'Size.' },
        delay: { $value: '0', $type: 'duration', $description: 'Delay.' },
        shadow: {
          $value: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
          $type: 'shadow',
          $description: 'Shadow.',
        },
      } as unknown as TokenInterface;
      const doc = toDtcgDocument(entries, { layer: 'base' });

      expect(validateDtcgDocument(doc)).toEqual([]);
      expect((doc.color as Record<string, any>).$value.colorSpace).toBe('srgb');
      expect((doc.size as Record<string, any>).$value).toEqual({ value: 44, unit: 'px' });
      expect((doc.shadow as Record<string, any>).$value[0].blur).toEqual({ value: 2, unit: 'px' });
      expect(fromDtcgDocument(doc).entries).toEqual(entries);
    });
  });

  describe('strict DTCG document sets (D9)', () => {
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

      const { documents, dropped } = toStrictDtcgDocuments({ 'zbk-app': doc });

      const kept = fromDtcgDocument(documents['zbk-app']).entries;
      expect(Object.keys(kept).sort()).toEqual(['brand', 'gap']);
      for (const entry of Object.values(kept)) {
        expect(isDtcgSpecType(entry.$type)).toBe(true);
      }
      expect(dropped['zbk-app'].sort((a, b) => a.name.localeCompare(b.name))).toEqual([
        expect.objectContaining({ name: 'auto', $type: 'cssDimension', reason: 'proprietary-type' }),
        expect.objectContaining({ name: 'cell', $type: 'display', reason: 'proprietary-type' }),
      ]);
    });

    it('drops aliases to proprietary tokens transitively and records the target', () => {
      const documents = {
        'zbk-color': {
          blue: { $type: 'color', $value: { colorSpace: 'srgb', components: [0, 0, 1] }, $description: 'Blue.' },
        },
        'zbk-layout': {
          $type: 'cssDimension',
          auto: { $value: 'auto', $description: 'Auto.' },
        },
        'zbk-component': {
          direct: { $type: 'dimension', $value: '{layout.auto}', $description: 'Direct.' },
          transitive: { $type: 'dimension', $value: '{component.direct}', $description: 'Transitive.' },
          valid: { $type: 'color', $value: '{color.blue}', $description: 'Valid.' },
        },
      };
      const result = toStrictDtcgDocuments(documents);
      expect(fromDtcgDocument(result.documents['zbk-component']).entries).toEqual({
        valid: documents['zbk-component'].valid,
      });
      expect(result.dropped['zbk-component']).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'direct', reason: 'referenced-proprietary', referencedTarget: 'layout.auto' }),
          expect.objectContaining({ name: 'transitive', reason: 'referenced-dropped', referencedTarget: 'component.direct' }),
        ])
      );
    });

    it('reports missing and incompatible references with the source path', () => {
      const errors = validateDtcgDocuments({
        'zbk-spacing': {
          $type: 'dimension',
          fluid: { $value: { value: 1, unit: 'rem' }, $description: 'Fluid.' },
        },
        'zbk-component': {
          missing: { $type: 'dimension', $value: '{spacing.nope}', $description: 'Missing.' },
          incompatible: { $type: 'color', $value: '{spacing.fluid}', $description: 'Wrong type.' },
        },
      });
      expect(errors).toEqual(expect.arrayContaining([
        expect.stringContaining('zbk-component.missing'),
        expect.stringContaining('spacing.nope'),
        expect.stringContaining('zbk-component.incompatible'),
        expect.stringContaining('dimension'),
      ]));
    });

    it('drops raw proprietary dimension normalization and records the manifest entry', () => {
      const full = toDtcgDocument({
        percent: { $type: 'dimension', $value: '50%', $description: 'Half.' },
      } as unknown as TokenInterface, { layer: 'base' });
      expect(full.$type).toBe('cssDimension');
      const result = toStrictDtcgDocuments({ 'zbk-layout': full });
      expect(result.dropped['zbk-layout']).toEqual([
        expect.objectContaining({ name: 'percent', reason: 'proprietary-type' }),
      ]);
      expect(Object.keys(fromDtcgDocument(result.documents['zbk-layout'], { mode: 'literal' }).entries)).toEqual([]);
      expect(validateDtcgDocuments({
        'zbk-layout': { percent: { $type: 'cssDimension', $value: '50%', $description: 'Half.' } },
      }, 'strict', { strict: true })[0]).toContain('non-spec');
    });

    it('uses the shared compatibility map for utility-to-boolean aliases', () => {
      expect(validateDtcgDocuments({
        'zbk-utility': {
          flag: { $type: 'boolean', $value: true, $description: 'Flag.' },
        },
        'zbk-component': {
          utility: { $type: 'utility', $value: '{utility.flag}', $description: 'Utility.' },
        },
      })).toEqual([]);
    });

    it('drops normative types that Zebkit cannot validate or serialize', () => {
      const result = toStrictDtcgDocuments({
        'zbk-border': {
          unsupported: {
            $type: 'border',
            $value: {},
            $description: 'Unsupported.',
          },
        },
      });
      expect(result.dropped['zbk-border']).toEqual([
        expect.objectContaining({ name: 'unsupported', reason: 'unsupported-type' }),
      ]);
    });

    it('rejects cyclic strict input before pruning', () => {
      expect(() => toStrictDtcgDocuments({
        'zbk-color': {
          one: { $type: 'color', $value: '{color.two}', $description: 'One.' },
          two: { $type: 'color', $value: '{color.one}', $description: 'Two.' },
        },
      })).toThrow(/reference cycles.*color\.one -> color\.two -> color\.one/i);
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
