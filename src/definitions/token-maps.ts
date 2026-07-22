import { AllowedTokenTypes } from "@definitions/tokens";

/**
 * Token types that can be safely referenced from one another.
 */
export const tokenCompatibilityMap: {
  [key in AllowedTokenTypes]: AllowedTokenTypes[];
} = {
  color: ["color", "cssColor"],
  cssColor: ["cssColor", "color"],
  fontFamily: ["fontFamily", "cssFontFamily"],
  cssFontFamily: ["cssFontFamily", "fontFamily"],
  fontWeight: ["fontWeight", "cssFontWeight"],
  cssFontWeight: ["cssFontWeight", "fontWeight"],
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
  duration: ["duration", "cssDuration"],
  cssDuration: ["cssDuration", "duration"],
  display: ["display"],
  cursor: ["cursor"],
  transform: ["transform"],
  // The numbers family covers literal numbers plus property-level CSS such as
  // `auto`, percentages, and calc()/var() expressions.
  number: ["number", "cssNumber"],
  cssNumber: ["cssNumber", "number"],
  strokeStyle: ["strokeStyle", "cssStrokeStyle"],
  cssStrokeStyle: ["cssStrokeStyle", "strokeStyle"],
  asset: ["asset"],
  content: ["content"],
  boolean: ["boolean"],
  shadow: ["shadow", "cssShadow"],
  cssShadow: ["cssShadow", "shadow"],
  flex: ["flex"],
  resize: ["resize"],
  // DTCG cubicBezier values and CSS easing functions share one destination.
  cubicBezier: ["cubicBezier", "cssEasingFunction"],
  cssEasingFunction: ["cssEasingFunction", "cubicBezier"],
  transitionProperty: ["transitionProperty"],
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
