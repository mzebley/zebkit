/**
 * @jest-environment node
 */
import type { TokenInterface } from '@definitions/tokens';
import {
  buildCssVariableReferenceLookup,
  buildTokenReferenceLookup,
  buildTokenReferenceGraph,
  findTokenReferenceCycles,
  isCompatibleReference,
  parseCssVariableReference,
  parseTokenReference,
  tokenReferenceToCssVariable,
  tokenReferenceToInternalId,
  tokenReferenceToLookupId,
  resolveTokenReferenceLookupId,
  serializeTokenValueWithReferences,
} from './token-references';

describe('token reference registry', () => {
  it('keeps canonical and normalized CSS fallback types reference-compatible', () => {
    expect(isCompatibleReference('dimension', 'cssDimension')).toBe(true);
    expect(isCompatibleReference('cssDimension', 'dimension')).toBe(true);
    expect(isCompatibleReference('dimension', 'cssColor')).toBe(false);
  });

  it('preserves terminal $root publicly and maps it to literal root internally', () => {
    expect(parseTokenReference('{color.accent.$root}')).toBe('color.accent.$root');
    expect(parseTokenReference('{color.$root.accent}')).toBeUndefined();
    expect(tokenReferenceToLookupId('color.accent.$root')).toBe('color.accent-root');
    expect(tokenReferenceToInternalId('color.accent.$root')).toBe('zbk-color.accent-root');
    expect(tokenReferenceToCssVariable('color.accent.$root', 'zbk')).toBe('--zbk-color-accent-root');
  });

  it('accepts the full DTCG name grammar until CSS projection', () => {
    expect(parseTokenReference('{standalone}')).toBe('standalone');
    expect(parseTokenReference('{brand colors.acid green}')).toBe('brand colors.acid green');
    expect(parseTokenReference('{brand.$private}')).toBeUndefined();
    expect(parseTokenReference('{brand.acid.green}')).toBe('brand.acid.green');

    expect(() => tokenReferenceToCssVariable('brand colors.acid green', 'zbk')).toThrow(
      "Token reference '{brand colors.acid green}' is valid DTCG, but segment 'brand colors' " +
        "cannot be projected to a Zebkit CSS custom property. Use lowercase kebab-case such as 'brand-colors'."
    );
  });

  it('gives known document-root modules precedence over colliding local nested aliases', () => {
    const lookup = new Map<string, unknown>([
      ['theme.base', {}],
      ['theme.group-token', {}],
      ['group.token', {}],
    ]);
    expect(resolveTokenReferenceLookupId('base', lookup, 'theme')).toBe('theme.base');
    expect(resolveTokenReferenceLookupId('group.token', lookup, 'theme')).toBe('group.token');
    expect(
      resolveTokenReferenceLookupId(
        'nested.token',
        new Map([['theme.nested-token', {}]]),
        'theme'
      )
    ).toBe('theme.nested-token');
    expect(resolveTokenReferenceLookupId('group.token', new Map([['group.token', {}]]), 'theme')).toBe(
      'group.token'
    );
  });

  it('qualifies local composite aliases when projecting them to CSS variables', () => {
    const tokens = {
      'zbk-shadow': {
        base: {
          $type: 'shadow',
          $value: [],
          $description: 'Base.',
        },
        focus: {
          $type: 'shadow',
          $value: ['{base}'],
          $description: 'Focus.',
        },
      },
    } as unknown as Record<string, TokenInterface>;
    expect(
      serializeTokenValueWithReferences(tokens['zbk-shadow'].focus.$value, 'shadow', {
        referenceLookup: buildTokenReferenceLookup(tokens),
        moduleId: 'shadow',
      })
    ).toBe('var(--zbk-shadow-base)');
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
