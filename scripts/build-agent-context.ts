// Agent context generator (GRAMMAR.md §10): compiles the machine-readable
// component contract — Custom Elements Manifest + token modules + variant
// registry + component manifests — into per-component and utility markdown,
// a concise index, and a full aggregate served at /zebkit/context/.
//
// Inputs are tracked build artifacts plus the hand-authored manifests:
//   - custom-elements.json                                  (build:cem)
//   - doc-site/src/lib/data/generated/default-tokens.json   (build:doc-token-data)
//   - doc-site/static/zebkit/zbk-default-variants.json          (build:defaults)
//   - src/components/*/zbk-*.manifest.json                  (hand-authored;
//     the guidance layer: slots, usage, keyboard, examples — lint:components
//     keeps them honest against the code)
//
// Run via `npm run build:context`; `npm run check` fails on drift.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { globSync } from 'glob';
import {
  MANIFEST_GLOB,
  classesFromRules,
  type UtilityFamily,
  type UtilityManifest,
} from '../src/scripts/utilities/expand.js';
import {
  breakpointKeysFromModules,
  loadTokenModules,
  resolvePatternValues,
} from '../src/scripts/utilities/token-source.js';
import { tokenValueToString } from '../src/definitions/tokens.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(repoRoot, 'doc-site', 'static', 'zebkit', 'context');
const generatedDataDir = path.join(repoRoot, 'doc-site', 'src', 'lib', 'data', 'generated');
const docsStaticDir = path.join(repoRoot, 'doc-site', 'static');

const DOMAIN_META = {
  layout: { title: 'Layout utilities', summary: 'flex, grid, display, positioning, object fitting, overflow, and visibility' },
  spacing: { title: 'Spacing utilities', summary: 'margins, padding, sizes, position offsets, and page or section rhythm' },
  typography: { title: 'Typography utilities', summary: 'type scales, text behavior, and long-form prose' },
  border: { title: 'Border utilities', summary: 'border width, radius, style, and semantic border color' },
  effects: { title: 'Effects utilities', summary: 'elevation, opacity, stacking order, transitions, and focus rings' },
  interaction: { title: 'Interaction utilities', summary: 'cursor and pointer-event behavior' },
  color: { title: 'Color utilities', summary: 'token-bound ink, canvas, border, fill, and interaction-state color surfaces' },
} as const;

type UtilityDomain = keyof typeof DOMAIN_META;

interface ContextIndexEntry {
  name: string;
  href: string;
  description: string;
  kind: 'component' | 'utility';
}

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
  $value?: unknown;
  $displayValue?: string;
  $type?: string;
  $description?: string;
  $deprecated?: boolean | string;
  $extensions?: Record<string, unknown> & {
    'dev.zebkit'?: { a11y?: boolean | string };
  };
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

async function loadUtilityManifests(): Promise<UtilityManifest[]> {
  const tokenModules = await loadTokenModules(repoRoot);
  const breakpoints = breakpointKeysFromModules(tokenModules);
  const manifests: UtilityManifest[] = [];

  for (const file of globSync(MANIFEST_GLOB, { cwd: repoRoot }).sort()) {
    const manifest = readJson<UtilityManifest>(file);
    for (const family of manifest.families) {
      resolvePatternValues(family, tokenModules);
      if (family.modifiers?.responsive && family.modifiers.responsive.length === 0) {
        family.modifiers.responsive = breakpoints;
      }
    }
    manifests.push(manifest);
  }
  return manifests;
}

function readJson<T>(relPath: string): T {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, relPath), 'utf8')) as T;
}

function writeText(filePath: string, content: string): void {
  fs.writeFileSync(filePath, content.endsWith('\n') ? content : `${content}\n`);
}

