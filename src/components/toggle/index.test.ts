/**
 * @jest-environment jsdom
 */
import { ZbkToggle, defineZbkToggle } from './index';
import { toggleVariants } from './variants/index';

defineZbkToggle();

async function mount(markup: string): Promise<ZbkToggle> {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = markup;
  document.body.appendChild(wrapper);
  const el = wrapper.querySelector('zbk-toggle') as ZbkToggle;
  await el.updateComplete;
  return el;
}

const inputOf = (el: ZbkToggle): HTMLInputElement =>
  el.querySelector('input') as HTMLInputElement;

describe('ZbkToggle', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    document.body.innerHTML = '';
    warnSpy.mockRestore();
  });

  describe('skeleton', () => {
    it('renders a label carrying the base class around a native checkbox with role="switch"', async () => {
      const el = await mount('<zbk-toggle>Email me</zbk-toggle>');
      const label = el.querySelector('label')!;
      expect(label.classList.contains('zbk-toggle')).toBe(true);
      const input = inputOf(el);
      expect(input.type).toBe('checkbox');
      expect(input.getAttribute('role')).toBe('switch');
      expect(input.classList.contains('zbk-toggle__input')).toBe(true);
    });

    it('renders an aria-hidden track and the adopted label content', async () => {
      const el = await mount('<zbk-toggle>Email me</zbk-toggle>');
      const track = el.querySelector('.zbk-toggle__track')!;
      expect(track.getAttribute('aria-hidden')).toBe('true');
      expect(el.querySelector('.zbk-toggle__label')!.textContent).toContain(
        'Email me'
      );
    });

    it('forwards name, value, and required to the input', async () => {
      const el = await mount(
        '<zbk-toggle name="notify" value="email" required>Email me</zbk-toggle>'
      );
      const input = inputOf(el);
      expect(input.name).toBe('notify');
      expect(input.value).toBe('email');
      expect(input.required).toBe(true);
    });
  });

  describe('state', () => {
    it('applies the checked attribute to the input', async () => {
      const el = await mount('<zbk-toggle checked>Email me</zbk-toggle>');
      expect(inputOf(el).checked).toBe(true);
      expect(el.checked).toBe(true);
    });

    it('syncs the element from user toggles and lets the native change bubble', async () => {
      const el = await mount('<zbk-toggle>Email me</zbk-toggle>');
      const seen: Event[] = [];
      el.parentElement!.addEventListener('change', (event) => seen.push(event));

      inputOf(el).click();
      expect(el.checked).toBe(true);
      expect(seen).toHaveLength(1);
      // The one spelling: the input's own event, not a re-dispatched custom one.
      expect(seen[0].target).toBe(inputOf(el));
    });

    it('reflects programmatic checked changes into the input without firing change', async () => {
      const el = await mount('<zbk-toggle>Email me</zbk-toggle>');
      const seen: Event[] = [];
      el.addEventListener('change', (event) => seen.push(event));

      el.checked = true;
      await el.updateComplete;
      expect(inputOf(el).checked).toBe(true);
      expect(seen).toHaveLength(0);
    });

    it('disabled blocks interaction natively', async () => {
      const el = await mount('<zbk-toggle disabled>Email me</zbk-toggle>');
      const input = inputOf(el);
      expect(input.disabled).toBe(true);
      input.click();
      expect(el.checked).toBe(false);
    });
  });

  describe('accessibility', () => {
    it('relocates aria-* from the host to the input', async () => {
      const el = await mount(
        '<zbk-toggle aria-describedby="hint">Email me</zbk-toggle>'
      );
      expect(el.hasAttribute('aria-describedby')).toBe(false);
      expect(inputOf(el).getAttribute('aria-describedby')).toBe('hint');
    });

    it('forwards focus() to the input', async () => {
      const el = await mount('<zbk-toggle>Email me</zbk-toggle>');
      el.focus();
      expect(document.activeElement).toBe(inputOf(el));
    });

    it('warns when there is no accessible name, naming the fix', async () => {
      await mount('<zbk-toggle></zbk-toggle>');
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('No accessible name')
      );
    });

    it('does not warn when label text is provided', async () => {
      await mount('<zbk-toggle>Email me</zbk-toggle>');
      expect(warnSpy).not.toHaveBeenCalled();
    });
  });

  describe('variants', () => {
    it('ships sm and lg on the size axis', () => {
      expect(toggleVariants.map((v) => v.name)).toEqual(['sm', 'lg']);
      expect(new Set(toggleVariants.map((v) => v.axis))).toEqual(
        new Set(['size'])
      );
    });

    it('reflects variant into a modifier class on the label', async () => {
      const el = await mount('<zbk-toggle variant="sm">Email me</zbk-toggle>');
      expect(el.querySelector('label')!.classList.contains('zbk-toggle--sm')).toBe(
        true
      );
    });

    it('warns on an unknown variant, naming the registered vocabulary', async () => {
      await mount('<zbk-toggle variant="huge">Email me</zbk-toggle>');
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unknown variant "huge"')
      );
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('sm, lg'));
    });
  });
});
