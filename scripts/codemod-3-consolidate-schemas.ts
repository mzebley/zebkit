#!/usr/bin/env tsx
/**
 * Phase 3 codemod (plans/dtcg-alignment/plan.md, decision D11): Zod schema
 * consolidation. The per-module `token-schema.ts` files were near-identical
 * `z.object({ <key>: tokenObjectSchema, … })` boilerplate; a module's default
 * export now validates against the single generic `tokenModuleSchema` (a record
 * of DTCG entries) in compile-tokens. This deletes each boilerplate schema and
 * rewrites its sibling `tokens.ts` to `satisfies TokenInterface`.
 *
 * Modules with real structural constraints keep their bespoke schema and are
 * skipped: breakpoint (viewport ordering), type-scale (generated-scale steps),
 * font-family (loading metadata). Deleted at the end of Phase 4 (D11).
 */
import path from 'path';
import fs from 'fs-extra';
import { glob } from 'glob';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '..');

const KEEP = new Set([
  'src/tokens/breakpoint/tokens/token-schema.ts',
  'src/tokens/typography/type-scale/tokens/token-schema.ts',
  'src/tokens/typography/font-family/tokens/token-schema.ts',
]);

let deleted = 0;
const unhandled: string[] = [];

function rewriteTokensFile(content: string): string | null {
  // Capture and drop `export type <Name> = z.infer<typeof tokenSchema>;`
  const typeMatch = content.match(/^export type (\w+) = z\.infer<typeof tokenSchema>;\n/m);
  if (!typeMatch) return null;
  const typeName = typeMatch[1];

  let out = content
    .replace(/^import \{ tokenSchema \} from "\.\/token-schema";\n/m, '')
    .replace(/^export type \w+ = z\.infer<typeof tokenSchema>;\n/m, '')
    .replace(new RegExp(`satisfies ${typeName}\\b`, 'g'), 'satisfies TokenInterface');

  // Ensure `TokenInterface` is imported from @definitions/tokens.
  if (!/\bTokenInterface\b.*from "@definitions\/tokens"|from "@definitions\/tokens";[\s\S]*\bTokenInterface\b/.test(out)) {
    const existing = out.match(/^import (type )?\{([^}]*)\} from "@definitions\/tokens";$/m);
    if (existing) {
      if (!new RegExp(`\\bTokenInterface\\b`).test(existing[2])) {
        out = out.replace(
          existing[0],
          `import ${existing[1] ?? ''}{${existing[2].trimEnd()}, TokenInterface } from "@definitions/tokens";`
        );
      }
    } else {
      // Insert after the first import line.
      out = out.replace(/^(import .*\n)/m, `$1import type { TokenInterface } from "@definitions/tokens";\n`);
    }
  }

  // Drop the now-unused zod import.
  if (!/\bz\./.test(out)) {
    out = out.replace(/^import \{ z \} from "zod";\n/m, '');
  }

  return out;
}

async function main(): Promise<void> {
  const schemaFiles = await glob(
    ['src/tokens/**/token-schema.ts', 'src/components/**/token-schema.ts'],
    { cwd: REPO_ROOT, absolute: true }
  );

  for (const schemaPath of schemaFiles) {
    const rel = path.relative(REPO_ROOT, schemaPath);
    if (KEEP.has(rel)) continue;

    const tokensPath = path.join(path.dirname(schemaPath), 'tokens.ts');
    if (!(await fs.pathExists(tokensPath))) {
      unhandled.push(`${rel} (no sibling tokens.ts)`);
      continue;
    }

    const before = await fs.readFile(tokensPath, 'utf8');
    const after = rewriteTokensFile(before);
    if (after === null) {
      unhandled.push(`${rel} (tokens.ts did not match the expected schema-type pattern)`);
      continue;
    }

    await fs.writeFile(tokensPath, after);
    await fs.remove(schemaPath);
    deleted++;
  }

  console.log(`codemod-3-consolidate-schemas: consolidated ${deleted} module(s).`);
  if (unhandled.length) {
    console.log(`Left for manual review (${unhandled.length}):`);
    for (const u of unhandled) console.log(`  - ${u}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
