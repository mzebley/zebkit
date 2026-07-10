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
      ${this.slotted('icon')}${this.slotted()}
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
