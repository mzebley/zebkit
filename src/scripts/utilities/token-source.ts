// Loads zebkit token modules (src/{core,components}/**/tokens/tokens.ts) and
// returns a map of module key -> (token key -> token type). Replaces the USWDS
// project's token-template-loader: lets the lint check that a family's
// tokens.group exists, that every pattern value is a real token key, and
// (when tokens.types is set) that each value's declared `type` is allowed.
//
// Modules that share a `key` (e.g. core/spacing and semantic/spacing both
// export key "spacing") are merged into one group.

import path from "node:path";
import { pathToFileURL } from "node:url";
import { globSync } from "glob";

/** group key -> (token key -> token `type`, "" when a token declares none). */
export type TokenModuleMap = Map<string, Map<string, string>>;

export async function loadTokenModules(rootDir: string): Promise<TokenModuleMap> {
  const files = globSync("src/{core,components}/**/tokens/tokens.ts", { cwd: rootDir }).sort();
  const modules: TokenModuleMap = new Map();

  for (const file of files) {
    const mod = await import(pathToFileURL(path.resolve(rootDir, file)).href);
    if (typeof mod.key !== "string" || typeof mod.default !== "object") continue;
    const keys = modules.get(mod.key) ?? new Map<string, string>();
    for (const [tokenKey, token] of Object.entries(mod.default as Record<string, unknown>)) {
      const type = (token as { type?: unknown })?.type;
      keys.set(tokenKey, typeof type === "string" ? type : "");
    }
    modules.set(mod.key, keys);
  }

  return modules;
}
