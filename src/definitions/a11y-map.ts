import { ZEBKIT_PREFIX } from "@config";

/**
 * Default accessibility modifiers keyed by token type.
 * Tokens can opt into these with `a11y: true` or reference custom modifiers.
 */
export const a11yMap: { [key: string]: string } = {
  spacing: `--${ZEBKIT_PREFIX}-a11y-spacing-modifier`,
  lineHeight: `--${ZEBKIT_PREFIX}-a11y-line-height-modifier`,
  letterSpacing: `--${ZEBKIT_PREFIX}-a11y-letter-spacing-modifier`,
  fontSize: `--${ZEBKIT_PREFIX}-a11y-fallback-font-size-modifier`,
  transition: `--${ZEBKIT_PREFIX}-a11y-transition-duration-modifier`
};
