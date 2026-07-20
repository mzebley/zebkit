import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Resolve everything from the script's own location so the script works
// regardless of cwd (doc-site/ via npm, or the repo root directly).
const docsDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const repoRoot = path.resolve(docsDir, '..');

const staticDir = path.join(docsDir, 'static', 'zebkit');
const targetDir = path.join(docsDir, 'src', 'lib', 'data', 'generated');

// The component bundle the docs serve at /zebkit/zebkit.js comes straight from
// the library build (`npm run build:components`).
const componentsDist = path.join(repoRoot, 'dist', 'components');

const tokenFiles = [
  'token-lookup.json',
  'allowed-token-types.json'
];

// The served `default-tokens.json` is a hoisted DTCG document (Phase 3): a
// module homogeneous in `$type` declares it once at the group level and its
// entries omit `$type`. The doc-site's data layer wants per-entry types, so the
// internal copy is expanded back — group `$type` pushed onto each entry, group
// `$`-metadata dropped — reproducing the flat `{ module: { entry: {…} } }` shape
// consumers read. (Kept in sync with src/scripts/tokens/dtcg-document.ts, which
// the decoupled doc-site can't import.)
function expandDefaultTokens(combined) {
  const out = {};
  for (const [moduleKey, doc] of Object.entries(combined)) {
    const groupType = typeof doc.$type === 'string' ? doc.$type : undefined;
    const entries = {};
    for (const [name, value] of Object.entries(doc)) {
      if (name.startsWith('$') || name.startsWith('_')) continue;
      if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
      entries[name] =
        groupType && !('$type' in value) ? { ...value, $type: groupType } : value;
    }
    out[moduleKey] = entries;
  }
  return out;
}

async function copyDefaultTokens() {
  const combined = JSON.parse(
    await fs.readFile(path.join(staticDir, 'default-tokens.json'), 'utf8')
  );
  await fs.writeFile(
    path.join(targetDir, 'default-tokens.json'),
    JSON.stringify(expandDefaultTokens(combined), null, 2) + '\n'
  );
}
async function copyComponentBundle() {
  // zebkit.js is the self-contained browser bundle (lit included).
  await copyFile(componentsDist, 'zebkit.js', path.join(staticDir, 'zebkit.js'));
  await copyFile(componentsDist, 'zebkit.js.map', path.join(staticDir, 'zebkit.js.map'));
}

async function copyFile(sourceDir, filename, targetPath) {
  const sourcePath = path.join(sourceDir, filename);
  try {
    await fs.copyFile(sourcePath, targetPath);
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return;
    }
    throw error;
  }
}

// Build the primitive palette from the palette token module in the synced
// default-tokens.json (`zbk-color`, materialized from the palette definition —
// DTCG alignment decision D7). The docs read token space, never SCSS.
async function generatePrimitivePalette() {
  const combined = JSON.parse(
    await fs.readFile(path.join(staticDir, 'default-tokens.json'), 'utf8')
  );
  const module = combined['zbk-color'];
  if (!module) {
    throw new Error('default-tokens.json has no zbk-color module — rebuild tokens first.');
  }

  const familyMap = new Map();
  const globals = [];
  for (const [name, token] of Object.entries(module)) {
    if (name.startsWith('_') || name.startsWith('$')) continue;
    const value = token.$value;
    if (name.startsWith('global-')) {
      // Globals are structured DTCG colors; reproduce the literal the palette
      // SCSS emits (hex fallback, or the `transparent` keyword at alpha 0).
      const literal = (value.alpha ?? 1) === 0 ? 'transparent' : value.hex;
      if (!literal) {
        throw new Error(`Unrecognized palette global '${name}' (${JSON.stringify(value)}).`);
      }
      globals.push({ name, cssVar: `--zbk-color-${name}`, value: literal });
      continue;
    }
    const stepMatch = name.match(/^(.+)-(\d+)$/);
    if (!stepMatch || value?.colorSpace !== 'hsl') {
      throw new Error(`Unrecognized palette entry '${name}' (${JSON.stringify(value)}).`);
    }
    const [, familyName, step] = stepMatch;
    const [hue, saturation, lightness] = value.components;
    let family = familyMap.get(familyName);
    if (!family) {
      family = {
        name: familyName,
        hue,
        saturation,
        swatches: []
      };
      familyMap.set(familyName, family);
    }
    family.swatches.push({
      step: Number(step),
      lightness,
      cssVar: `--zbk-color-${familyName}-${step}`,
      hsl: `hsl(${hue}, ${saturation}%, ${lightness}%)`
    });
  }

  const families = [...familyMap.values()].sort((a, b) => a.name.localeCompare(b.name));
  for (const family of families) {
    family.swatches.sort((a, b) => a.step - b.step);
  }
  const steps = families[0].swatches.map((swatch) => swatch.step);

  const palette = { steps, families, globals };
  await fs.writeFile(
    path.join(targetDir, 'primitive-palette.json'),
    JSON.stringify(palette, null, 2) + '\n'
  );
}

async function run() {
  await fs.mkdir(targetDir, { recursive: true });
  await fs.mkdir(staticDir, { recursive: true });

  await Promise.all(
    tokenFiles.map((filename) => copyFile(staticDir, filename, path.join(targetDir, filename)))
  );

  await copyDefaultTokens();

  await copyComponentBundle();

  await generatePrimitivePalette();
}

run().catch((error) => {
  console.error('Failed to copy token json files:', error);
  process.exit(1);
});
