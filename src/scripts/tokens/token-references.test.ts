/**
 * @jest-environment node
 */
import type { TokenInterface } from '@definitions/tokens';
import {
  buildCssVariableReferenceLookup,
  buildTokenReferenceGraph,
  findTokenReferenceCycles,
  parseCssVariableReference,
  parseTokenReference,
  tokenReferenceToCssVariable,
  tokenReferenceToInternalId,
  tokenReferenceToLookupId,
} from './token-references';

describe('token reference registry', () => {
  it('preserves terminal $root publicly and maps it to literal root internally', () => {
    expect(parseTokenReference('{color.accent.$root}')).toBe('color.accent.$root');
    expect(parseTokenReference('{color.$root.accent}')).toBeUndefined();
    expect(tokenReferenceToLookupId('color.accent.$root')).toBe('color.accent-root');
    expect(tokenReferenceToInternalId('color.accent.$root')).toBe('zbk-color.accent-root');
    expect(tokenReferenceToCssVariable('color.accent.$root', 'zbk')).toBe('--zbk-color-accent-root');
  });

  it('uses an exact CSS-variable lookup for hyphenated module names', () => {
    const tokens = {
      'zbk-accent-primary': {
        canvas: { $type: 'color', $value: '#000', $description: 'Canvas.' },
      },
    } as unknown as Record<string, TokenInterface>;
    const lookup = buildCssVariableReferenceLookup(tokens);
    expect(parseCssVariableReference('var(--zbk-accent-primary-canvas)', lookup)).toBe(
      'accent-primary.canvas'
    );
  });

  it('rejects ambiguous flattened CSS-variable identities', () => {
    const tokens = {
      'zbk-accent-primary': {
        canvas: { $type: 'color', $value: '#000', $description: 'Canvas.' },
      },
      'zbk-accent': {
        'primary-canvas': { $type: 'color', $value: '#fff', $description: 'Other.' },
      },
    } as unknown as Record<string, TokenInterface>;
    expect(() => buildCssVariableReferenceLookup(tokens)).toThrow(
      /ambiguous between token references 'accent-primary\.canvas' and 'accent\.primary-canvas'/
    );
  });

  it('finds deterministic cycles through whole shadow-array references', () => {
    const tokens = {
      'zbk-shadow': {
        one: { $type: 'shadow', $value: ['{shadow.two}'], $description: 'One.' },
        two: { $type: 'shadow', $value: '{shadow.one}', $description: 'Two.' },
      },
    } as unknown as Record<string, TokenInterface>;
    expect(findTokenReferenceCycles(buildTokenReferenceGraph(tokens))).toEqual([
      ['shadow.one', 'shadow.two', 'shadow.one'],
    ]);
  });
});
