import { ZEBKIT_PREFIX } from "@config";

/**
 * Default accessibility modifier keyed by token type, resolved when a token
 * opts in with `a11y: true`. Tokens may instead name a custom modifier variable
 * directly (`a11y: "--zbk-a11y-…-modifier"`).
 *
 * Only `duration` still keys by type. Once a family collapses to a generic spec
 * `$type` (the Phase 2a dimension family, the Phase 2e `number` family), the
 * `$type` no longer identifies which modifier a token means, so those entries
 * name their modifier variable explicitly — letter-spacing (`dimension`) and
 * line-height (`number`) both do. The fluid-scale resolvers bake the
 * spacing/font-size modifiers straight into their emitted values.
 */
export const a11yMap: { [key: string]: string } = {
  // Reduced-motion scales durations (Phase 2d retyped `transition` → `duration`);
  // easing curves and property lists are not modifier-scaled.
  duration: `--${ZEBKIT_PREFIX}-a11y-transition-duration-modifier`
};
