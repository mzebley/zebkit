/**
 * @jest-environment jsdom
 */
import { ZbkButton, defineZbkButton } from './index';
import { buttonVariants } from './variants/index';

defineZbkButton();

async function mount(markup: string): Promise<ZbkButton> {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = markup;
  document.body.appendChild(wrapper);
  const el = wrapper.querySelector('zbk-button') as ZbkButton;
  await el.updateComplete;
  return el;
}

const inner = (el: ZbkButton): HTMLButtonElement =>
  el.querySelector('button') as HTMLButtonElement;

describe('ZbkButton', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    document.body.innerHTML = '';
    warnSpy.mockRestore();
  });

  describe('skeleton', () => {
    it('renders a native button carrying the base class', async () => {
      const el = await mount('<zbk-button>Save</zbk-button>');
      const button = inner(el);
      expect(button).not.toBeNull();
      expect(button.classList.contains('zbk-button')).toBe(true);
      expect(button.type).toBe('button');
      expect(button.textContent).toContain('Save');
    });

    it('defaults type to "button", not the platform\'s "submit"', async () => {
      const el = await mount('<zbk-button>Go</zbk-button>');
      expect(inner(el).type).toBe('button');
    });

    it('forwards type, name, value, and form', async () => {
      const el = await mount(
        '<zbk-button type="submit" name="intent" value="save" form="editor">Save</zbk-button>'
      );
      const button = inner(el);
      expect(button.type).toBe('submit');
      expect(button.getAttribute('name')).toBe('intent');
      expect(button.getAttribute('value')).toBe('save');
      expect(button.getAttribute('form')).toBe('editor');
    });

    it('adopts icon content into an aria-hidden icon wrapper', async () => {
      const el = await mount(
        '<zbk-button><span slot="icon" data-i></span>Save</zbk-button>'
      );
      const icon = el.querySelector('.zbk-button__icon')!;
      expect(icon.getAttribute('aria-hidden')).toBe('true');
      expect(icon.querySelector('[data-i]')).not.toBeNull();
      expect(el.querySelector('.zbk-button__label')!.textContent).toContain('Save');
    });

    it('renders no icon wrapper without icon content', async () => {
      const el = await mount('<zbk-button>Save</zbk-button>');
      expect(el.querySelector('.zbk-button__icon')).toBeNull();
    });
  });

  describe('variants', () => {
    it('ships ghost, outline, subtle, sm, lg', () => {
      expect(buttonVariants.map((v) => v.name)).toEqual([
        'ghost',
        'outline',
        'subtle',
        'sm',
        'lg',
      ]);
    });

    it('applies variant classes to the native button', async () => {
      const el = await mount('<zbk-button variant="ghost lg">Go</zbk-button>');
      const button = inner(el);
      expect(button.classList.contains('zbk-button--ghost')).toBe(true);
      expect(button.classList.contains('zbk-button--lg')).toBe(true);
    });

    it('warns with the vocabulary on an unknown variant', async () => {
      await mount('<zbk-button variant="fancy">Go</zbk-button>');
      expect(warnSpy).toHaveBeenCalledWith(
        '[zbk-button] Unknown variant "fancy". Registered variants: ghost, outline, subtle, sm, lg.'
      );
    });

    it('warns when two style-axis variants collide', async () => {
      await mount('<zbk-button variant="ghost outline">Go</zbk-button>');
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('share axis "style"')
      );
    });

    it('every shipped variant override is an alias reference or structural literal', () => {
      const structural = new Set(['transparent', 'none', '0', 'currentColor']);
      for (const variant of buttonVariants) {
        for (const value of Object.values(variant.overrides ?? {})) {
          const ok =
            /^\{[a-z0-9.-]+\}$/i.test(value as string) ||
            structural.has(value as string) ||
            /^[\d.]+(rem|em)$/.test(value as string);
          expect(ok ? true : `${variant.name}: ${value}`).toBe(true);
        }
      }
    });

    it('no shipped variant uses the styles escape hatch', () => {
      for (const variant of buttonVariants) {
        expect(variant.styles).toBeUndefined();
      }
    });
  });

  describe('disabled', () => {
    it('sets native disabled on the inner button', async () => {
      const el = await mount('<zbk-button disabled>Go</zbk-button>');
      expect(inner(el).disabled).toBe(true);
    });

    it('blocks activation', async () => {
      const el = await mount('<zbk-button disabled>Go</zbk-button>');
      const onClick = jest.fn();
      el.addEventListener('click', onClick);
      inner(el).click();
      expect(onClick).not.toHaveBeenCalled();
    });
  });

  describe('loading', () => {
    it('sets aria-busy and stays focusable', async () => {
      const el = await mount('<zbk-button loading>Go</zbk-button>');
      const button = inner(el);
      expect(button.getAttribute('aria-busy')).toBe('true');
      expect(button.disabled).toBe(false);
      button.focus();
      expect(document.activeElement).toBe(button);
    });

    it('suppresses activation while loading', async () => {
      const el = await mount('<zbk-button loading>Go</zbk-button>');
      const onClick = jest.fn();
      el.addEventListener('click', onClick);
      inner(el).click();
      expect(onClick).not.toHaveBeenCalled();
    });

    it('activates normally once loading clears', async () => {
      const el = await mount('<zbk-button loading>Go</zbk-button>');
      el.loading = false;
      await el.updateComplete;
      const onClick = jest.fn();
      el.addEventListener('click', onClick);
      inner(el).click();
      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('events', () => {
    it('lets the native click bubble through the host — no proxy events', async () => {
      const el = await mount('<zbk-button>Go</zbk-button>');
      const onClick = jest.fn();
      el.addEventListener('click', onClick);
      inner(el).click();
      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('accessibility', () => {
    it('relocates authored aria-label to the native button', async () => {
      const el = await mount('<zbk-button aria-label="Close"></zbk-button>');
      expect(el.hasAttribute('aria-label')).toBe(false);
      expect(inner(el).getAttribute('aria-label')).toBe('Close');
    });

    it('forwards focus() to the native button', async () => {
      const el = await mount('<zbk-button>Go</zbk-button>');
      el.focus();
      expect(document.activeElement).toBe(inner(el));
    });

    it('warns on a nameless button, naming the fix', async () => {
      await mount('<zbk-button></zbk-button>');
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('No accessible name')
      );
    });

    it('does not warn when a name exists', async () => {
      await mount('<zbk-button>Save</zbk-button>');
      const nameless = warnSpy.mock.calls.filter(([msg]) =>
        String(msg).includes('No accessible name')
      );
      expect(nameless).toHaveLength(0);
    });
  });
});
