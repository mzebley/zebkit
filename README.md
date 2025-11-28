# zebkit

## Token Build Pipeline
- Token modules live in `src/core/**/tokens.ts` (and later `src/components/**/tokens.ts`) with matching `token-schema.ts` files.
- Shared token definitions and maps are under `src/definitions`.
- Build tokens and CSS with `npm run build:tokens` and follow the prompts to choose components, theme, output formats, and split mode.
- Theme overrides can be a single JSON file `src/themes/<name>.json` or a folder `src/themes/<name>/` containing multiple JSON override files.
- Combined mode writes one set of files per format (e.g., `<theme>-tokens.json`); per-module mode writes `zbk-<module>.tokens.<ext>` for each token module.
