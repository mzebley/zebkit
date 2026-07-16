/**
 * @jest-environment node
 */

import { inspectRegistryRegistration } from './registry-lint';

describe('component registry lint', () => {
  it('accepts both import orders when registration is complete', () => {
    const source = `
      import { defineZbkButton, ZbkButton } from './button';
      export { ZbkButton, defineZbkButton };
      export const defineZebkitComponents = () => { defineZbkButton(); };
    `;

    expect(inspectRegistryRegistration(source, 'button', 'ZbkButton', 'defineZbkButton')).toEqual({
      imported: true,
      reExported: true,
      defined: true,
    });
  });

  it('does not count a define call outside defineZebkitComponents', () => {
    const source = `
      import { ZbkButton, defineZbkButton } from './button';
      export { ZbkButton, defineZbkButton };
      export const defineZebkitComponents = () => {};
      defineZbkButton();
    `;

    expect(inspectRegistryRegistration(source, 'button', 'ZbkButton', 'defineZbkButton').defined).toBe(false);
  });

  it('does not combine names from unrelated export blocks', () => {
    const source = `
      import { ZbkButton, defineZbkButton } from './button';
      export { ZbkButton };
      export { defineZbkButton };
      export const defineZebkitComponents = () => { defineZbkButton(); };
    `;

    expect(inspectRegistryRegistration(source, 'button', 'ZbkButton', 'defineZbkButton').reExported).toBe(false);
  });
});
