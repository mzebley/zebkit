/**
 * @jest-environment jsdom
 */
import { ZbkSelect, defineZbkSelect } from './index';
import { selectVariants } from './variants/index';

defineZbkSelect();

async function mount(markup: string): Promise<ZbkSelect> {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = markup;
  document.body.appendChild(wrapper);
  const el = wrapper.querySelector('zbk-select') as ZbkSelect;
  await el.updateComplete;
  return el;
}

const selectOf = (el: ZbkSelect): HTMLSelectElement =>
  el.querySelector('select') as HTMLSelectElement;

describe('ZbkSelect', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    document.body.innerHTML = '';
    warnSpy.mockRestore();
  });

  describe('skeleton', () => {
    it('renders a label carrying the base class around a native select', async () => {
      const el = await mount(
        '<zbk-select>Country<option value="us">United States</option></zbk-select>'
      );
      const label = el.querySelector('label')!;
      expect(label.classList.contains('zbk-select')).toBe(true);
      const select = selectOf(el);
      expect(select.classList.contains('zbk-select__select')).toBe(true);
      expect(select.closest('.zbk-select__field')).not.toBeNull();
    });

    it('adopts option content into the select and the rest as the label', async () => {
      const el = await mount(
        `<zbk-select>
          Country
          <option value="us">United States</option>
          <optgroup label="Elsewhere"><option value="ca">Canada</option></optgroup>
        </zbk-select>`
      );
      const select = selectOf(el);
      expect(select.querySelectorAll('option')).toHaveLength(2);
      expect(select.querySelector('optgroup')).not.toBeNull();
      expect(el.querySelector('.zbk-select__label')!.textContent).toContain(
        'Country'
      );
      expect(el.querySelector('.zbk-select__label option')).toBeNull();
    });

    it('renders no label span without label content', async () => {
      const el = await mount(
        '<zbk-select aria-label="Country"><option value="us">US</option></zbk-select>'
      );
      expect(el.querySelector('.zbk-select__label')).toBeNull();
    });

    it('forwards native semantics to the select', async () => {
      const el = await mount(
        '<zbk-select name="country" required multiple size="4">Country<option value="us">US</option></zbk-select>'
      );
      const select = selectOf(el);
      expect(select.name).toBe('country');
      expect(select.required).toBe(true);
      expect(select.multiple).toBe(true);
      expect(select.size).toBe(4);
    });
  });

  describe('value', () => {
    it('selects the option matching the value attribute', async () => {
      const el = await mount(
        '<zbk-select value="ca">Country<option value="us">US</option><option value="ca">Canada</option></zbk-select>'
      );
      expect(selectOf(el).value).toBe('ca');
    });

    it('syncs the element from user selection and lets the native change bubble', async () => {
      const el = await mount(
        '<zbk-select>Country<option value="us">US</option><option value="ca">Canada</option></zbk-select>'
      );
      const seen: Event[] = [];
      el.parentElement!.addEventListener('change', (event) => seen.push(event));

      const select = selectOf(el);
      select.value = 'ca';
      select.dispatchEvent(new Event('change', { bubbles: true }));
      expect(el.value).toBe('ca');
      expect(seen).toHaveLength(1);
      // The one spelling: the select's own event, not a re-dispatched custom one.
      expect(seen[0].target).toBe(select);
    });

    it('reflects programmatic value changes into the select', async () => {
      const el = await mount(
        '<zbk-select>Country<option value="us">US</option><option value="ca">Canada</option></zbk-select>'
      );
      el.value = 'ca';
      await el.updateComplete;
      expect(selectOf(el).value).toBe('ca');
    });
  });

  describe('affix slots and indicator', () => {
    it('adopts slot="prefix" content into an aria-hidden affix before the select', async () => {
      const el = await mount(
        '<zbk-select><svg slot="prefix"></svg>Country<option value="us">US</option></zbk-select>'
      );
      const affix = el.querySelector('.zbk-select__affix--prefix')!;
      expect(affix.getAttribute('aria-hidden')).toBe('true');
      expect(affix.querySelector('svg')).not.toBeNull();
      expect(affix.nextElementSibling).toBe(selectOf(el));
    });

    it('marks the field when suffix content replaces the drawn chevron', async () => {
      const el = await mount(
        '<zbk-select><span slot="suffix">▾</span>Country<option value="us">US</option></zbk-select>'
      );
      const field = el.querySelector('.zbk-select__field')!;
      expect(field.classList.contains('zbk-select__field--slotted-suffix')).toBe(
        true
      );
      expect(el.querySelector('.zbk-select__affix--suffix')!.textContent).toContain(
        '▾'
      );
    });

    it('renders no affix wrappers or modifier without slotted content', async () => {
      const el = await mount(
        '<zbk-select>Country<option value="us">US</option></zbk-select>'
      );
      expect(el.querySelector('.zbk-select__affix')).toBeNull();
      expect(el.querySelector('.zbk-select__field')!.className).toBe(
        'zbk-select__field'
      );
    });
  });

  describe('accessibility', () => {
    it('relocates aria-* from the host to the select', async () => {
      const el = await mount(
        '<zbk-select aria-describedby="hint">Country<option value="us">US</option></zbk-select>'
      );
      expect(el.hasAttribute('aria-describedby')).toBe(false);
      expect(selectOf(el).getAttribute('aria-describedby')).toBe('hint');
    });

    it('forwards focus() to the select', async () => {
      const el = await mount(
        '<zbk-select>Country<option value="us">US</option></zbk-select>'
      );
      el.focus();
      expect(document.activeElement).toBe(selectOf(el));
    });

    it('warns when only options are provided (option text is not a name)', async () => {
      await mount('<zbk-select><option value="us">US</option></zbk-select>');
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('No accessible name')
      );
    });

    it('does not warn when label text is provided', async () => {
      await mount('<zbk-select>Country<option value="us">US</option></zbk-select>');
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('accepts aria-label in place of label text', async () => {
      await mount(
        '<zbk-select aria-label="Country"><option value="us">US</option></zbk-select>'
      );
      expect(warnSpy).not.toHaveBeenCalled();
    });
  });

  describe('variants', () => {
    it('ships sm and lg on the size axis', () => {
      expect(selectVariants.map((v) => v.name)).toEqual(['sm', 'lg']);
      expect(new Set(selectVariants.map((v) => v.axis))).toEqual(
        new Set(['size'])
      );
    });

    it('reflects variant into a modifier class on the label', async () => {
      const el = await mount(
        '<zbk-select variant="lg">Country<option value="us">US</option></zbk-select>'
      );
      expect(el.querySelector('label')!.classList.contains('zbk-select--lg')).toBe(
        true
      );
    });

    it('warns on an unknown variant, naming the registered vocabulary', async () => {
      await mount(
        '<zbk-select variant="huge">Country<option value="us">US</option></zbk-select>'
      );
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unknown variant "huge"')
      );
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('sm, lg'));
    });
  });
});
