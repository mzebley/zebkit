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

// Sources for the primitive palette (live in the library, not the token JSON).
const paletteDir = path.join(repoRoot, 'src', 'tokens', 'colors', 'palette');
const colorMixin = path.join(repoRoot, 'src', 'tokens', 'styles', 'mixins', '_primitive-color.scss');

const tokenFiles = [
  'default-tokens.json',
  'token-lookup.json',
  'allowed-token-types.json'
];
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

// Parse the step -> lightness map straight out of the primitiveColor mixin so the
// docs never drift from the SCSS that actually generates the variables.
async function readStepLightness() {
  const scss = await fs.readFile(colorMixin, 'utf8');
  const map = [];
  const re = /-#\{\$name\}-(\d+):\s*hsl\([^,]+,[^,]+,\s*(\d+)%\)/g;
  let m;
  while ((m = re.exec(scss))) {
    map.push({ step: Number(m[1]), lightness: Number(m[2]) });
  }
  map.sort((a, b) => a.step - b.step);
  return map;
}

// Build the primitive palette by reading each _<family>.scss for its hue/saturation.
async function generatePrimitivePalette() {
  const stepLightness = await readStepLightness();
  const entries = await fs.readdir(paletteDir);

  const families = [];
  for (const file of entries.sort()) {
    if (!file.endsWith('.scss') || file === 'styles.scss') continue;
    const scss = await fs.readFile(path.join(paletteDir, file), 'utf8');
    const m = scss.match(/primitiveColor\(\s*"([^"]+)"\s*,\s*(\d+)\s*,\s*(\d+)%/);
    if (!m) continue;
    const [, name, hue, saturation] = m;
    families.push({
      name,
      hue: Number(hue),
      saturation: Number(saturation),
      swatches: stepLightness.map(({ step, lightness }) => ({
        step,
        lightness,
        cssVar: `--zbk-color-${name}-${step}`,
        hsl: `hsl(${hue}, ${saturation}%, ${lightness}%)`
      }))
    });
  }

  // Global, scale-less colors declared in palette/styles.scss.
  const stylesScss = await fs.readFile(path.join(paletteDir, 'styles.scss'), 'utf8');
  const globals = [];
  const gre = /--zbk-color-(global-[a-z]+):\s*([^;]+);/g;
  let g;
  while ((g = gre.exec(stylesScss))) {
    globals.push({
      name: g[1],
      cssVar: `--zbk-color-${g[1]}`,
      value: g[2].trim()
    });
  }

  const palette = { steps: stepLightness.map((s) => s.step), families, globals };
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

  await copyComponentBundle();

  await generatePrimitivePalette();
}

run().catch((error) => {
  console.error('Failed to copy token json files:', error);
  process.exit(1);
});
