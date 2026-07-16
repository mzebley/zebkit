// Agent context generator (GRAMMAR.md §10): compiles the machine-readable
// component contract — Custom Elements Manifest + token modules + variant
// registry + component manifests — into per-component markdown plus a
// combined llms.txt, served by the docs site at /zebkit/context/.
//
// Inputs are tracked build artifacts plus the hand-authored manifests:
//   - custom-elements.json                                  (build:cem)
//   - docs/src/lib/data/generated/default-tokens.json       (build:defaults)
//   - docs/static/zebkit/zbk-default-variants.json          (build:defaults)
//   - src/components/*/zbk-*.manifest.json                  (hand-authored;
//     the guidance layer: slots, usage, keyboard, examples — lint:components
//     keeps them honest against the code)
//
// Run via `npm run build:context`; `npm run check` fails on drift.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { globSync } from 'glob';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(repoRoot, 'docs', 'static', 'zebkit', 'context');

interface CemAttribute {
  name: string;
  description?: string;
  default?: string;
  type?: { text?: string };
}

interface CemSlot {
  name?: string;
  description?: string;
}

interface CemDeclaration {
  name: string;
  tagName?: string;
  description?: string;
  attributes?: CemAttribute[];
  slots?: CemSlot[];
  events?: { name: string; description?: string }[];
}

interface TokenEntry {
  value?: string | number;
  type?: string;
  description?: string;
  a11y?: boolean | string;
}

interface VariantEntry {
  component: string;
  name: string;
  className?: string;
  axis?: string;
  description?: string;
  overrides?: Record<string, string>;
}

interface ManifestSlot {
  description: string;
  required?: boolean;
  presentational?: boolean;
  tokens?: { size?: string; color?: string };
  positions?: string[];
  guidance?: string[];
}

interface ComponentManifest {
  tag: string;
  purpose: string;
  nativeElement?: string;
  useWhen?: string[];
  notWhen?: { case: string; instead?: string }[];
  guidance?: string[];
  slots: Record<string, ManifestSlot>;
  keyboard?: { keys: string; does: string }[];
  examples: { title: string; html: string; tier?: string; why?: string }[];
  variantTiers?: Record<string, string>;
  related?: string[];
}

function loadManifests(): Map<string, ComponentManifest> {
  const manifests = new Map<string, ComponentManifest>();
  for (const file of globSync('src/components/*/zbk-*.manifest.json', { cwd: repoRoot }).sort()) {
    const manifest = readJson<ComponentManifest>(file);
    manifests.set(manifest.tag, manifest);
  }
  return manifests;
}

function readJson<T>(relPath: string): T {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, relPath), 'utf8')) as T;
}

/** Single-line, pipe-safe table cell. */
function cell(text = ''): string {
  return text.replace(/\s+/g, ' ').replace(/\|/g, '\\|').trim();
}

function componentDeclarations(cem: {
  modules: { declarations?: CemDeclaration[] }[];
}): CemDeclaration[] {
  return cem.modules
    .flatMap((mod) => mod.declarations ?? [])
    .filter((decl): decl is CemDeclaration & { tagName: string } =>
      Boolean(decl.tagName?.startsWith('zbk-'))
    )
    .sort((a, b) => a.tagName!.localeCompare(b.tagName!));
}

