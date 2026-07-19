import { AllowedTokenTypes } from "@definitions/tokens";

/**
 * Semantic aliases that map friendly token names to underlying token types.
 * These help keep overrides readable while still validating compatibility.
 * This also allows us to reference primitives as if they were tokens (IE,font-weight.bold, tracking.tighter) even though their values are hardcoded to the css and can't be changed by token updates
 */
export const tokenAliasMap: {
  [key: string]: AllowedTokenTypes | { [key: string]: AllowedTokenTypes };
} = {
  "font-weight": {
    thin: "fontWeight",
    extralight: "fontWeight",
    light: "fontWeight",
    normal: "fontWeight",
    medium: "fontWeight",
    semibold: "fontWeight",
    bold: "fontWeight",
    extrabold: "fontWeight",
    black: "fontWeight",
  },
  // Tracking vars are hand-written CSS (em-based) — a length surface the spec
  // `dimension` type cannot represent, so referencing entries type `cssDimension`.
  tracking: {
    tighter: "cssDimension",
    tight: "cssDimension",
    normal: "cssDimension",
    wide: "cssDimension",
    wider: "cssDimension",
  },
  // Shadowed by the real letter-spacing module (structured px/rem tokens);
  // kept aligned with its collapsed type for the fallback path.
  "letter-spacing": {
    tighter: "dimension",
    tight: "dimension",
    normal: "dimension",
    wide: "dimension",
    wider: "dimension",
  },
};

/**
 * Token types that can be safely referenced from one another.
 */
export const tokenCompatibilityMap: {
  [key in AllowedTokenTypes]: AllowedTokenTypes[];
} = {
  color: ["color"],
  fontFamily: ["fontFamily"],
  lineHeight: ["lineHeight", "dimension", "cssDimension"],
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
  borderStyle: ["borderStyle"],
  utility: ["utility", "boolean"],
  zIndex: ["zIndex"],
  asset: ["asset"],
  opacity: ["opacity"],
  content: ["content"],
  boolean: ["boolean"],
  boxShadow: ["boxShadow"],
  flex: ["flex"],
  transition: ["transition"]
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
