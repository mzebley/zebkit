import { ZEBKIT_PREFIX } from "@config";

/**
 * Default accessibility modifiers keyed by token type. Tokens opt in with
 * `a11y: true` (this map) or name a custom modifier variable directly.
 *
 * Only the families still awaiting their Phase 2 migration key by type. The
 * collapsed dimension family (Phase 2a step 4) carries explicit modifier vars
 * where the wrap applies (letter-spacing entries), and the fluid-scale
 * resolvers bake the spacing/font-size modifiers in — one `$type` no longer
 * identifies which modifier a dimension token means.
 */
export const a11yMap: { [key: string]: string } = {
  lineHeight: `--${ZEBKIT_PREFIX}-a11y-line-height-modifier`,
  transition: `--${ZEBKIT_PREFIX}-a11y-transition-duration-modifier`
};
