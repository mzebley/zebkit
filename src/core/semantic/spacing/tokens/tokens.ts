import type { LayerName } from "@definitions/layers";
import { z } from "zod";
import { tokenSchema } from "./token-schema";

export const key = "spacing";
export const layer: LayerName = "base";
export type SemanticSpacingTokens = z.infer<typeof tokenSchema>;

const tokens = {
  "2xs": {
    value: `{spacing.2px}`,
    type: "spacing",
    description: "Smallest semantic spacing value.",
  },
  xs: {
    value: `{spacing.025}`,
    type: "spacing",
    description: "Second smallest semantic spacing value.",
  },
  sm: {
    value: `{spacing.05}`,
    type: "spacing",
    description: "Third smallest semantic spacing value.",
  },
  md: {
    value: `{spacing.1}`,
    type: "spacing",
    description: "Base semantic spacing value.",
  },
  lg: {
    value: `{spacing.2}`,
    type: "spacing",
    description: "Large semantic spacing value.",
  },
  xl: {
    value: `{spacing.3}`,
    type: "spacing",
    description: "Third largest semantic spacing value.",
  },
  "2xl": {
    value: `{spacing.5}`,
    type: "spacing",
    description: "Second largest semantic spacing value.",
  },
  "3xl": {
    value: `{spacing.10}`,
    type: "spacing",
    description: "Largest semantic spacing value.",
  },
  card: {
    value: `{spacing.15}`,
    type: "sizing",
    description: "Size of a basic card.",
  },
  mobile: {
    value: `{spacing.25}`,
    type: "sizing",
    description: "Size of a small mobile device.",
  },
  "mobile-lg": {
    value: `{spacing.30}`,
    type: "sizing",
    description: "Size of a larger mobile device.",
  },
  tablet: {
    value: `{spacing.40}`,
    type: "sizing",
    description: "Size of a tablet device.",
  },
  "tablet-lg": {
    value: `{spacing.60}`,
    type: "sizing",
    description: "Size of a larger tablet device.",
  },
  desktop: {
    value: `{spacing.70}`,
    type: "sizing",
    description: "Size of a small desktop device.",
  },
  "desktop-lg": {
    value: `{spacing.80}`,
    type: "sizing",
    description: "Size of a larger desktop device.",
  },
  widescreen: {
    value: `{spacing.90}`,
    type: "sizing",
    description: "Size of a large desktop device.",
  },
  section: {
    value: `{spacing.50}`,
    type: "sizing",
    description: "Ideal max size of a page section.",
  },
  "section-margin-block": {
    value: `{spacing.2}`,
    type: "spacing",
    description: "Preferred vertical margin for page sections.",
  },
  "section-margin-inline": {
    value: `{spacing.0}`,
    type: "spacing",
    description: "Preferred horizontal margin for page sections.",
  },
  aside: {
    value: `{spacing.15}`,
    type: "sizing",
    description: "Preferred size for an aside element.",
  },
  "page-padding-block": {
    value: `{spacing.1}`,
    type: "spacing",
    description: "Preferred vertical padding for page.",
  },
  "page-padding-inline": {
    value: `{spacing.105}`,
    type: "spacing",
    description: "Preferred horizontal padding for page.",
  },
} as const satisfies SemanticSpacingTokens;

export default tokens;
