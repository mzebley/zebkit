// Loads zebkit token modules (src/{core,components}/**/tokens/tokens.ts) and
// returns a map of module key -> set of token keys. Replaces the USWDS
// project's token-template-loader: lets the lint check that a family's
// tokens.group exists and that every pattern value is a real token key.

import path from "node:path";
import { pathToFileURL } from "node:url";
import { globSync } from "glob";

export async function loadTokenModules(rootDir: string): Promise<Map<string, Set<string>>> {
  const files = globSync("src/{core,components}/**/tokens/tokens.ts", { cwd: rootDir }).sort();
  const modules = new Map<string, Set<string>>();

  for (const file of files) {
    const mod = await import(pathToFileURL(path.resolve(rootDir, file)).href);
    if (typeof mod.key !== "string" || typeof mod.default !== "object") continue;
    const keys = modules.get(mod.key) ?? new Set<string>();
    for (const tokenKey of Object.keys(mod.default)) keys.add(tokenKey);
    modules.set(mod.key, keys);
  }

  return modules;
}