function rootContextIndex(content: string): string {
  return content.replace(
    /\]\((zbk-[^)]+\.md|utilities-[^)]+\.md)\)/g,
    '](/zebkit/context/$1)'
  );
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

  // Skip the group-level $extensions member — it is scale metadata, not a token.
  const tokenEntries = Object.entries(tokens ?? {}).filter(
    ([name]) => !name.startsWith('$')
  );
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
      const a11y = token.$extensions?.['dev.zebkit']?.a11y ? ' **(a11y)**' : '';
      lines.push(
        `| \`--${tag}-${name}\` | \`${cell(token.$displayValue ?? (token.$value == null ? '' : tokenValueToString(token.$value, token.$type)))}\` | ${cell(
          token.$type
        )} | ${cell(token.$description)}${a11y} |`
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

function utilityPreamble(): string[] {
  return [
    'Utilities are token-bound class grammar, not hard-coded values. They live in `@layer utilities`, so unlayered consumer CSS overrides them without `!important`.',
    '',
    '- Pattern families use `base[-edge]-{value}`. Edges are logical (`block`, `inline`, `block-start`, `inline-end`) unless a family says otherwise.',
    '- When a family lists responsive support, prefix its class with `tablet:`, `tablet-lg:`, `desktop:`, `desktop-lg:`, or `widescreen:`.',
    '- Negative values use `neg-{value}` only where the family offers them.',
    '- Values resolve through design tokens; use the documented grammar instead of writing raw CSS values.',
    '',
  ];
}

function valueList(values: readonly (string | null)[], tiers: Record<string, string> = {}): string {
  if (Object.keys(tiers).length === 0 && values.length >= 4 && values.every((value) => value !== null && /^-?\d+$/.test(value))) {
    const numbers = values.map((value) => Number(value));
    const step = numbers[1] - numbers[0];
    if (numbers.every((value, index) => index === 0 || value === numbers[0] + step * index)) {
      return `${values[0]}…${values.at(-1)}`;
    }
  }
  return values
    .map((value) => {
      const text = value === null ? 'optional' : value;
      return tiers[text] ? `${text} (${tiers[text]})` : text;
    })
    .join(', ');
}

function familyNotes(lines: string[], family: UtilityFamily): void {
  if (family.a11y) lines.push(`- Accessibility: ${family.a11y}`);
  if (family.tier) lines.push(`- Usage tier: ${family.tier}.`);
  if (family.valueTiers && Object.keys(family.valueTiers).length > 0) {
    lines.push(
      `- Value tiers: ${Object.entries(family.valueTiers)
        .map(([value, tier]) => `\`${value}\` (${tier})`)
        .join(', ')}.`
    );
  }
  if (family.pattern?.aliases && Object.keys(family.pattern.aliases).length > 0) {
    lines.push(
      `- Aliases: ${Object.entries(family.pattern.aliases)
        .map(([alias, target]) => `\`${alias}\` → \`${target}\``)
        .join(', ')}.`
    );
  }
  if (family.knownExceptions) {
    const exceptions = [
      ...(family.knownExceptions.extra ?? []).map((entry) => `extra \`${entry}\``),
      ...(family.knownExceptions.missing ?? []).map((entry) => `missing \`${entry}\``),
    ];
    if (exceptions.length > 0) lines.push(`- Known exceptions: ${exceptions.join('; ')}.`);
  }
  for (const guidance of family.guidance ?? []) lines.push(`- ${guidance}`);
  if (lines.at(-1)?.startsWith('- ')) lines.push('');
}

function renderUtilityFamily(family: UtilityFamily): string {
  const lines = [`### ${family.name}`, '', family.description, ''];

  if (family.pattern) {
    const pattern = family.pattern;
    const edgePart = pattern.edges?.length ? ` — edges: ${pattern.edges.join(', ')}` : '';
    const values = pattern.values ?? [];
    const tokenBinding = family.tokens
      ? ` (${family.tokens.group} tokens${family.tokens.types ? `: ${family.tokens.types.join(', ')}` : ''})`
      : '';
    const negatives = Array.isArray(pattern.negativeValues) && pattern.negativeValues.length > 0
      ? ` · negatives: ${pattern.negativeValues.join(', ')}`
      : '';
    const responsive = family.modifiers?.responsive?.length
      ? ` · responsive: prefix with ${family.modifiers.responsive.map((name) => `\`${name}:\``).join(' ')}`
      : '';
    lines.push(
      `Grammar: \`${pattern.base}${pattern.edges?.length ? '[-edge]' : ''}-{value}\`${edgePart} · values: ${valueList(values, family.valueTiers)}${tokenBinding}${negatives}${responsive}`
    );
    lines.push('');
  } else if (family.statePattern) {
    const state = family.statePattern;
    const states = state.states === true ? ['focus', 'hover', 'active', 'disabled'] : state.states.filter((name) => name !== 'base');
    for (const projection of state.projections) {
      const axes = Object.entries({ ...state.axes, ...(projection.axes ?? {}) })
        .map(([name, values]) => `${name}: ${valueList(values, family.valueTiers)}`)
        .join(' · ');
      const targets = Object.entries(projection.targets)
        .map(([target, properties]) => `${target} -> ${[properties].flat().join(' + ')}`)
        .join(', ');
      lines.push(
        `Projection: \`${projection.class}\` -> \`${projection.var}\` — targets: ${targets} · ${axes}`
      );
    }
    lines.push(`State prefixes: ${states.map((name) => `\`${name}:\``).join(' ')}.`);
    lines.push('');
  } else if (family.classes) {
    lines.push(`Classes: ${family.classes.map((name) => `\`${name}\``).join(', ')}.`);
    const declarations = family.generator?.declarations
      ? Object.entries(family.generator.declarations)
          .map(([name, values]) => `\`${name}\`: ${Object.keys(values).join(', ')}`)
          .join('; ')
      : family.properties.join(', ');
    lines.push(`Sets: ${declarations}.`);
    if (family.modifiers?.responsive?.length) {
      lines.push(
        `Responsive: prefix with ${family.modifiers.responsive
          .map((name) => `\`${name}:\``)
          .join(' ')}.`
      );
    }
    lines.push('');
  } else if (family.rules) {
    const classes = [...new Set(classesFromRules(family.rules))];
    lines.push(classes.length ? `Defines: ${classes.map((name) => `\`${name}\``).join(', ')}.` : 'Defines no standalone utility class.');
    if (family.name.startsWith('transition-')) {
      lines.push('Transition timing variants compose with `transition-slow` and `transition-fast` where the family defines those modifiers.');
    }
    if (family.name.startsWith('prose')) {
      lines.push('The prose context styles matching descendant elements; use it for long-form content rather than as an element-by-element utility.');
    }
    lines.push('');
  }

  familyNotes(lines, family);
  return lines.join('\n');
}

function renderUtilityDomain(
  domain: UtilityDomain,
  manifests: UtilityManifest[],
  stamp: string,
  title = DOMAIN_META[domain].title
): string {
  const meta = DOMAIN_META[domain];
  const lines = [stamp, '', `# ${title}`, '', ...utilityPreamble()];
  for (const manifest of manifests) {
    lines.push(`## ${manifest.name}`, '', manifest.description, '');
    for (const family of manifest.families) lines.push(renderUtilityFamily(family));
  }
  return lines.join('\n');
}

