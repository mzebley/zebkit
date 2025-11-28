// src/definitions/variants.ts

/**
 * Generic configuration for a single Zebkit component variant.
 * Variants lean on base tokens and optionally attach extra styling hooks.
 */
export interface VariantConfig<
  TComponent extends string = string,
  TTokenKey extends string = string
> {
  /**
   * The Zebkit component this variant applies to, e.g. "button", "field", "card".
   */
  component: TComponent;

  /**
   * Semantic name for the variant, e.g. "primary", "outline", "solid", "ghost".
   */
  name: string;

  /**
   * Optional custom class name override.
   * If omitted, the build pipeline will generate:
   *    zbk-{component}--{name}
   */
  classNameOverride?: string;

  /**
   * Map of token keys => override values.
   * Keys should match the component’s token schema.
   * Values can be literals or bracketed references (e.g. "{button.background}").
   */
  overrides: Partial<Record<TTokenKey, string>>;

  /**
   * Optional extra styling for this variant.
   *
   * - `stylesheetPaths` are one or more SCSS/CSS files that the build pipeline
   *   can import (e.g. variant-specific animations or one-off tricks).
   *
   * - `inline` are additional CSS declarations that can be emitted under
   *   the variant class selector (e.g. "text-wrap: balance;").
   *
   * Both are escape hatches – most variants should stay token-only.
   */
  styles?: {
    /**
     * One or more stylesheet paths (relative to project root or src)
     * that should be included when building Zebkit CSS.
     *
     * Example: ["src/core/button/variants/outline.styles.scss"]
     */
    stylesheetPaths?: string[];

    /**
     * Extra CSS declarations that should be emitted inside the variant’s
     * `.className` selector. Declarations only, no selector.
     *
     * Example: "text-wrap: balance; text-decoration-thickness: .08em;"
     */
    inline?: string | string[];
  };
}