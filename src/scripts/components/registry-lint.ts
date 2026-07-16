export interface RegistryRegistration {
  imported: boolean;
  reExported: boolean;
  defined: boolean;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function blockHasNames(block: string, names: readonly string[]): boolean {
  const exportedNames = new Set(
    block
      .split(',')
      .map((entry) => entry.trim().split(/\s+as\s+/)[0])
      .filter(Boolean)
  );
  return names.every((name) => exportedNames.has(name));
}

function defineFunctionBody(source: string): string {
  const declaration = /\bdefineZebkitComponents\s*=\s*\(\s*\)\s*=>\s*\{/.exec(source);
  if (!declaration) return '';

  const start = declaration.index + declaration[0].length;
  let depth = 1;
  for (let index = start; index < source.length; index++) {
    if (source[index] === '{') depth++;
    if (source[index] === '}') depth--;
    if (depth === 0) return source.slice(start, index);
  }
  return '';
}

export function inspectRegistryRegistration(
  source: string,
  component: string,
  className: string,
  defineName: string
): RegistryRegistration {
  const names = [className, defineName];
  const importPattern = new RegExp(
    `import\\s*\\{([^}]*)\\}\\s*from\\s*["']\\./${escapeRegExp(component)}["']`,
    'g'
  );
  const imported = [...source.matchAll(importPattern)].some((match) =>
    blockHasNames(match[1], names)
  );
  const reExported = [...source.matchAll(/export\s*\{([\s\S]*?)\}/g)].some((match) =>
    blockHasNames(match[1], names)
  );
  const body = defineFunctionBody(source);
  const defined = new RegExp(`\\b${escapeRegExp(defineName)}\\s*\\(\\s*\\)`).test(body);

  return { imported, reExported, defined };
}
