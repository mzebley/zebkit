// Canonical component sizes used throughout Zebkit.
// These are the values used for:
//  - class name generation (zbk-{component}--{size})
//  - variant folder naming
//  - token keys

export const COMPONENT_SIZES = [
  "xs",
  "sm",
  "md",
  "lg",
  "xl",
] as const;

export type ComponentSize = (typeof COMPONENT_SIZES)[number];


// Human‑friendly aliases that map to canonical size values.
// These are allowed when parsing attributes or user configs.

export const COMPONENT_SIZE_ALIASES = {
  "x-small": "xs",
  "small": "sm",
  "medium": "md",
  "large": "lg",
  "x-large": "xl",
} as const;

export function normalizeComponentSize(
  value: any
): ComponentSize | undefined {
  if (COMPONENT_SIZES.includes(value)) {
    return value as ComponentSize;
  }

  if (typeof value === "string" && value in COMPONENT_SIZE_ALIASES) {
    return COMPONENT_SIZE_ALIASES[
      value as keyof typeof COMPONENT_SIZE_ALIASES
    ];
  }

  return undefined;
}

// Runtime helper for validation without normalization.

export const isComponentSize = (value: any): value is ComponentSize =>
  COMPONENT_SIZES.includes(value);
