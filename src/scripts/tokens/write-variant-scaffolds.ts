// Editable variant definition exports. Rides along with the token exports —
// same splitMode/outputFormats knobs — in the authorable shape the variant
// override loader reads, so an edited copy in the theme's tokenPath round-trips.

import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';
import { ZEBKIT_PREFIX } from '@config';
import { buildFilePayload } from './compile-token-helpers';
import type { VariantRegistryLike, VariantRuntimeEntryLike } from './compile-variant-helpers';

/**
 * The authorable form of a registry entry: exactly what a consumer variant
 * JSON file contains, so a scaffold can be edited and dropped back into the
 * theme's tokenPath.
 */
function toAuthorableVariant(entry: VariantRuntimeEntryLike): Record<string, unknown> {
  const defaultClassName = `${ZEBKIT_PREFIX}-${entry.component}--${entry.name}`;
  return {
    ...(entry.axis ? { axis: entry.axis } : {}),
    ...(entry.description ? { description: entry.description } : {}),
    ...(entry.className && entry.className !== defaultClassName
      ? { className: entry.className }
      : {}),
    overrides: entry.overrides ?? {},
  };
}

const SCAFFOLD_HEADER =
  'Variant definitions exported by `zebkit build`. Edit and keep the JSON form in your ' +
  "theme's tokenPath — the build reads JSON variant files only. TS/JS exports are for " +
  'app-side use (e.g. ZebkitElement.registerVariants).';

/**
 * Writes editable variant definition files alongside the token exports:
 * `combined` emits one `{theme}-variants.{ext}` per format, `per-module` one
 * `zbk-{component}.variants.{ext}` per component per format. Both JSON
 * spellings match the build's variant override filename detection.
 */
export async function writeVariantScaffolds(
  registry: VariantRegistryLike,
  destinationPath: string,
  outputFormats: string[],
  themeName: string,
  splitMode: 'combined' | 'per-module'
): Promise<void> {
  const components = Object.keys(registry).sort();
  if (components.length === 0) return;

  const normalizedFormats = outputFormats.map((format) => format.toLowerCase());
  const written: string[] = [];
  await fs.ensureDir(destinationPath);

  const authorableFor = (component: string): Record<string, unknown> => {
    const byName: Record<string, unknown> = {};
    for (const [name, entry] of Object.entries(registry[component])) {
      byName[name] = toAuthorableVariant(entry);
    }
    return byName;
  };

  const writePayload = async (format: string, basePath: string, payload: unknown) => {
    const { filePath, fileContent } = buildFilePayload(format, basePath, payload);
    const content =
      format === 'json' ? fileContent : `// ${SCAFFOLD_HEADER}\n${fileContent}`;
    await fs.writeFile(filePath, content);
    written.push(filePath);
  };

  if (splitMode === 'per-module') {
    for (const component of components) {
      for (const format of normalizedFormats) {
        await writePayload(
          format,
          path.join(destinationPath, `${ZEBKIT_PREFIX}-${component}.variants`),
          { [component]: authorableFor(component) }
        );
      }
    }
  } else {
    const combined: Record<string, unknown> = {};
    for (const component of components) {
      combined[component] = authorableFor(component);
    }
    for (const format of normalizedFormats) {
      await writePayload(format, path.join(destinationPath, `${themeName}-variants`), combined);
    }
  }

  console.log(chalk.green(`Variant definitions written to: ${written.join(', ')}`));
}
