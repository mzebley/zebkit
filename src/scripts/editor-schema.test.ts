/**
 * @jest-environment node
 */

import fs from 'fs-extra';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import Ajv from 'ajv';
import { tokenForGroupRoot } from './editor-schema-paths';
import { AUTHORABLE_VALUE_SCHEMAS } from './editor-value-schemas';
import { readTokenSnapshot } from '../cli/pull-state';

type ManifestModule = { key: string; file: string };

function jsonFilesBelow(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory()
      ? jsonFilesBelow(entryPath)
      : entry.name.endsWith('.tokens.json')
        ? [entryPath]
        : [];
  });
}

describe('generated editor token schemas', () => {
  let manifest: { modules: ManifestModule[] };

  beforeAll(() => {
    // `dist` is intentionally ignored. Build the fixture when this suite runs
    // in a fresh clone, rather than relying on a developer's previous package
    // build to make the source test pass.
    execFileSync('npm', ['run', 'build:defaults'], {
      cwd: process.cwd(),
      stdio: 'pipe',
    });
    execFileSync('npm', ['run', 'build:editor'], {
      cwd: process.cwd(),
      stdio: 'pipe',
    });
    const manifestPath = path.resolve('dist/cli/defaults/manifest.json');
    manifest = fs.readJsonSync(manifestPath) as { modules: ManifestModule[] };
  }, 240000);

  it('tracks one canonical repository schema for every authorable token module', () => {
    const settings = fs.readJsonSync(path.resolve('.vscode/settings.json')) as {
      'json.schemas': Array<{ fileMatch: string[]; url: string }>;
    };

    expect(settings['json.schemas']).toHaveLength(manifest.modules.length);
    for (const module of manifest.modules) {
      const schemaFile = `${module.key}.schema.json`;
      expect(settings['json.schemas']).toContainEqual({
        fileMatch: [`/theme/**/${module.key}.tokens.json`],
        url: `./schemas/tokens/${schemaFile}`,
      });
      expect(fs.pathExistsSync(path.resolve('schemas/tokens', schemaFile))).toBe(true);
    }
    expect(settings['json.schemas']).toContainEqual({
      fileMatch: ['/theme/**/zbk-color.tokens.json'],
      url: './schemas/tokens/zbk-color.schema.json',
    });
  });

  it('accepts every checked-in token override file', () => {
    const ajv = new Ajv({ allErrors: true, strict: false });
    const validators = new Map<string, ReturnType<typeof ajv.compile>>();

    for (const file of jsonFilesBelow(path.resolve('theme'))) {
      const key = path.basename(file, '.tokens.json');
      let validate = validators.get(key);
      if (!validate) {
        validate = ajv.compile(
          fs.readJsonSync(path.resolve('schemas/tokens', `${key}.schema.json`))
        );
        validators.set(key, validate);
      }

      const valid = validate(fs.readJsonSync(file));
      expect({ file: path.relative(process.cwd(), file), errors: validate.errors, valid }).toEqual({
        file: path.relative(process.cwd(), file),
        errors: null,
        valid: true,
      });
    }
  });

  it('accepts the authoring document emitted by pull without package-owned metadata', async () => {
    const snapshot = await readTokenSnapshot(path.resolve('dist/cli/defaults'), {
      readJson: fs.readJson,
    });
    const pulled = snapshot.modules['zbk-color'].tokens;
    const validate = new Ajv({ allErrors: true, strict: false }).compile(
      fs.readJsonSync(path.resolve('schemas/tokens/zbk-color.schema.json'))
    );

    expect(pulled).not.toHaveProperty('$extensions');
    const valid = validate(pulled);
    expect({ errors: validate.errors, valid }).toEqual({
      errors: null,
      valid: true,
    });

    const emptyDescription = structuredClone(pulled) as any;
    emptyDescription['red-50'].$description = '';
    expect(validate(emptyDescription)).toBe(false);
    expect(validate.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ instancePath: '/red-50/$description', keyword: 'minLength' }),
      ])
    );
  });

  it('accepts nested groups, metadata, and unknown vendor extensions', () => {
    const ajv = new Ajv({ allErrors: true, strict: false });
    const validate = ajv.compile(
      fs.readJsonSync(path.resolve('schemas/tokens/zbk-color.schema.json'))
    );
    const document = {
      $description: 'Nested override fixture',
      $deprecated: false,
      $extensions: { 'com.example.tool': { source: 'fixture' } },
      red: {
        $type: 'color',
        $description: 'Red palette group',
        '500': {
          $value: { colorSpace: 'hsl', components: [0, 80, 50] },
          $deprecated: 'Use red.600',
          $extensions: { 'com.example.tool': { reviewed: true } },
        },
        '600': {
          $value: '{color.red-500}',
          $description: 'Nested token',
        },
      },
    };

    expect({ errors: validate.errors, valid: validate(document) }).toEqual({
      errors: null,
      valid: true,
    });
  });

  it('maps group $root only to a known literal -root token', () => {
    const groupToken = { $type: 'color' };
    const literalRootToken = { $type: 'number' };
    const entries = {
      family: groupToken,
      'family-root': literalRootToken,
    };

    expect(tokenForGroupRoot(entries, 'family')).toBe(literalRootToken);
    expect(tokenForGroupRoot({ family: groupToken }, 'family')).toBeUndefined();

    const ajv = new Ajv({ allErrors: true, strict: false });
    const validate = ajv.compile(
      fs.readJsonSync(path.resolve('schemas/tokens/zbk-color.schema.json'))
    );
    expect(validate({ red: { '600': { $root: { $value: '{color.red-500}' } } } })).toBe(
      false
    );
  });

  it('accepts hyphenated group names when they flatten to known tokens', () => {
    const ajv = new Ajv({ allErrors: true, strict: false });
    const validate = ajv.compile(
      fs.readJsonSync(path.resolve('schemas/tokens/zbk-button.schema.json'))
    );

    expect(
      validate({
        'padding-inline': {
          start: { $value: '{spacing.2}' },
          end: { $value: '{spacing.2}' },
        },
      })
    ).toBe(true);
  });

  it('accepts empty known groups and compatible homogeneous group types', () => {
    const ajv = new Ajv({ allErrors: true, strict: false });
    const validate = ajv.compile(
      fs.readJsonSync(path.resolve('schemas/tokens/zbk-color.schema.json'))
    );

    expect(validate({ red: {} })).toBe(true);
    expect(validate({ red: { $type: 'color' } })).toBe(true);
    expect(validate({ red: { $type: 'cssColor' } })).toBe(true);
    expect(validate({ red: { $type: 'duration' } })).toBe(false);
  });

  it.each([
    ['color', { colorSpace: 'hsl', components: [10, 50] }],
    ['dimension', { value: 1, unit: 'em' }],
    ['dimension', 1],
    ['duration', { value: 100, unit: 'min' }],
    ['duration', 100],
    ['cubicBezier', [2, 0, 0, 1]],
    ['shadow', { offsetX: { value: 0, unit: 'px' } }],
    ['fontFamily', ['Inter', 42]],
    ['fontWeight', 0],
    ['number', {}],
    ['strokeStyle', {}],
    ['boolean', 'true'],
    ['cssDimension', 1],
    ['display', 1],
    ['cursor', 1],
    ['fontStyle', 1],
    ['textDecoration', 1],
    ['textTransform', 1],
    ['textAlignment', 1],
    ['transform', 1],
    ['transitionProperty', 1],
    ['cssEasingFunction', 1],
    ['cssColor', 1],
    ['cssDuration', 1],
    ['cssFontFamily', 1],
    ['cssFontWeight', 1],
    ['cssNumber', 1],
    ['cssStrokeStyle', 1],
    ['cssShadow', 1],
    ['asset', 1],
    ['content', 1],
    ['flex', 1],
    ['resize', 1],
  ])('rejects an invalid %s value', ($type, $value) => {
    const ajv = new Ajv({ allErrors: true, strict: false });
    const validate = ajv.compile(
      AUTHORABLE_VALUE_SCHEMAS[$type as keyof typeof AUTHORABLE_VALUE_SCHEMAS]
    );

    expect(validate($value)).toBe(false);
  });

  it.each([
    ['color', { colorSpace: 'hsl', components: [10, 50, 50] }],
    ['dimension', { value: 1, unit: 'rem' }],
    ['duration', { value: 100, unit: 'ms' }],
    ['cubicBezier', [0.2, 0, 0.8, 1]],
    ['shadow', ['{elevation.sm}']],
    ['fontFamily', ['Inter', 'sans-serif']],
    ['fontWeight', 400],
    ['number', 0.5],
    ['strokeStyle', 'solid'],
    ['boolean', true],
    ['cssDimension', '1em'],
    ['display', 'grid'],
    ['cursor', 'grab'],
    ['fontStyle', 'italic'],
    ['textDecoration', 'underline'],
    ['textTransform', 'uppercase'],
    ['textAlignment', 'start'],
    ['transform', 'translateX(0)'],
    ['transitionProperty', 'opacity'],
    ['cssEasingFunction', 'ease-out'],
    ['cssColor', 'color-mix(in srgb, red, blue)'],
    ['cssDuration', '1ms'],
    ['cssFontFamily', 'Inter, sans-serif'],
    ['cssFontWeight', 'bolder'],
    ['cssNumber', 'calc(1 + 1)'],
    ['cssStrokeStyle', 'solid'],
    ['cssShadow', '0 1px 2px black'],
    ['asset', 'url(icon.svg)'],
    ['content', '"Required"'],
    ['flex', '1 1 auto'],
    ['resize', 'block'],
  ])('accepts a valid %s value and a whole-value alias', ($type, $value) => {
    const ajv = new Ajv({ allErrors: true, strict: false });
    const validate = ajv.compile(
      AUTHORABLE_VALUE_SCHEMAS[$type as keyof typeof AUTHORABLE_VALUE_SCHEMAS]
    );

    expect(validate($value)).toBe(true);
    expect(validate('{app.canvas}')).toBe(true);
  });

  it('rejects unknown flattened and nested token paths', () => {
    const ajv = new Ajv({ allErrors: true, strict: false });
    const validate = ajv.compile(
      fs.readJsonSync(path.resolve('schemas/tokens/zbk-color.schema.json'))
    );

    expect(validate({ probe: { $type: 'color', $value: '{color.red-500}' } })).toBe(
      false
    );
    expect(
      validate({ red: { unknown: { $value: '{color.red-500}' } } })
    ).toBe(false);
  });

  it('rejects unknown reserved properties and invalid scale controls', () => {
    const ajv = new Ajv({ allErrors: true, strict: false });
    const validate = ajv.compile(
      fs.readJsonSync(path.resolve('schemas/tokens/zbk-color.schema.json'))
    );

    expect(validate({ $unknown: true })).toBe(false);
    expect(
      validate({
        $extensions: {
          'dev.zebkit': { scale: { 'min-viewport': 'nope' } },
        },
      })
    ).toBe(false);
  });

});
