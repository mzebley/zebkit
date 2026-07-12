/**
 * @jest-environment jsdom
 */
import { html } from 'lit';
import { ZebkitElement } from './zebkit-element';
import type { VariantConfig } from '@definitions/token-variants';

const ghost: VariantConfig = {
  component: 'testel',
  name: 'ghost',
  axis: 'style',
  overrides: { canvas: 'transparent', ink: '{accent-primary.600}' },
};

const solid: VariantConfig = {
  component: 'testel',
  name: 'solid',
  axis: 'style',
  overrides: { canvas: '{brand.500}' },
};

const lg: VariantConfig = {
  component: 'testel',
  name: 'lg',
  axis: 'size',
  overrides: { 'padding-inline': '{spacing.2}' },
};

class TestElement extends ZebkitElement {
  static componentName = 'testel';
  static variantConfigs = [ghost, solid, lg];

  protected get nativeElement(): HTMLElement | null {
    return this.querySelector('button');
  }

  render() {
    return html`<button class=${this.componentClasses} type="button">
      ${this.renderIcon('start')}<span class="label">${this.slotted()}</span
      >${this.renderIcon('end')}
    </button>`;
  }
}

customElements.define('zbk-testel', TestElement);

async function mount(markup: string): Promise<TestElement> {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = markup;
  document.body.appendChild(wrapper);
  const el = wrapper.querySelector('zbk-testel') as TestElement;
  await el.updateComplete;
  return el;
}

