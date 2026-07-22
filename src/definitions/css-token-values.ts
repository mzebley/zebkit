/** Property-level CSS text accepted by Zebkit's proprietary token types. */
export type CssTokenValueType =
  | 'cssColor'
  | 'cssDimension'
  | 'cssDuration'
  | 'cssFontFamily'
  | 'cssFontWeight'
  | 'cssEasingFunction'
  | 'cssNumber'
  | 'cssStrokeStyle'
  | 'cssShadow'
  | 'display'
  | 'cursor'
  | 'fontStyle'
  | 'textDecoration'
  | 'textTransform'
  | 'textAlignment'
  | 'transitionProperty'
  | 'transform'
  | 'asset'
  | 'content'
  | 'flex'
  | 'resize';

/**
 * Reject CSS text that cannot be one declaration value, without freezing a
 * second handwritten copy of the platform grammar. The build boundary applies
 * css-tree's real property grammar once the token's destinations are known.
 */
export function cssTokenValueError(_type: CssTokenValueType, value: string): string | undefined {
  if (value.trim() === '') return 'must not be empty';
  const stack: string[] = [];
  let quote: '"' | "'" | undefined;
  let comment = false;
  let escaped = false;

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    const next = value[index + 1];
    if (comment) {
      if (char === '*' && next === '/') {
        comment = false;
        index += 1;
      }
      continue;
    }
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = undefined;
      continue;
    }
    if (char === '/' && next === '*') {
      comment = true;
      index += 1;
    } else if (char === '"' || char === "'") quote = char;
    else if (char === '(' || char === '[') stack.push(char);
    else if (char === ')' || char === ']') {
      const expected = char === ')' ? '(' : '[';
      if (stack.pop() !== expected) return `has an unmatched '${char}'`;
    } else if (char === '{' || char === '}') return `contains '${char}', which is not valid in a CSS value`;
    else if (char === ';' && stack.length === 0) return "contains a top-level ';', which would start another declaration";
  }
  if (comment) return 'has an unclosed comment';
  if (quote) return `has an unclosed ${quote} string`;
  if (stack.length > 0) return `has an unclosed '${stack[stack.length - 1]}'`;

  const invalidVar = [...value.matchAll(/\bvar\(\s*([^,\s)]+)/g)]
    .find((match) => !match[1].startsWith('--'));
  if (invalidVar) {
    return `uses var() with '${invalidVar[1]}'; the first argument must be a --custom-property`;
  }
  return undefined;
}
