import { AllowedTokenTypes } from '@definitions/tokens';

/**
 * Semantic aliases that map friendly token names to underlying token types.
 * These help keep overrides readable while still validating compatibility.
 */
export const tokenAliasMap: {
  [key: string]: AllowedTokenTypes | { [key: string]: AllowedTokenTypes };
} = {
  primary: 'color',
  secondary: 'color',
  accent: 'color',
  'accent-cool': 'color',
  'accent-warm': 'color',
  base: 'color',
  error: 'color',
  success: 'color',
  warning: 'color',
  info: 'color',
  disabled: 'color',
  transparent: 'color',
  white: 'color',
  black: 'color',
  surface: 'color',
  inverse: 'color',
  action: 'color',
  highlight: 'color',
  text: 'color',
  overlay: 'color',
  color: {
    transparent: 'color',
  },
  measure: {
    smaller: 'sizing',
    small: 'sizing',
    base: 'sizing',
    large: 'sizing',
    larger: 'sizing',
    largest: 'sizing',
  },
  body: {
    ink: 'color',
    background: 'color',
    size: 'fontSize',
    family: 'fontFamily',
    weight: 'fontWeight',
    'line-height': 'lineHeight',
    'letter-spacing': 'letterSpacing',
    measure: 'dimension',
    'paragraph-spacing': 'spacing',
    'list-spacing': 'spacing',
  },
  display: {
    size: 'fontSize',
    family: 'fontFamily',
    weight: 'fontWeight',
    'line-height': 'lineHeight',
    'letter-spacing': 'letterSpacing',
    measure: 'dimension',
    'paragraph-spacing': 'spacing',
    'list-spacing': 'spacing',
    'text-transform': 'textTransform',
  },
  h1: {
    size: 'fontSize',
    family: 'fontFamily',
    weight: 'fontWeight',
    'line-height': 'lineHeight',
    'letter-spacing': 'letterSpacing',
    measure: 'dimension',
    'paragraph-spacing': 'spacing',
    'list-spacing': 'spacing',
  },
  h2: {
    size: 'fontSize',
    family: 'fontFamily',
    weight: 'fontWeight',
    'line-height': 'lineHeight',
    'letter-spacing': 'letterSpacing',
    measure: 'dimension',
    'paragraph-spacing': 'spacing',
    'list-spacing': 'spacing',
  },
  h3: {
    size: 'fontSize',
    family: 'fontFamily',
    weight: 'fontWeight',
    'line-height': 'lineHeight',
    'letter-spacing': 'letterSpacing',
    measure: 'dimension',
    'paragraph-spacing': 'spacing',
    'list-spacing': 'spacing',
  },
  h4: {
    size: 'fontSize',
    family: 'fontFamily',
    weight: 'fontWeight',
    'line-height': 'lineHeight',
    'letter-spacing': 'letterSpacing',
    measure: 'dimension',
    'paragraph-spacing': 'spacing',
    'list-spacing': 'spacing',
  },
  h5: {
    size: 'fontSize',
    family: 'fontFamily',
    weight: 'fontWeight',
    'line-height': 'lineHeight',
    'letter-spacing': 'letterSpacing',
    measure: 'dimension',
    'paragraph-spacing': 'spacing',
    'list-spacing': 'spacing',
  },
  h6: {
    size: 'fontSize',
    family: 'fontFamily',
    weight: 'fontWeight',
    'line-height': 'lineHeight',
    'letter-spacing': 'letterSpacing',
    measure: 'dimension',
    'paragraph-spacing': 'spacing',
    'list-spacing': 'spacing',
    'text-transform': 'textTransform',
  },
};

/**
 * Token types that can be safely referenced from one another.
 */
export const tokenCompatibilityMap: {
  [key in AllowedTokenTypes]: AllowedTokenTypes[];
} = {
  color: ['color', 'borderColor'],
  fontFamily: ['fontFamily'],
  fontSize: ['fontSize', 'rootFontSize'],
  rootFontSize: ['rootFontSize'],
  lineHeight: [
    'lineHeight',
    'dimension',
    'spacing',
    'sizing',
    'rootSize',
    'fontSize',
    'rootFontSize',
  ],
  letterSpacing: ['letterSpacing'],
  fontWeight: ['fontWeight'],
  textDecoration: ['textDecoration'],
  textTransform: ['textTransform'],
  textAlignment: ['textAlignment'],
  sizing: ['sizing', 'dimension', 'spacing', 'rootSize'],
  spacing: ['spacing', 'dimension', 'sizing', 'rootSize'],
  dimension: ['dimension', 'spacing', 'sizing', 'rootSize'],
  rootSize: ['rootSize'],
  display: ['display'],
  borderRadius: ['borderRadius', 'sizing', 'dimension', 'spacing', 'rootSize'],
  borderWidth: ['borderWidth', 'sizing', 'dimension', 'spacing', 'rootSize'],
  borderColor: ['borderColor', 'color'],
  borderStyle: ['borderStyle'],
  utility: ['utility', 'boolean'],
  zIndex: ['zIndex'],
  asset: ['asset'],
  opacity: ['opacity'],
  content: ['content'],
  boolean: ['boolean'],
  boxShadow: ['boxShadow'],
  flex: ['flex'],
  setting: ['setting'],
  transition: ['transition']
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
