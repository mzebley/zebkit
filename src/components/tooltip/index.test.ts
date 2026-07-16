/**
 * @jest-environment jsdom
 */
import { ZbkTooltip, defineZbkTooltip } from './index';
import { resetAnnouncer } from '../base/announce';

defineZbkTooltip();

async function mount(markup: string): Promise<ZbkTooltip> {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = markup;
  document.body.appendChild(wrapper);
  const el = wrapper.querySelector('zbk-tooltip') as ZbkTooltip;
  await el.updateComplete;
  return el;
}

const bubbleOf = (el: ZbkTooltip): HTMLElement =>
  el.querySelector('[data-zbk-tooltip-bubble]') as HTMLElement;

const triggerOf = (el: ZbkTooltip): HTMLElement =>
  el.querySelector('button') as HTMLElement;

/** Advance fake timers past show-delay/hide-grace, then flush microtasks. */
async function settle(ms = 300): Promise<void> {
  jest.advanceTimersByTime(ms);
  // computePosition resolves through a few microtask hops.
  for (let i = 0; i < 5; i++) await Promise.resolve();
}

describe('ZbkTooltip', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    document.body.innerHTML = '';
    resetAnnouncer();
    jest.useRealTimers();
    warnSpy.mockRestore();
  });

  describe('hint mode (default)', () => {
    const markup =
      '<zbk-tooltip content="Copies the link"><button>Copy</button></zbk-tooltip>';

    it('renders a hidden role="tooltip" bubble with the content', async () => {
      const el = await mount(markup);
      const bubble = bubbleOf(el);
      expect(bubble.getAttribute('role')).toBe('tooltip');
      expect(bubble.hidden).toBe(true);
      expect(bubble.textContent).toContain('Copies the link');
      expect(bubble.classList.contains('zbk-tooltip')).toBe(true);
    });

    it('describes the trigger via aria-describedby, appending to prior values', async () => {
      const el = await mount(
        '<zbk-tooltip content="Hint"><button aria-describedby="existing">Go</button></zbk-tooltip>'
      );
      const described = triggerOf(el).getAttribute('aria-describedby')!;
      expect(described.split(/\s+/)).toEqual(['existing', bubbleOf(el).id]);
    });

    it('restores aria-describedby on disconnect', async () => {
      const el = await mount(
        '<zbk-tooltip content="Hint"><button aria-describedby="existing">Go</button></zbk-tooltip>'
      );
      const trigger = triggerOf(el);
      el.remove();
      expect(trigger.getAttribute('aria-describedby')).toBe('existing');
    });

    it('shows after the show delay on hover and hides after the grace period', async () => {
      const el = await mount(markup);
      const trigger = triggerOf(el);
      const bubble = bubbleOf(el);

      trigger.dispatchEvent(new Event('mouseenter'));
      expect(bubble.hidden).toBe(true); // not yet — delay pending
      await settle();
      expect(bubble.hidden).toBe(false);

      trigger.dispatchEvent(new Event('mouseleave'));
      expect(bubble.hidden).toBe(false); // grace period
      await settle();
      expect(bubble.hidden).toBe(true);
    });

    it('stays open while the pointer is over the bubble (WCAG 1.4.13 hoverable)', async () => {
      const el = await mount(markup);
      const trigger = triggerOf(el);
      const bubble = bubbleOf(el);

      trigger.dispatchEvent(new Event('mouseenter'));
      await settle();
      trigger.dispatchEvent(new Event('mouseleave'));
      bubble.dispatchEvent(new Event('mouseenter'));
      await settle();
      expect(bubble.hidden).toBe(false);

      bubble.dispatchEvent(new Event('mouseleave'));
      await settle();
      expect(bubble.hidden).toBe(true);
    });

    it('shows on focus and hides on blur', async () => {
      const el = await mount(markup);
      const trigger = triggerOf(el);
      const bubble = bubbleOf(el);

      trigger.focus();
      trigger.dispatchEvent(new FocusEvent('focusin'));
      await settle();
      expect(bubble.hidden).toBe(false);

      trigger.blur();
      trigger.dispatchEvent(new FocusEvent('focusout'));
      await settle();
      expect(bubble.hidden).toBe(true);
    });

    it('dismisses on Escape and stays dismissed until hover resets (WCAG 1.4.13 dismissible)', async () => {
      const el = await mount(markup);
      const trigger = triggerOf(el);
      const bubble = bubbleOf(el);

      trigger.dispatchEvent(new Event('mouseenter'));
      await settle();
      expect(bubble.hidden).toBe(false);

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      expect(bubble.hidden).toBe(true);

      // Still hovering — must not reappear until the pointer leaves and returns.
      await settle();
      expect(bubble.hidden).toBe(true);

      trigger.dispatchEvent(new Event('mouseleave'));
      await settle();
      trigger.dispatchEvent(new Event('mouseenter'));
      await settle();
      expect(bubble.hidden).toBe(false);
    });
  });

  describe('toggle mode', () => {
    const markup =
      '<zbk-tooltip mode="toggle" content="Added to favorites"><button aria-label="Favorite">★</button></zbk-tooltip>';

    it('renders an aria-hidden bubble (announcement goes through the live region)', async () => {
      const el = await mount(markup);
      const bubble = bubbleOf(el);
      expect(bubble.getAttribute('aria-hidden')).toBe('true');
      expect(bubble.hasAttribute('role')).toBe(false);
    });

    it('does not describe the trigger via aria-describedby', async () => {
      const el = await mount(markup);
      expect(triggerOf(el).hasAttribute('aria-describedby')).toBe(false);
    });

    it('toggles on click with aria-expanded and announces the content', async () => {
      const el = await mount(markup);
      const trigger = triggerOf(el);
      const bubble = bubbleOf(el);
      expect(trigger.getAttribute('aria-expanded')).toBe('false');

      trigger.click();
      await settle(100);
      expect(trigger.getAttribute('aria-expanded')).toBe('true');
      expect(bubble.hidden).toBe(false);

      const region = document.querySelector('[aria-live="polite"]')!;
      expect(region.textContent).toBe('Added to favorites');

      trigger.click();
      expect(trigger.getAttribute('aria-expanded')).toBe('false');
      expect(bubble.hidden).toBe(true);
    });

    it('closes on outside press', async () => {
      const el = await mount(markup);
      const trigger = triggerOf(el);
      trigger.click();
      await settle(100);
      expect(bubbleOf(el).hidden).toBe(false);

      document.body.dispatchEvent(
        new Event('pointerdown', { bubbles: true })
      );
      expect(bubbleOf(el).hidden).toBe(true);
    });

    it('closes on Escape and returns focus to the trigger', async () => {
      const el = await mount(markup);
      const trigger = triggerOf(el);
      trigger.click();
      await settle(100);

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      expect(bubbleOf(el).hidden).toBe(true);
      expect(trigger.getAttribute('aria-expanded')).toBe('false');
      expect(document.activeElement).toBe(trigger);
    });

    it('warns when the trigger is not a control, naming the fix', async () => {
      await mount(
        '<zbk-tooltip mode="toggle" content="Info"><span>What is this?</span></zbk-tooltip>'
      );
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Toggle mode needs a button trigger')
      );
    });
  });

  describe('diagnostics', () => {
    it('warns on empty content, naming the fix', async () => {
      await mount('<zbk-tooltip><button>Go</button></zbk-tooltip>');
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Empty content. Set the `content` attribute')
      );
    });

    it('warns when no trigger element is present', async () => {
      await mount('<zbk-tooltip content="Orphan"></zbk-tooltip>');
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('No trigger element found')
      );
    });
  });
});
