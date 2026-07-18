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
  tracking: {
    tighter: "letterSpacing",
    tight: "letterSpacing",
    normal: "letterSpacing",
    wide: "letterSpacing",
    wider: "letterSpacing",
  },
  "letter-spacing": {
    tighter: "letterSpacing",
    tight: "letterSpacing",
    normal: "letterSpacing",
    wide: "letterSpacing",
    wider: "letterSpacing",
  },
};

/**
 * Token types that can be safely referenced from one another.
 */
export const tokenCompatibilityMap: {
  [key in AllowedTokenTypes]: AllowedTokenTypes[];
} = {
  color: ["color", "borderColor"],
  fontFamily: ["fontFamily"],
  fontSize: ["fontSize", "rootFontSize"],
  rootFontSize: ["rootFontSize"],
  lineHeight: [
    "lineHeight",
    "dimension",
    "spacing",
    "sizing",
    "rootSize",
    "fontSize",
    "rootFontSize",
  ],
  letterSpacing: ["letterSpacing"],
  fontWeight: ["fontWeight"],
  textDecoration: ["textDecoration"],
  textTransform: ["textTransform"],
  fontStyle: ["fontStyle"],
  textAlignment: ["textAlignment"],
  sizing: ["sizing", "dimension", "spacing", "rootSize", "fontSize"],
  spacing: ["spacing", "dimension", "sizing", "rootSize"],
  dimension: ["dimension", "spacing", "sizing", "rootSize"],
  // Non-px/rem CSS sizing values (%, ch, em, keywords, unitless 0). The compat
  // check is a symmetric intersection, so listing the length family here lets
  // those types reference cssDimension targets (and vice versa) without
  // loosening any pairing between two legacy types.
  cssDimension: [
    "cssDimension",
    "dimension",
    "sizing",
    "spacing",
    "rootSize",
    "fontSize",
    "borderRadius",
    "borderWidth",
  ],
  rootSize: ["rootSize"],
  display: ["display"],
  borderRadius: ["borderRadius", "sizing", "dimension", "spacing", "rootSize"],
  borderWidth: ["borderWidth", "sizing", "dimension", "spacing", "rootSize"],
  borderColor: ["borderColor", "color"],
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
