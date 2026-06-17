/**
 * Canonical, industry-standard font fallback stacks keyed by generic category.
 *
 * Single source of truth, consumed in two places:
 *  - the token converter, to append a full fallback stack after a family whose token
 *    sets `fallback: "sans" | "serif" | "mono"`;
 *  - the font-family token defaults, to populate the `system-*` source tokens.
 *
 * Each stack ends in the CSS generic keyword (`sans-serif`/`serif`/`monospace`) so the
 * browser always has a final guaranteed match.
 */
export type FontFallbackCategory = "sans" | "serif" | "mono";

export const FONT_FALLBACK_STACKS: Record<FontFallbackCategory, string> = {
  sans: `ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"`,
  serif: `ui-serif, Georgia, Cambria, "Times New Roman", Times, serif`,
  mono: `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace`,
};