function renderComponent(
  decl: CemDeclaration,
  tokens: Record<string, TokenEntry> | undefined,
  variants: VariantEntry[],
  manifest: ComponentManifest | undefined
): string {
  const tag = decl.tagName!;
  const component = tag.replace(/^zbk-/, '');
  const lines: string[] = [];

  lines.push(`# <${tag}>`);
  lines.push('');
  const intro = decl.description?.trim() || manifest?.purpose;
  if (intro) {
    lines.push(intro);
    lines.push('');
  }
  lines.push(
    `Base class: \`.${tag}\`. Variant classes: \`.${tag}--{variant}\`. ` +
      `Tokens: \`--${tag}-{property}[-{state}]\`. ` +
      `Write \`aria-*\`/\`role\` on the element; they relocate to the internal native element. ` +
      `\`focus()\` forwards to the internal focusable.`
  );
  lines.push('');

  if (manifest?.useWhen?.length || manifest?.notWhen?.length) {
    lines.push('## When to use');
    lines.push('');
    for (const entry of manifest.useWhen ?? []) lines.push(`- ${entry}`);
    for (const entry of manifest.notWhen ?? []) {
      lines.push(`- NOT ${entry.case}${entry.instead ? ` → ${entry.instead}` : ''}`);
    }
    lines.push('');
  }

  if (manifest?.guidance?.length) {
    lines.push('## Guidance');
    lines.push('');
    for (const entry of manifest.guidance) lines.push(`- ${entry}`);
    lines.push('');
  }

  const attributes = decl.attributes ?? [];
  if (attributes.length > 0) {
    lines.push('## Attributes');
    lines.push('');
    lines.push('| Attribute | Type | Default | Description |');
    lines.push('|---|---|---|---|');
    for (const attr of attributes) {
      lines.push(
        `| \`${attr.name}\` | \`${cell(attr.type?.text ?? '')}\` | ${
          attr.default ? `\`${cell(attr.default)}\`` : '—'
        } | ${cell(attr.description)} |`
      );
    }
    lines.push('');
  }

  if (manifest) {
    lines.push('## Slots');
    lines.push('');
    lines.push('| Slot | Description | Notes |');
    lines.push('|---|---|---|');
    for (const [name, slot] of Object.entries(manifest.slots)) {
      const notes: string[] = [];
      if (slot.required) notes.push('required');
      if (slot.presentational) notes.push('aria-hidden');
      if (slot.tokens?.size) notes.push(`sized by \`${slot.tokens.size}\``);
      if (slot.tokens?.color) notes.push(`colored by \`${slot.tokens.color}\``);
      if (slot.positions?.length) notes.push(`data-position: ${slot.positions.join('\\|')}`);
      lines.push(
        `| ${name === 'default' ? '*(default)*' : `\`${name}\``} | ${cell(
          slot.description
        )} | ${cell(notes.join('; ')) || '—'} |`
      );
    }
    lines.push('');
    const slotGuidance = Object.entries(manifest.slots).flatMap(([name, slot]) =>
      (slot.guidance ?? []).map((entry) => `- \`${name}\`: ${entry}`)
    );
    if (slotGuidance.length > 0) {
      lines.push(...slotGuidance);
      lines.push('');
    }
  } else if ((decl.slots ?? []).length > 0) {
    // Pre-manifest fallback (zbk-heading) — CEM @slot annotations.
    lines.push('## Slots');
    lines.push('');
    lines.push('| Slot | Description |');
    lines.push('|---|---|');
    for (const slot of decl.slots ?? []) {
      lines.push(
        `| ${slot.name ? `\`${slot.name}\`` : '*(default)*'} | ${cell(
          slot.description
        )} |`
      );
    }
    lines.push('');
  }

  if (manifest?.keyboard?.length) {
    lines.push('## Keyboard');
    lines.push('');
    for (const entry of manifest.keyboard) {
      lines.push(`- \`${entry.keys}\` — ${cell(entry.does)}`);
    }
    lines.push('');
  }

  lines.push('## Events');
  lines.push('');
  const events = decl.events ?? [];
  if (events.length > 0) {
    for (const event of events) {
      lines.push(`- \`${event.name}\` — ${cell(event.description)}`);
    }
  } else {
    lines.push(
      'No custom events. Native events (`click`, `change`, `input`, ...) bubble from the internal native element in light DOM — listen on the zebkit element.'
    );
  }
  lines.push('');

  if (manifest?.examples.length) {
    lines.push('## Examples');
    lines.push('');
    for (const example of manifest.examples) {
      const tier = example.tier && example.tier !== 'recommended' ? ` (${example.tier})` : '';
      lines.push(`**${example.title}**${tier}`);
      lines.push('');
      lines.push('```html');
      lines.push(example.html);
      lines.push('```');
      lines.push('');
      if (example.why) {
        lines.push(example.why);
        lines.push('');
      }
    }
  }

  const tokenEntries = Object.entries(tokens ?? {});
  if (tokenEntries.length > 0) {
    lines.push('## Tokens (CSS custom properties)');
    lines.push('');
    lines.push(
      'Values are alias references (`{family.name}` compiles to `var(--zbk-family-name)`) or structural literals. Override any of them on a selector to re-style; nothing else is needed.'
    );
    lines.push('');
    lines.push('| Token | Default | Type | Description |');
    lines.push('|---|---|---|---|');
    for (const [name, token] of tokenEntries) {
      const a11y = token.a11y ? ' **(a11y)**' : '';
      lines.push(
        `| \`--${tag}-${name}\` | \`${cell(String(token.value ?? ''))}\` | ${cell(
          token.type
        )} | ${cell(token.description)}${a11y} |`
      );
    }
    lines.push('');
  }

  const componentVariants = variants.filter((v) => v.component === component);
  lines.push('## Variants');
  lines.push('');
  if (componentVariants.length > 0) {
    lines.push(
      'A variant is a named, partial remapping of the token surface compiled to a class. Apply via `variant="name other-name"`; different axes compose, same-axis variants are alternatives.'
    );
    lines.push('');
    lines.push('| Variant | Axis | Class | Description | Overrides |');
    lines.push('|---|---|---|---|---|');
    for (const variant of componentVariants) {
      const overrides = Object.entries(variant.overrides ?? {})
        .map(([token, value]) => `${token}: ${value}`)
        .join('; ');
      const tier = manifest?.variantTiers?.[variant.name];
      lines.push(
        `| \`${variant.name}\`${tier ? ` (${tier})` : ''} | ${cell(variant.axis) || '—'} | \`${
          variant.className ?? `${tag}--${variant.name}`
        }\` | ${cell(variant.description)} | ${cell(overrides)} |`
      );
    }
  } else {
    lines.push('No shipped variants.');
  }
  lines.push('');
  lines.push(
    `Custom variants: add a \`${tag}.variants.json\` file to the base theme's token folder ` +
      `(component-keyed map of \`{ "${component}": { "{name}": { "overrides": { ... } } } }\`; ` +
      `token keys must exist in the table above, values are alias references or structural literals). ` +
      `A shipped variant name patches that variant's CSS — usable immediately. A new name compiles a new ` +
      `\`.${tag}--{name}\` class and additionally needs \`ZebkitElement.registerVariants(json)\` before ` +
      `elements upgrade so \`variant="{name}"\` validates and applies it.`
  );
  lines.push('');

  if (manifest?.related?.length) {
    lines.push(`Related: ${manifest.related.map((ref) => `\`<${ref}>\``).join(', ')}.`);
    lines.push('');
  }

  return lines.join('\n');
}

function main(): void {
  const cem = readJson<{ modules: { declarations?: CemDeclaration[] }[] }>(
    'custom-elements.json'
  );
  const tokenRegistry = readJson<Record<string, Record<string, TokenEntry>>>(
    'docs/src/lib/data/generated/default-tokens.json'
  );
  const variantRegistry = readJson<
    Record<string, Record<string, VariantEntry>>
  >('docs/static/zebkit/zbk-default-variants.json');
  const variants = Object.values(variantRegistry).flatMap((byName) =>
    Object.values(byName)
  );
  const manifests = loadManifests();

  const declarations = componentDeclarations(cem);
  fs.mkdirSync(outDir, { recursive: true });

  const stamp =
    '<!-- Generated by `npm run build:context` (GRAMMAR.md §10). Do not edit by hand. -->';

  const combined: string[] = [
    stamp,
    '',
    '# Zebkit components — agent context',
    '',
    'Zebkit is a token-driven, accessibility-first web component library. One grammar covers every component:',
    '',
    '- The custom element is the single documented entry point; rendered classes are the compilation target.',
    '- Components render into light DOM around a native element. ARIA written on the element relocates to it; native events bubble; `focus()` forwards.',
    '- Every visual property is a `--zbk-{component}-{property}[-{state}]` token. State suffixes: `-hover`, `-active`, `-focus`, `-disabled`, plus semantic states (`-checked`, `-indeterminate`, ...) where the pattern has them.',
    '- `variant="name other-name"` applies registered variants — named token remaps compiled to classes. Unknown names warn with the registered vocabulary.',
    '- Consumers add or patch variants with JSON files in the base theme\'s token folder, detected by filename: `zbk-{component}.variants.json` (all custom variants for a component), `zbk-{component}.variant.{name}.json` (one variant), or any `*-variants.json`. A shipped name patches that variant; a new name compiles a new class and needs `ZebkitElement.registerVariants(json)` before elements upgrade so `variant="..."` accepts it.',
    '- Named slots come from a shared vocabulary: `icon` (use `data-position="start|end"` for explicit icon placement where supported), and `checked`/`unchecked`/`indeterminate` state indicators on selection controls.',
    '',
  ];

  const written: string[] = [];
  for (const decl of declarations) {
    const tag = decl.tagName!;
    const body = renderComponent(decl, tokenRegistry[tag], variants, manifests.get(tag));
    const filePath = path.join(outDir, `${tag}.md`);
    fs.writeFileSync(filePath, `${stamp}\n\n${body}`);
    written.push(path.relative(repoRoot, filePath));
    combined.push('---', '', body);
  }

  const llmsPath = path.join(outDir, 'llms.txt');
  fs.writeFileSync(llmsPath, combined.join('\n'));
  written.push(path.relative(repoRoot, llmsPath));

  console.log(`Agent context written for ${declarations.length} component(s):`);
  for (const file of written) console.log(`  ${file}`);
}

main();