async function main(): Promise<void> {
  const cem = readJson<{ modules: { declarations?: CemDeclaration[] }[] }>(
    'custom-elements.json'
  );
  const tokenRegistry = readJson<Record<string, Record<string, TokenEntry>>>(
    'doc-site/src/lib/data/generated/default-tokens.json'
  );
  const variantRegistry = readJson<
    Record<string, Record<string, VariantEntry>>
  >('doc-site/static/zebkit/zbk-default-variants.json');
  const variants = Object.values(variantRegistry).flatMap((byName) =>
    Object.values(byName)
  );
  const manifests = loadManifests();
  const utilityManifests = await loadUtilityManifests();

  const declarations = componentDeclarations(cem);
  fs.mkdirSync(outDir, { recursive: true });

  const stamp =
    '<!-- Generated by `npm run build:context` (GRAMMAR.md §10). Do not edit by hand. -->';

  const grammarPreamble = [
    'Zebkit is a token-driven, accessibility-first web component library. One grammar covers every component:',
    '',
    '- The custom element is the single documented entry point; rendered classes are the compilation target.',
    '- Components render into light DOM around a native element. ARIA written on the element relocates to it; native events bubble; `focus()` forwards.',
    '- Every visual property is a `--zbk-{component}-{property}[-{state}]` token. State suffixes: `-hover`, `-active`, `-focus`, `-disabled`, plus semantic states (`-checked`, `-indeterminate`, ...) where the pattern has them.',
    '- `variant="name other-name"` applies registered variants — named token remaps compiled to classes. Unknown names warn with the registered vocabulary.',
    '- Consumers add or patch variants with JSON files in the base theme\'s token folder, detected by filename: `zbk-{component}.variants.json` (all custom variants for a component), `zbk-{component}.variant.{name}.json` (one variant), or any `*-variants.json`. A shipped name patches that variant; a new name compiles a new class and needs `ZebkitElement.registerVariants(json)` before elements upgrade so `variant="..."` accepts it.',
    '- Named slots come from a shared vocabulary: `icon` (use `data-position="start|end"` for explicit icon placement where supported), and `checked`/`unchecked`/`indeterminate` state indicators on selection controls.',
  ];
  const full: string[] = [stamp, '', '# Zebkit — full agent context', '', ...grammarPreamble, ''];
  const index: string[] = [
    stamp,
    '',
    '# Zebkit agent context',
    '',
    'Zebkit is a token-driven, accessibility-first web component library. Components have one semantic grammar; utility classes are exhaustive, token-bound CSS vocabulary.',
    '',
    '## Components',
    '',
  ];
  const contextIndex: ContextIndexEntry[] = [];

  const written: string[] = [];
  const expectedContextFiles = new Set<string>();
  for (const decl of declarations) {
    const tag = decl.tagName!;
    const body = renderComponent(decl, tokenRegistry[tag], variants, manifests.get(tag));
    const filePath = path.join(outDir, `${tag}.md`);
    writeText(filePath, `${stamp}\n\n${body}`);
    expectedContextFiles.add(path.basename(filePath));
    written.push(path.relative(repoRoot, filePath));
    full.push('---', '', body);
    const manifest = manifests.get(tag);
    const description = manifest?.purpose || decl.description?.trim() || `The ${tag} component.`;
    index.push(`- [${tag}](${tag}.md): ${description}`);
    contextIndex.push({ name: tag, href: `${tag}.md`, description, kind: 'component' });
  }

  index.push('', '## Utilities', '');
  const byDomain = new Map<UtilityDomain, UtilityManifest[]>();
  for (const manifest of utilityManifests) {
    const domain = manifest.domain as UtilityDomain;
    const group = byDomain.get(domain) ?? [];
    group.push(manifest);
    byDomain.set(domain, group);
  }
  for (const domain of Object.keys(DOMAIN_META) as UtilityDomain[]) {
    const domainManifests = byDomain.get(domain);
    if (!domainManifests?.length) continue;
    const files =
      domain === 'layout'
        ? [
            {
              fileName: 'utilities-layout.md',
              manifests: domainManifests.filter((manifest) => manifest.key !== 'grid'),
              title: DOMAIN_META.layout.title,
              summary: 'flex, display, positioning, object fitting, overflow, and visibility',
            },
            {
              fileName: 'utilities-grid.md',
              manifests: domainManifests.filter((manifest) => manifest.key === 'grid'),
              title: 'Grid utilities',
              summary: 'grid tracks, placement, alignment, and sizing',
            },
          ]
        : [
            {
              fileName: domain === 'border' ? 'utilities-borders.md' : `utilities-${domain}.md`,
              manifests: domainManifests,
              title: DOMAIN_META[domain].title,
              summary: DOMAIN_META[domain].summary,
            },
          ];
    for (const entry of files) {
      if (entry.manifests.length === 0) continue;
      const body = renderUtilityDomain(domain, entry.manifests, stamp, entry.title);
      const filePath = path.join(outDir, entry.fileName);
      writeText(filePath, body);
      expectedContextFiles.add(path.basename(filePath));
      written.push(path.relative(repoRoot, filePath));
      full.push('---', '', body);
      index.push(`- [${entry.title}](${entry.fileName}): ${entry.summary}.`);
      contextIndex.push({
        name: entry.title,
        href: entry.fileName,
        description: entry.summary,
        kind: 'utility',
      });
    }
  }

  const llmsPath = path.join(outDir, 'llms.txt');
  writeText(llmsPath, index.join('\n'));
  expectedContextFiles.add(path.basename(llmsPath));
  written.push(path.relative(repoRoot, llmsPath));
  const fullPath = path.join(outDir, 'llms-full.txt');
  writeText(fullPath, full.join('\n'));
  expectedContextFiles.add(path.basename(fullPath));
  written.push(path.relative(repoRoot, fullPath));

  writeText(path.join(docsStaticDir, 'llms.txt'), rootContextIndex(index.join('\n')));
  writeText(path.join(docsStaticDir, 'llms-full.txt'), full.join('\n'));
  fs.mkdirSync(generatedDataDir, { recursive: true });
  writeText(
    path.join(generatedDataDir, 'context-index.json'),
    JSON.stringify({ files: contextIndex }, null, 2)
  );

  // Delete only obsolete files carrying this generator's stamp. Unknown files
  // in the directory are consumer-owned and remain untouched.
  for (const file of fs.readdirSync(outDir)) {
    if (expectedContextFiles.has(file)) continue;
    const filePath = path.join(outDir, file);
    if (!fs.statSync(filePath).isFile()) continue;
    if (fs.readFileSync(filePath, 'utf8').startsWith(stamp)) {
      fs.unlinkSync(filePath);
    }
  }

  const invalidPatterns = [
    /var\(--spacing-/,
    /var\(--app-/,
    /\[object Object\]/,
    /\bNaN\b/,
    /\|\s*`undefined`\s*\|/,
    /:\s*undefined(?:;|\s*\|)/,
  ];
  for (const file of [
    ...expectedContextFiles,
    path.relative(outDir, path.join(docsStaticDir, 'llms.txt')),
    path.relative(outDir, path.join(docsStaticDir, 'llms-full.txt')),
  ]) {
    const filePath = path.resolve(outDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const pattern = invalidPatterns.find((candidate) => candidate.test(content));
    if (pattern) {
      throw new Error(
        `Generated agent context ${path.relative(repoRoot, filePath)} matches ${pattern}.`
      );
    }
  }

  console.log(`Agent context written for ${declarations.length} component(s):`);
  for (const file of written) {
    const size = fs.statSync(path.join(repoRoot, file)).size;
    console.log(`  ${file} (${size} bytes)`);
  }
}

main();
