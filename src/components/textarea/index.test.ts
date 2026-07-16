/**
 * @jest-environment jsdom
 */
import { ZbkTextarea, defineZbkTextarea } from './index';
import { textareaVariants } from './variants/index';

defineZbkTextarea();

async function mount(markup: string): Promise<ZbkTextarea> {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = markup;
  document.body.appendChild(wrapper);
  const el = wrapper.querySelector('zbk-textarea') as ZbkTextarea;
  await el.updateComplete;
  return el;
}

const textareaOf = (el: ZbkTextarea): HTMLTextAreaElement =>
  el.querySelector('textarea') as HTMLTextAreaElement;

/** Simulate the user replacing the field's content with `text`. */
async function type(el: ZbkTextarea, text: string): Promise<void> {
  const textarea = textareaOf(el);
  textarea.value = text;
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
  await el.updateComplete;
}

describe('ZbkTextarea', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    document.body.innerHTML = '';
    warnSpy.mockRestore();
  });

  describe('skeleton', () => {
    it('renders a label carrying the base class around a native textarea', async () => {
      const el = await mount('<zbk-textarea>Notes</zbk-textarea>');
      const label = el.querySelector('label')!;
      expect(label.classList.contains('zbk-textarea')).toBe(true);
      const textarea = textareaOf(el);
      expect(textarea.classList.contains('zbk-textarea__textarea')).toBe(true);
      expect(textarea.closest('.zbk-textarea__field')).not.toBeNull();
    });

    it('adopts default children as the visible label', async () => {
      const el = await mount('<zbk-textarea>Additional notes</zbk-textarea>');
      expect(el.querySelector('.zbk-textarea__label')!.textContent).toContain(
        'Additional notes'
      );
    });

    it('renders no label span without label content', async () => {
      const el = await mount('<zbk-textarea aria-label="Notes"></zbk-textarea>');
      expect(el.querySelector('.zbk-textarea__label')).toBeNull();
    });

    it('forwards native semantics to the textarea', async () => {
      const el = await mount(
        '<zbk-textarea name="notes" placeholder="Anything else?" required autocomplete="off" maxlength="500">Notes</zbk-textarea>'
      );
      const textarea = textareaOf(el);
      expect(textarea.name).toBe('notes');
      expect(textarea.placeholder).toBe('Anything else?');
      expect(textarea.required).toBe(true);
      expect(textarea.getAttribute('autocomplete')).toBe('off');
      expect(textarea.maxLength).toBe(500);
    });

    it('forwards rows and wrap', async () => {
      const el = await mount('<zbk-textarea rows="6" wrap="hard">Notes</zbk-textarea>');
      const textarea = textareaOf(el);
      expect(textarea.rows).toBe(6);
      expect(textarea.getAttribute('wrap')).toBe('hard');
    });

    it('forwards readonly and disabled', async () => {
      const el = await mount('<zbk-textarea readonly disabled>Locked</zbk-textarea>');
      const textarea = textareaOf(el);
      expect(textarea.readOnly).toBe(true);
      expect(textarea.disabled).toBe(true);
    });
  });

  describe('no affixes', () => {
    it('ignores slot="prefix" content — no affix markup renders', async () => {
      const el = await mount(
        '<zbk-textarea><svg slot="prefix"></svg>Notes</zbk-textarea>'
      );
      expect(el.querySelector('.zbk-textarea__affix')).toBeNull();
      // The prefix node is not rendered into the field box.
      expect(el.querySelector('.zbk-textarea__field svg')).toBeNull();
    });

    it('ignores slot="suffix" content too', async () => {
      const el = await mount(
        '<zbk-textarea><i slot="suffix"></i>Notes</zbk-textarea>'
      );
      expect(el.querySelector('.zbk-textarea__affix')).toBeNull();
      expect(el.querySelector('.zbk-textarea__field i')).toBeNull();
    });
  });

  describe('value', () => {
    it('applies the value property to the textarea', async () => {
      const el = await mount('<zbk-textarea value="hello">Field</zbk-textarea>');
      expect(textareaOf(el).value).toBe('hello');
      expect(el.value).toBe('hello');
    });

    it('syncs the element from typing and lets the native input event bubble', async () => {
      const el = await mount('<zbk-textarea>Field</zbk-textarea>');
      const seen: Event[] = [];
      el.parentElement!.addEventListener('input', (event) => seen.push(event));

      await type(el, 'zebra');
      expect(el.value).toBe('zebra');
      expect(seen).toHaveLength(1);
      // The one spelling: the textarea's own event, not a re-dispatched custom one.
      expect(seen[0].target).toBe(textareaOf(el));
    });

    it('leaves the value locked when readonly but stays focusable', async () => {
      const el = await mount('<zbk-textarea readonly value="fixed">Notes</zbk-textarea>');
      const textarea = textareaOf(el);
      expect(textarea.readOnly).toBe(true);
      el.focus();
      expect(document.activeElement).toBe(textarea);
      expect(textarea.value).toBe('fixed');
    });
  });

  describe('accessibility', () => {
    it('relocates aria-* from the host to the textarea', async () => {
      const el = await mount(
        '<zbk-textarea aria-describedby="hint">Notes</zbk-textarea>'
      );
      expect(el.hasAttribute('aria-describedby')).toBe(false);
      expect(textareaOf(el).getAttribute('aria-describedby')).toBe('hint');
    });

    it('forwards focus() to the textarea', async () => {
      const el = await mount('<zbk-textarea>Notes</zbk-textarea>');
      el.focus();
      expect(document.activeElement).toBe(textareaOf(el));
    });

    it('warns when there is no accessible name, naming the fix', async () => {
      await mount('<zbk-textarea></zbk-textarea>');
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('No accessible name')
      );
    });

    it('does not treat a placeholder as an accessible name', async () => {
      await mount('<zbk-textarea placeholder="Notes"></zbk-textarea>');
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('No accessible name')
      );
    });

    it('does not warn when label text is provided', async () => {
      await mount('<zbk-textarea>Notes</zbk-textarea>');
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('accepts aria-label in place of label text', async () => {
      await mount('<zbk-textarea aria-label="Notes"></zbk-textarea>');
      expect(warnSpy).not.toHaveBeenCalled();
    });
  });

  describe('variants', () => {
    it('ships sm and lg on the size axis', () => {
      expect(textareaVariants.map((v) => v.name)).toEqual(['sm', 'lg']);
      expect(new Set(textareaVariants.map((v) => v.axis))).toEqual(
        new Set(['size'])
      );
    });

    it('reflects variant into a modifier class on the label', async () => {
      const el = await mount('<zbk-textarea variant="sm">Notes</zbk-textarea>');
      expect(
        el.querySelector('label')!.classList.contains('zbk-textarea--sm')
      ).toBe(true);
    });

    it('warns on an unknown variant, naming the registered vocabulary', async () => {
      await mount('<zbk-textarea variant="tiny">Notes</zbk-textarea>');
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unknown variant "tiny"')
      );
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('sm, lg'));
    });
  });
});
