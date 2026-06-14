/**
 * @jest-environment node
 */

import type { TokenInterface } from '@definitions/tokens';
import { convertTokensToCssVars } from './token-converter';

describe('convertTokensToCssVars — selector scoping (rootSelector)', () => {
  const tokens = {
    'zbk-app': {
      canvas: { value: '#ffffff', type: 'color', description: 'canvas' },
    },
  } as unknown as { [key: string]: TokenInterface };

  it('defaults to :root when no selector is given', () => {
    const css = convertTokensToCssVars(tokens);
    expect(css).toContain(':root {');
    expect(css).toContain('--zbk-app-canvas: #ffffff;');
  });

  it('emits variables under a custom selector when one is provided', () => {
    const css = convertTokensToCssVars(tokens, {
      selector: '[data-zbk-theme="brutalist"]',
    });
    expect(css).toContain('[data-zbk-theme="brutalist"] {');
    expect(css).toContain('--zbk-app-canvas: #ffffff;');
    // Scoped output must not leak token vars onto :root.
    expect(css).not.toContain(':root {');
  });
});
