/**
 * @jest-environment jsdom
 */
import { ZbkInput, defineZbkInput } from './index';
import { inputVariants } from './variants/index';

defineZbkInput();

async function mount(markup: string): Promise<ZbkInput> {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = markup;
  document.body.appendChild(wrapper);
  const el = wrapper.querySelector('zbk-input') as ZbkInput;
  await el.updateComplete;
  return el;
}

const inputOf = (el: ZbkInput): HTMLInputElement =>
  el.querySelector('input') as HTMLInputElement;

/** Simulate the user replacing the field's content with `text`. */
async function type(el: ZbkInput, text: string): Promise<void> {
  const input = inputOf(el);
  input.value = text;
  input.setSelectionRange(text.length, text.length);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  await el.updateComplete;
}

describe('ZbkInput', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    document.body.innerHTML = '';
    warnSpy.mockRestore();
  });

  describe('skeleton', () => {
    it('renders a label carrying the base class around a native input', async () => {
      const el = await mount('<zbk-input>Email</zbk-input>');
      const label = el.querySelector('label')!;
      expect(label.classList.contains('zbk-input')).toBe(true);
      const input = inputOf(el);
      expect(input.type).toBe('text');
      expect(input.classList.contains('zbk-input__input')).toBe(true);
      expect(input.closest('.zbk-input__field')).not.toBeNull();
    });

    it('adopts default children as the visible label', async () => {
      const el = await mount('<zbk-input>Email address</zbk-input>');
      expect(el.querySelector('.zbk-input__label')!.textContent).toContain(
        'Email address'
      );
    });

    it('renders no label span without label content', async () => {
      const el = await mount('<zbk-input aria-label="Email"></zbk-input>');
      expect(el.querySelector('.zbk-input__label')).toBeNull();
    });

    it('forwards native semantics to the input', async () => {
      const el = await mount(
        '<zbk-input type="email" name="email" placeholder="you@example.com" required autocomplete="email" maxlength="64">Email</zbk-input>'
      );
      const input = inputOf(el);
      expect(input.type).toBe('email');
      expect(input.name).toBe('email');
      expect(input.placeholder).toBe('you@example.com');
      expect(input.required).toBe(true);
      expect(input.getAttribute('autocomplete')).toBe('email');
      expect(input.maxLength).toBe(64);
    });

    it('forwards readonly and disabled', async () => {
      const el = await mount('<zbk-input readonly disabled>Locked</zbk-input>');
      const input = inputOf(el);
      expect(input.readOnly).toBe(true);
      expect(input.disabled).toBe(true);
    });
  });

  describe('affix slots', () => {
    it('adopts slot="prefix" content into an aria-hidden affix before the input', async () => {
      const el = await mount(
        '<zbk-input><svg slot="prefix"></svg>Search</zbk-input>'
      );
      const affix = el.querySelector('.zbk-input__affix--prefix')!;
      expect(affix.getAttribute('aria-hidden')).toBe('true');
      expect(affix.querySelector('svg')).not.toBeNull();
      expect(affix.nextElementSibling).toBe(inputOf(el));
    });

    it('adopts slot="suffix" content into an affix after the input', async () => {
      const el = await mount(
        '<zbk-input><i class="ti ti-eye" slot="suffix"></i>Password</zbk-input>'
      );
      const affix = el.querySelector('.zbk-input__affix--suffix')!;
      expect(affix.querySelector('.ti-eye')).not.toBeNull();
      expect(affix.previousElementSibling).toBe(inputOf(el));
    });

    it('renders no affix wrappers without slotted content', async () => {
      const el = await mount('<zbk-input>Plain</zbk-input>');
      expect(el.querySelector('.zbk-input__affix')).toBeNull();
    });

    it('keeps affix content out of the accessible name check', async () => {
      await mount('<zbk-input><svg slot="prefix"></svg></zbk-input>');
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('No accessible name')
      );
    });
  });

  describe('value', () => {
    it('applies the value attribute to the input', async () => {
      const el = await mount('<zbk-input value="hello">Field</zbk-input>');
      expect(inputOf(el).value).toBe('hello');
      expect(el.value).toBe('hello');
    });

    it('syncs the element from typing and lets the native input event bubble', async () => {
      const el = await mount('<zbk-input>Field</zbk-input>');
      const seen: Event[] = [];
      el.parentElement!.addEventListener('input', (event) => seen.push(event));

      await type(el, 'zebra');
      expect(el.value).toBe('zebra');
      expect(seen).toHaveLength(1);
      // The one spelling: the input's own event, not a re-dispatched custom one.
      expect(seen[0].target).toBe(inputOf(el));
    });
  });

  describe('masking', () => {
    it('masks the initial value', async () => {
      const el = await mount(
        '<zbk-input mask="(###) ###-####" value="5551234567">Phone</zbk-input>'
      );
      expect(el.value).toBe('(555) 123-4567');
      expect(inputOf(el).value).toBe('(555) 123-4567');
    });

    it('formats as the user types, inserting literals automatically', async () => {
      const el = await mount('<zbk-input mask="(###) ###-####">Phone</zbk-input>');
      await type(el, '555');
      expect(inputOf(el).value).toBe('(555');
      await type(el, '(5551234');
      expect(inputOf(el).value).toBe('(555) 123-4');
    });

    it('drops characters no slot accepts and caps at the mask length', async () => {
      const el = await mount('<zbk-input mask="####">PIN</zbk-input>');
      await type(el, '12ab34567');
      expect(inputOf(el).value).toBe('1234');
    });

    it('honors slot classes: letters for a, either for *', async () => {
      const el = await mount('<zbk-input mask="aa-**">Code</zbk-input>');
      await type(el, 'ab1c');
      expect(inputOf(el).value).toBe('ab-1c');
    });

    it('treats escaped token characters as literals', async () => {
      const el = await mount('<zbk-input mask="\\###">Ref</zbk-input>');
      await type(el, '42');
      expect(inputOf(el).value).toBe('#42');
    });

    it('exposes rawValue with the mask literals stripped', async () => {
      const el = await mount(
        '<zbk-input mask="(###) ###-####" value="5551234567">Phone</zbk-input>'
      );
      expect(el.rawValue).toBe('5551234567');
    });

    it('re-masks programmatic value changes', async () => {
      const el = await mount('<zbk-input mask="##/##">Expiry</zbk-input>');
      el.value = '1226';
      await el.updateComplete;
      expect(el.value).toBe('12/26');
      expect(inputOf(el).value).toBe('12/26');
    });

    it('defaults inputmode to numeric for all-digit masks', async () => {
      const el = await mount('<zbk-input mask="###-##">Zip</zbk-input>');
      expect(inputOf(el).getAttribute('inputmode')).toBe('numeric');
    });

    it('lets an authored inputmode win over the mask default', async () => {
      const el = await mount(
        '<zbk-input mask="####" inputmode="decimal">Amount</zbk-input>'
      );
      expect(inputOf(el).getAttribute('inputmode')).toBe('decimal');
    });

    it('sets no inputmode for mixed masks or unmasked fields', async () => {
      const mixed = await mount('<zbk-input mask="aa##">Code</zbk-input>');
      expect(inputOf(mixed).hasAttribute('inputmode')).toBe(false);
      const plain = await mount('<zbk-input>Plain</zbk-input>');
      expect(inputOf(plain).hasAttribute('inputmode')).toBe(false);
    });

    it('reformats after deletions (backspace works on literals)', async () => {
      const el = await mount('<zbk-input mask="(###) ###-####">Phone</zbk-input>');
      await type(el, '(555) 123');
      await type(el, '(555) 12');
      expect(inputOf(el).value).toBe('(555) 12');
    });
  });

  describe('accessibility', () => {
    it('relocates aria-* from the host to the input', async () => {
      const el = await mount(
        '<zbk-input aria-describedby="hint">Email</zbk-input>'
      );
      expect(el.hasAttribute('aria-describedby')).toBe(false);
      expect(inputOf(el).getAttribute('aria-describedby')).toBe('hint');
    });

    it('forwards focus() to the input', async () => {
      const el = await mount('<zbk-input>Email</zbk-input>');
      el.focus();
      expect(document.activeElement).toBe(inputOf(el));
    });

    it('warns when there is no accessible name, naming the fix', async () => {
      await mount('<zbk-input></zbk-input>');
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('No accessible name')
      );
    });

    it('does not treat a placeholder as an accessible name', async () => {
      await mount('<zbk-input placeholder="Search"></zbk-input>');
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('No accessible name')
      );
    });

    it('does not warn when label text is provided', async () => {
      await mount('<zbk-input>Email</zbk-input>');
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('accepts aria-label in place of label text', async () => {
      await mount('<zbk-input aria-label="Email"></zbk-input>');
      expect(warnSpy).not.toHaveBeenCalled();
    });
  });

  describe('variants', () => {
    it('ships sm and lg on the size axis', () => {
      expect(inputVariants.map((v) => v.name)).toEqual(['sm', 'lg']);
      expect(new Set(inputVariants.map((v) => v.axis))).toEqual(
        new Set(['size'])
      );
    });

    it('reflects variant into a modifier class on the label', async () => {
      const el = await mount('<zbk-input variant="sm">Email</zbk-input>');
      expect(el.querySelector('label')!.classList.contains('zbk-input--sm')).toBe(
        true
      );
    });

    it('warns on an unknown variant, naming the registered vocabulary', async () => {
      await mount('<zbk-input variant="tiny">Email</zbk-input>');
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unknown variant "tiny"')
      );
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('sm, lg'));
    });
  });
});
