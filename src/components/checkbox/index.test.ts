/**
 * @jest-environment jsdom
 */
import { ZbkCheckbox, defineZbkCheckbox } from './index';
import { checkboxVariants } from './variants/index';

defineZbkCheckbox();

async function mount(markup: string): Promise<ZbkCheckbox> {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = markup;
  document.body.appendChild(wrapper);
  const el = wrapper.querySelector('zbk-checkbox') as ZbkCheckbox;
  await el.updateComplete;
  return el;
}

const inputOf = (el: ZbkCheckbox): HTMLInputElement =>
  el.querySelector('input') as HTMLInputElement;

describe('ZbkCheckbox', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    document.body.innerHTML = '';
    warnSpy.mockRestore();
  });

  describe('skeleton', () => {
    it('renders a label carrying the base class around a native checkbox', async () => {
      const el = await mount('<zbk-checkbox>Email me</zbk-checkbox>');
      const label = el.querySelector('label')!;
      expect(label.classList.contains('zbk-checkbox')).toBe(true);
      const input = inputOf(el);
      expect(input.type).toBe('checkbox');
      expect(input.classList.contains('zbk-checkbox__input')).toBe(true);
    });

    it('renders an aria-hidden control and the adopted label content', async () => {
      const el = await mount('<zbk-checkbox>Email me</zbk-checkbox>');
      const control = el.querySelector('.zbk-checkbox__control')!;
      expect(control.getAttribute('aria-hidden')).toBe('true');
      expect(el.querySelector('.zbk-checkbox__label')!.textContent).toContain(
        'Email me'
      );
    });

    it('forwards name, value, and required to the input', async () => {
      const el = await mount(
        '<zbk-checkbox name="terms" value="yes" required>Agree</zbk-checkbox>'
      );
      const input = inputOf(el);
      expect(input.name).toBe('terms');
      expect(input.value).toBe('yes');
      expect(input.required).toBe(true);
    });

    it('defaults value to the platform\'s "on"', async () => {
      const el = await mount('<zbk-checkbox>Agree</zbk-checkbox>');
      expect(inputOf(el).value).toBe('on');
    });
  });

  describe('state', () => {
    it('applies the checked attribute to the input', async () => {
      const el = await mount('<zbk-checkbox checked>Agree</zbk-checkbox>');
      expect(inputOf(el).checked).toBe(true);
      expect(el.checked).toBe(true);
    });

    it('syncs the element from user toggles and lets the native change bubble', async () => {
      const el = await mount('<zbk-checkbox>Agree</zbk-checkbox>');
      const seen: Event[] = [];
      el.parentElement!.addEventListener('change', (event) => seen.push(event));

      inputOf(el).click();
      expect(el.checked).toBe(true);
      expect(seen).toHaveLength(1);
      // The one spelling: the input's own event, not a re-dispatched custom one.
      expect(seen[0].target).toBe(inputOf(el));
    });

    it('reflects programmatic checked changes into the input without firing change', async () => {
      const el = await mount('<zbk-checkbox>Agree</zbk-checkbox>');
      const seen: Event[] = [];
      el.addEventListener('change', (event) => seen.push(event));

      el.checked = true;
      await el.updateComplete;
      expect(inputOf(el).checked).toBe(true);
      expect(seen).toHaveLength(0);
    });

    it('pushes indeterminate onto the input and clears it on user toggle', async () => {
      const el = await mount('<zbk-checkbox indeterminate>Agree</zbk-checkbox>');
      const input = inputOf(el);
      expect(input.indeterminate).toBe(true);

      input.click();
      expect(input.indeterminate).toBe(false);
      expect(el.indeterminate).toBe(false);
      expect(el.checked).toBe(true);
    });

    it('disabled blocks interaction natively', async () => {
      const el = await mount('<zbk-checkbox disabled>Agree</zbk-checkbox>');
      const input = inputOf(el);
      expect(input.disabled).toBe(true);
      input.click();
      expect(el.checked).toBe(false);
    });
  });

  describe('accessibility', () => {
    it('relocates aria-* from the host to the input', async () => {
      const el = await mount(
        '<zbk-checkbox aria-describedby="hint">Agree</zbk-checkbox>'
      );
      expect(el.hasAttribute('aria-describedby')).toBe(false);
      expect(inputOf(el).getAttribute('aria-describedby')).toBe('hint');
    });

    it('forwards focus() to the input', async () => {
      const el = await mount('<zbk-checkbox>Agree</zbk-checkbox>');
      el.focus();
      expect(document.activeElement).toBe(inputOf(el));
    });

    it('warns when there is no accessible name, naming the fix', async () => {
      await mount('<zbk-checkbox></zbk-checkbox>');
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('No accessible name')
      );
    });

    it('does not warn when label text is provided', async () => {
      await mount('<zbk-checkbox>Agree</zbk-checkbox>');
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('accepts aria-label in place of label text', async () => {
      await mount('<zbk-checkbox aria-label="Agree"></zbk-checkbox>');
      expect(warnSpy).not.toHaveBeenCalled();
    });
  });

  describe('state-indicator slots', () => {
    it('adopts slot="checked" content into a checked indicator over the control', async () => {
      const el = await mount(
        '<zbk-checkbox><i class="ti ti-checks" slot="checked"></i>Done</zbk-checkbox>'
      );
      const indicator = el.querySelector('.zbk-checkbox__indicator--checked')!;
      expect(indicator).not.toBeNull();
      expect(indicator.querySelector('.ti-checks')).not.toBeNull();
      expect(indicator.closest('.zbk-checkbox__control')).not.toBeNull();
    });

    it('marks the control so the drawn pseudo it replaces can retire', async () => {
      const el = await mount(
        '<zbk-checkbox><svg slot="checked"></svg><span slot="indeterminate">-</span>Done</zbk-checkbox>'
      );
      const control = el.querySelector('.zbk-checkbox__control')!;
      expect(control.classList.contains('zbk-checkbox__control--slotted-checked')).toBe(true);
      expect(
        control.classList.contains('zbk-checkbox__control--slotted-indeterminate')
      ).toBe(true);
      expect(
        control.classList.contains('zbk-checkbox__control--slotted-unchecked')
      ).toBe(false);
    });

    it('supports an unchecked indicator', async () => {
      const el = await mount(
        '<zbk-checkbox><span slot="unchecked">–</span>Done</zbk-checkbox>'
      );
      const indicator = el.querySelector('.zbk-checkbox__indicator--unchecked')!;
      expect(indicator.textContent).toContain('–');
    });

    it('renders no indicator wrappers without slotted content', async () => {
      const el = await mount('<zbk-checkbox>Done</zbk-checkbox>');
      expect(el.querySelector('.zbk-checkbox__indicator')).toBeNull();
      const control = el.querySelector('.zbk-checkbox__control')!;
      expect(control.className).toBe('zbk-checkbox__control');
    });

    it('keeps slotted indicators out of the accessible name check', async () => {
      await mount(
        '<zbk-checkbox><svg slot="checked"></svg></zbk-checkbox>'
      );
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('No accessible name')
      );
    });
  });

  describe('variants', () => {
    it('ships sm and lg on the size axis', () => {
      expect(checkboxVariants.map((v) => v.name)).toEqual(['sm', 'lg']);
      expect(new Set(checkboxVariants.map((v) => v.axis))).toEqual(
        new Set(['size'])
      );
    });

    it('reflects variant into a modifier class on the label', async () => {
      const el = await mount('<zbk-checkbox variant="sm">Agree</zbk-checkbox>');
      expect(el.querySelector('label')!.classList.contains('zbk-checkbox--sm')).toBe(
        true
      );
    });

    it('warns on an unknown variant, naming the registered vocabulary', async () => {
      await mount('<zbk-checkbox variant="tiny">Agree</zbk-checkbox>');
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unknown variant "tiny"')
      );
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('sm, lg'));
    });
  });
});
