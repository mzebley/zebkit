/**
 * @jest-environment node
 */

import fs from 'fs-extra';
import path from 'node:path';
import Ajv from 'ajv';

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
  const manifest = fs.readJsonSync(
    path.resolve('dist/cli/defaults/manifest.json')
  ) as { modules: ManifestModule[] };

  it('tracks one canonical repository schema for every authorable token module', () => {
    const settings = fs.readJsonSync(path.resolve('.vscode/settings.json')) as {
      'json.schemas': Array<{ fileMatch: string[]; url: string }>;
    };

    // Emission-external modules (the primitive palette) are not overridable and
    // get no schema or theme-file association.
    const authorableModules = manifest.modules.filter((module) => {
      const data = fs.readJsonSync(
        path.resolve('dist/cli/defaults', module.file)
      ) as Record<string, unknown>;
      return data._cssEmission !== 'external';
    });

    expect(settings['json.schemas']).toHaveLength(authorableModules.length);
    for (const module of authorableModules) {
      const schemaFile = `${module.key}.schema.json`;
      expect(settings['json.schemas']).toContainEqual({
        fileMatch: [`/theme/**/${module.key}.tokens.json`],
        url: `./schemas/tokens/${schemaFile}`,
      });
      expect(fs.pathExistsSync(path.resolve('schemas/tokens', schemaFile))).toBe(true);
    }
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

});
