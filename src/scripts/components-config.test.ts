/**
 * @jest-environment node
 */

import { resolveComponentsFilter, warnUnknownComponents } from './components-config';

describe('components config resolution', () => {
  it('resolves exclusions and variant allowlists', () => {
    const filter = resolveComponentsFilter({
      tooltip: false,
      button: { variants: ['Ghost', 'lg'] },
      checkbox: true,
    });

    expect(filter.excluded.has('tooltip')).toBe(true);
    expect(filter.excluded.has('checkbox')).toBe(false);
    expect(filter.variantAllowlists.get('button')).toEqual(new Set(['ghost', 'lg']));
    expect(filter.variantAllowlists.has('checkbox')).toBe(false);
  });

  it('treats an absent or empty config as include-everything', () => {
    for (const config of [undefined, {}]) {
      const filter = resolveComponentsFilter(config);
      expect(filter.excluded.size).toBe(0);
      expect(filter.variantAllowlists.size).toBe(0);
    }
  });

  it('an empty variants array keeps the component but drops all shipped variants', () => {
    const filter = resolveComponentsFilter({ button: { variants: [] } });
    expect(filter.excluded.has('button')).toBe(false);
    expect(filter.variantAllowlists.get('button')?.size).toBe(0);
  });

  it('warns with the vocabulary for unknown component names', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    warnUnknownComponents({ accordion: false, button: true }, ['button', 'tooltip']);

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toContain('unknown component "accordion"');
    expect(warnSpy.mock.calls[0][0]).toContain('button, tooltip');
    warnSpy.mockRestore();
  });
});
