// Agent context generator (GRAMMAR.md §10): compiles the machine-readable
// component contract — Custom Elements Manifest + token modules + variant
// registry — into per-component markdown plus a combined llms.txt, served by
// the docs site at /zebkit/context/.
//
// Every input is a tracked build artifact, never hand-written:
//   - custom-elements.json                                  (build:cem)
//   - docs/src/lib/data/generated/default-tokens.json       (build:defaults)
//   - docs/static/zebkit/zbk-default-variants.json          (build:defaults)
//
// Run via `npm run build:context`; `npm run check` fails on drift.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
  variants: VariantEntry[]
): string {
  const tag = decl.tagName!;
  const component = tag.replace(/^zbk-/, '');
  const lines: string[] = [];

  lines.push(`# <${tag}>`);
  lines.push('');
  if (decl.description) {
    lines.push(decl.description.trim());
    lines.push('');
  }
  lines.push(
    `Base class: \`.${tag}\`. Variant classes: \`.${tag}--{variant}\`. ` +
      `Tokens: \`--${tag}-{property}[-{state}]\`. ` +
      `Write \`aria-*\`/\`role\` on the element; they relocate to the internal native element. ` +
      `\`focus()\` forwards to the internal focusable.`
  );
  lines.push('');

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

  const slots = decl.slots ?? [];
  if (slots.length > 0) {
    lines.push('## Slots');
    lines.push('');
    lines.push('| Slot | Description |');
    lines.push('|---|---|');
    for (const slot of slots) {
      lines.push(
        `| ${slot.name ? `\`${slot.name}\`` : '*(default)*'} | ${cell(
          slot.description
        )} |`
      );
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
      lines.push(
        `| \`${variant.name}\` | ${cell(variant.axis) || '—'} | \`${
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
    const body = renderComponent(decl, tokenRegistry[tag], variants);
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
