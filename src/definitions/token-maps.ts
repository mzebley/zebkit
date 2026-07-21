import { AllowedTokenTypes } from "@definitions/tokens";

/**
 * Token types that can be safely referenced from one another.
 */
export const tokenCompatibilityMap: {
  [key in AllowedTokenTypes]: AllowedTokenTypes[];
} = {
  color: ["color"],
  fontFamily: ["fontFamily"],
  fontWeight: ["fontWeight"],
  textDecoration: ["textDecoration"],
  textTransform: ["textTransform"],
  fontStyle: ["fontStyle"],
  textAlignment: ["textAlignment"],
  // The dimension family: structured px/rem (`dimension`) and every other CSS
  // length surface (`cssDimension`) reference each other freely — a semantic
  // alias resolves through the fluid-scale resolvers, whose emitted values are
  // clamp()/calc() strings regardless of which side authored the floor.
  dimension: ["dimension", "cssDimension"],
  cssDimension: ["cssDimension", "dimension"],
  display: ["display"],
  cursor: ["cursor"],
  transform: ["transform"],
  // The numbers family (Phase 2e): opacity, z-index, and line-height are all the
  // spec `number` type and reference one another as unitless numbers. (The lone
  // `z-index: auto` keyword is a `cssDimension` per D4, but nothing references
  // it, so `number` stays tight.)
  number: ["number"],
  strokeStyle: ["strokeStyle"],
  utility: ["utility", "boolean"],
  asset: ["asset"],
  content: ["content"],
  boolean: ["boolean"],
  shadow: ["shadow"],
  flex: ["flex"],
  // The transition split (Phase 2d). A timing-function slot accepts either a
  // keyword easing or a `cubicBezier` curve reference, so the two are mutually
  // compatible; durations and property lists stand alone.
  duration: ["duration"],
  cubicBezier: ["cubicBezier", "transitionTimingFunction"],
  transitionProperty: ["transitionProperty"],
  transitionTimingFunction: ["transitionTimingFunction", "cubicBezier"]
};

/**
 * Checks if two token types can be linked together (e.g., via dot notation).
 */
export function areTokensTypesCompatible(
  type1: AllowedTokenTypes,
  type2: AllowedTokenTypes
): boolean {
  const group1 = tokenCompatibilityMap[type1] || [];
  const group2 = tokenCompatibilityMap[type2] || [];
  return group1.some((type) => group2.includes(type));
}
