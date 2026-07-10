/**
 * @jest-environment jsdom
 */
import { ZbkRadio, defineZbkRadio } from './index';
import { radioVariants } from './variants/index';

defineZbkRadio();

async function mountAll(markup: string): Promise<ZbkRadio[]> {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = markup;
  document.body.appendChild(wrapper);
  const radios = Array.from(wrapper.querySelectorAll('zbk-radio')) as ZbkRadio[];
  await Promise.all(radios.map((radio) => radio.updateComplete));
  return radios;
}

const inputOf = (el: ZbkRadio): HTMLInputElement =>
  el.querySelector('input') as HTMLInputElement;

describe('ZbkRadio', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    document.body.innerHTML = '';
    warnSpy.mockRestore();
  });

  describe('skeleton', () => {
    it('renders a label carrying the base class around a native radio', async () => {
      const [el] = await mountAll(
        '<zbk-radio name="size" value="s">Small</zbk-radio>'
      );
      const label = el.querySelector('label')!;
      expect(label.classList.contains('zbk-radio')).toBe(true);
      const input = inputOf(el);
      expect(input.type).toBe('radio');
      expect(input.name).toBe('size');
      expect(input.value).toBe('s');
    });

    it('renders an aria-hidden control and the adopted label content', async () => {
      const [el] = await mountAll(
        '<zbk-radio name="size" value="s">Small</zbk-radio>'
      );
      expect(
        el.querySelector('.zbk-radio__control')!.getAttribute('aria-hidden')
      ).toBe('true');
      expect(el.querySelector('.zbk-radio__label')!.textContent).toContain(
        'Small'
      );
    });
  });

  describe('grouping (native, by shared name)', () => {
    const group = `
      <zbk-radio name="size" value="s" checked>Small</zbk-radio>
      <zbk-radio name="size" value="m">Medium</zbk-radio>
      <zbk-radio name="other" value="x" checked>Other group</zbk-radio>
    `;

    it('selecting one radio unchecks the rest of its group, properties included', async () => {
      const [small, medium, other] = await mountAll(group);
      expect(small.checked).toBe(true);

      inputOf(medium).click();
      expect(medium.checked).toBe(true);
      expect(inputOf(small).checked).toBe(false);
      expect(small.checked).toBe(false);
      // Different name, different group — untouched.
      expect(other.checked).toBe(true);
    });

    it('lets the native change event bubble from the selected input', async () => {
      const radios = await mountAll(group);
      const seen: Event[] = [];
      const listener = (event: Event) => seen.push(event);
      document.body.addEventListener('change', listener);

      inputOf(radios[1]).click();
      expect(seen).toHaveLength(1);
      expect(seen[0].target).toBe(inputOf(radios[1]));
      document.body.removeEventListener('change', listener);
    });

    it('disabled blocks selection natively', async () => {
      const [el] = await mountAll(
        '<zbk-radio name="size" value="s" disabled>Small</zbk-radio>'
      );
      inputOf(el).click();
      expect(el.checked).toBe(false);
    });
  });

  describe('accessibility', () => {
    it('relocates aria-* from the host to the input', async () => {
      const [el] = await mountAll(
        '<zbk-radio name="size" value="s" aria-describedby="hint">Small</zbk-radio>'
      );
      expect(el.hasAttribute('aria-describedby')).toBe(false);
      expect(inputOf(el).getAttribute('aria-describedby')).toBe('hint');
    });

    it('forwards focus() to the input', async () => {
      const [el] = await mountAll(
        '<zbk-radio name="size" value="s">Small</zbk-radio>'
      );
      el.focus();
      expect(document.activeElement).toBe(inputOf(el));
    });

    it('warns when name is missing, naming the fix', async () => {
      await mountAll('<zbk-radio value="s">Small</zbk-radio>');
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('No name'));
    });

    it('warns when there is no accessible name, naming the fix', async () => {
      await mountAll('<zbk-radio name="size" value="s"></zbk-radio>');
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('No accessible name')
      );
    });

    it('does not warn when named and labeled', async () => {
      await mountAll('<zbk-radio name="size" value="s">Small</zbk-radio>');
      expect(warnSpy).not.toHaveBeenCalled();
    });
  });

  describe('state-indicator slots', () => {
    it('adopts slot="checked" content into a checked indicator over the control', async () => {
      const [el] = await mountAll(
        '<zbk-radio name="mood" value="happy"><i class="ti ti-mood-smile" slot="checked"></i>Happy</zbk-radio>'
      );
      const indicator = el.querySelector('.zbk-radio__indicator--checked')!;
      expect(indicator).not.toBeNull();
      expect(indicator.querySelector('.ti-mood-smile')).not.toBeNull();
      expect(indicator.closest('.zbk-radio__control')).not.toBeNull();
    });

    it('marks the control so the drawn dot can retire', async () => {
      const [el] = await mountAll(
        '<zbk-radio name="mood" value="s"><svg slot="checked"></svg>Sad</zbk-radio>'
      );
      const control = el.querySelector('.zbk-radio__control')!;
      expect(control.classList.contains('zbk-radio__control--slotted-checked')).toBe(true);
      expect(control.classList.contains('zbk-radio__control--slotted-unchecked')).toBe(false);
    });

    it('supports an unchecked indicator', async () => {
      const [el] = await mountAll(
        '<zbk-radio name="mood" value="s"><span slot="unchecked">·</span>Sad</zbk-radio>'
      );
      const indicator = el.querySelector('.zbk-radio__indicator--unchecked')!;
      expect(indicator.textContent).toContain('·');
    });

    it('renders no indicator wrappers without slotted content', async () => {
      const [el] = await mountAll(
        '<zbk-radio name="mood" value="s">Sad</zbk-radio>'
      );
      expect(el.querySelector('.zbk-radio__indicator')).toBeNull();
      expect(el.querySelector('.zbk-radio__control')!.className).toBe('zbk-radio__control');
    });
  });

  describe('variants', () => {
    it('ships sm and lg on the size axis', () => {
      expect(radioVariants.map((v) => v.name)).toEqual(['sm', 'lg']);
      expect(new Set(radioVariants.map((v) => v.axis))).toEqual(
        new Set(['size'])
      );
    });

    it('reflects variant into a modifier class on the label', async () => {
      const [el] = await mountAll(
        '<zbk-radio name="size" value="s" variant="lg">Small</zbk-radio>'
      );
      expect(el.querySelector('label')!.classList.contains('zbk-radio--lg')).toBe(
        true
      );
    });
  });
});