describe('ZebkitElement', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    document.body.innerHTML = '';
    warnSpy.mockRestore();
  });

  describe('variants', () => {
    it('applies base + variant classes to the skeleton root', async () => {
      const el = await mount('<zbk-testel variant="ghost lg">Go</zbk-testel>');
      const button = el.querySelector('button')!;
      expect(button.classList.contains('zbk-testel')).toBe(true);
      expect(button.classList.contains('zbk-testel--ghost')).toBe(true);
      expect(button.classList.contains('zbk-testel--lg')).toBe(true);
    });

    it('renders only the base class without a variant attribute', async () => {
      const el = await mount('<zbk-testel>Go</zbk-testel>');
      const button = el.querySelector('button')!;
      expect(button.className.trim()).toBe('zbk-testel');
    });

    it('warns with the registered vocabulary on an unknown variant', async () => {
      await mount('<zbk-testel variant="ghots">Go</zbk-testel>');
      expect(warnSpy).toHaveBeenCalledWith(
        '[zbk-testel] Unknown variant "ghots". Registered variants: ghost, solid, lg.'
      );
    });

    it('warns when two same-axis variants overlap on a token', async () => {
      await mount('<zbk-testel variant="ghost solid">Go</zbk-testel>');
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'Variants "ghost" and "solid" share axis "style" and both set --zbk-testel-canvas'
        )
      );
    });

    it('does not warn for different-axis combinations', async () => {
      await mount('<zbk-testel variant="ghost lg">Go</zbk-testel>');
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('reacts to variant attribute changes', async () => {
      const el = await mount('<zbk-testel>Go</zbk-testel>');
      el.setAttribute('variant', 'ghost');
      await el.updateComplete;
      expect(el.querySelector('button')!.classList.contains('zbk-testel--ghost')).toBe(true);
    });
  });

  describe('consumer variants', () => {
    afterEach(() => {
      ZebkitElement.resetConsumerVariants();
    });

    it('applies a runtime-registered variant via the variant attribute', async () => {
      ZebkitElement.registerVariants({
        component: 'testel',
        name: 'pill',
        overrides: { radius: '{radius.full}' },
      });
      const el = await mount('<zbk-testel variant="pill">Go</zbk-testel>');
      expect(el.querySelector('button')!.classList.contains('zbk-testel--pill')).toBe(true);
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('accepts the component-keyed map shape from variant JSON files', async () => {
      ZebkitElement.registerVariants({
        testel: {
          pill: { overrides: { radius: '{radius.full}' } },
        },
      });
      const el = await mount('<zbk-testel variant="pill">Go</zbk-testel>');
      expect(el.querySelector('button')!.classList.contains('zbk-testel--pill')).toBe(true);
    });

    it('honors the registry className field as classNameOverride', async () => {
      ZebkitElement.registerVariants([
        { component: 'testel', name: 'pill', className: 'zbk-custom-pill', overrides: {} },
      ]);
      const el = await mount('<zbk-testel variant="pill">Go</zbk-testel>');
      expect(el.querySelector('button')!.classList.contains('zbk-custom-pill')).toBe(true);
    });

    it('lists consumer variants in the unknown-variant vocabulary', async () => {
      ZebkitElement.registerVariants({
        component: 'testel',
        name: 'pill',
        overrides: {},
      });
      await mount('<zbk-testel variant="ghots">Go</zbk-testel>');
      expect(warnSpy).toHaveBeenCalledWith(
        '[zbk-testel] Unknown variant "ghots". Registered variants: ghost, solid, lg, pill.'
      );
    });

    it('replaces a shipped variant of the same name instead of duplicating it', async () => {
      ZebkitElement.registerVariants({
        component: 'testel',
        name: 'ghost',
        axis: 'style',
        overrides: { canvas: '{brand.100}' },
      });
      const el = await mount('<zbk-testel variant="ghost">Go</zbk-testel>');
      const button = el.querySelector('button')!;
      expect(button.className.trim()).toBe('zbk-testel zbk-testel--ghost');
    });
  });

  describe('components config mirror', () => {
    afterEach(() => {
      ZebkitElement.resetComponentsConfig();
      ZebkitElement.resetConsumerVariants();
    });

    it('stops applying a shipped variant outside the allowlist and warns with the fix', async () => {
      ZebkitElement.applyComponentsConfig({ testel: { variants: ['solid', 'lg'] } });
      const el = await mount('<zbk-testel variant="ghost lg">Go</zbk-testel>');
      const button = el.querySelector('button')!;

      expect(button.classList.contains('zbk-testel--ghost')).toBe(false);
      expect(button.classList.contains('zbk-testel--lg')).toBe(true);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'Variant "ghost" is excluded by the components config (components.testel.variants)'
        )
      );
    });

    it('keeps consumer variants outside the allowlist filter', async () => {
      ZebkitElement.applyComponentsConfig({ testel: { variants: ['solid'] } });
      ZebkitElement.registerVariants({
        component: 'testel',
        name: 'pill',
        overrides: {},
      });
      const el = await mount('<zbk-testel variant="pill">Go</zbk-testel>');
      expect(el.querySelector('button')!.classList.contains('zbk-testel--pill')).toBe(true);
    });

    it('does not let registerVariants resurrect an excluded shipped variant', async () => {
      ZebkitElement.applyComponentsConfig({ testel: { variants: ['solid'] } });
      ZebkitElement.registerVariants({
        component: 'testel',
        name: 'ghost',
        overrides: { canvas: '{brand.100}' },
      });
      const el = await mount('<zbk-testel variant="ghost">Go</zbk-testel>');
      expect(el.querySelector('button')!.classList.contains('zbk-testel--ghost')).toBe(false);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('excluded by the components config')
      );
    });

    it('warns once when an excluded component is used', async () => {
      ZebkitElement.applyComponentsConfig({ testel: false });
      await mount('<zbk-testel>Go</zbk-testel>');
      await mount('<zbk-testel>Again</zbk-testel>');

      const exclusionWarnings = warnSpy.mock.calls.filter((call) =>
        String(call[0]).includes('<zbk-testel> is excluded by the components config')
      );
      expect(exclusionWarnings).toHaveLength(1);
    });
  });

  describe('ARIA relocation', () => {
    it('moves authored aria-* from host to the native element', async () => {
      const el = await mount('<zbk-testel aria-label="Close">x</zbk-testel>');
      expect(el.hasAttribute('aria-label')).toBe(false);
      expect(el.querySelector('button')!.getAttribute('aria-label')).toBe('Close');
    });

    it('mirrors aria-* set after upgrade', async () => {
      const el = await mount('<zbk-testel>Go</zbk-testel>');
      el.setAttribute('aria-pressed', 'true');
      await Promise.resolve(); // MutationObserver microtask
      expect(el.hasAttribute('aria-pressed')).toBe(false);
      expect(el.querySelector('button')!.getAttribute('aria-pressed')).toBe('true');
    });

    it('relocates role', async () => {
      const el = await mount('<zbk-testel role="tab">Tab</zbk-testel>');
      expect(el.hasAttribute('role')).toBe(false);
      expect(el.querySelector('button')!.getAttribute('role')).toBe('tab');
    });
  });

  describe('child adoption', () => {
    it('places default content and slot-named children into the skeleton', async () => {
      const el = await mount(
        '<zbk-testel><span slot="icon" data-icon></span>Save</zbk-testel>'
      );
      const button = el.querySelector('button')!;
      expect(button.querySelector('[data-icon]')).not.toBeNull();
      expect(button.textContent).toContain('Save');
    });

    it('reports slotted content presence', async () => {
      const el = await mount('<zbk-testel>Save</zbk-testel>');
      // protected members exercised via subclass cast
      expect((el as any).hasSlotted()).toBe(true);
      expect((el as any).hasSlotted('icon')).toBe(false);
    });

    it('renders explicitly positioned icons into start and end wrappers', async () => {
      const el = await mount(
        '<zbk-testel><span slot="icon" data-position="start" data-start></span>Save<span slot="icon" data-position="end" data-end></span></zbk-testel>'
      );
      expect(
        el.querySelector('.zbk-testel__icon--start [data-start]')
      ).not.toBeNull();
      expect(
        el.querySelector('.zbk-testel__icon--end [data-end]')
      ).not.toBeNull();
    });

    it('ignores bare position and infers from authored order', async () => {
      const el = await mount(
        '<zbk-testel><span slot="icon" position="end" data-start></span>Save</zbk-testel>'
      );
      expect(
        el.querySelector('.zbk-testel__icon--start [data-start]')
      ).not.toBeNull();
    });

    it('infers icon position from original child order', async () => {
      const el = await mount(
        '<zbk-testel><span slot="icon" data-start></span>Save<span slot="icon" data-end></span></zbk-testel>'
      );
      expect(
        el.querySelector('.zbk-testel__icon--start [data-start]')
      ).not.toBeNull();
      expect(
        el.querySelector('.zbk-testel__icon--end [data-end]')
      ).not.toBeNull();
    });
  });

  describe('focus forwarding', () => {
    it('forwards focus() to the internal focusable', async () => {
      const el = await mount('<zbk-testel>Go</zbk-testel>');
      el.focus();
      expect(document.activeElement).toBe(el.querySelector('button'));
    });
  });

  describe('uid generation', () => {
    it('produces unique, component-prefixed ids', async () => {
      const a = await mount('<zbk-testel>A</zbk-testel>');
      const b = await mount('<zbk-testel>B</zbk-testel>');
      const idA = (a as any).uidFor('bubble');
      const idB = (b as any).uidFor('bubble');
      expect(idA).toMatch(/^zbk-testel-\d+-bubble$/);
      expect(idA).not.toBe(idB);
    });
  });

  describe('accessible name check', () => {
    it('detects text content as a name', async () => {
      const el = await mount('<zbk-testel>Go</zbk-testel>');
      expect((el as any).hasAccessibleName()).toBe(true);
    });

    it('detects a relocated aria-label as a name', async () => {
      const el = await mount('<zbk-testel aria-label="Close"></zbk-testel>');
      expect((el as any).hasAccessibleName()).toBe(true);
    });

    it('reports a nameless control', async () => {
      const el = await mount('<zbk-testel></zbk-testel>');
      expect((el as any).hasAccessibleName()).toBe(false);
    });
  });
});
