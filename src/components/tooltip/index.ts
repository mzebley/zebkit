// <zbk-tooltip> — the zebkit tooltip / toggletip.
//
// One component, two trigger modes, one token surface:
//
//   hint (default) — a hover/focus hint for a labelled control. The bubble is
//   role="tooltip", linked via aria-describedby (it supplements the trigger's
//   accessible name, never replaces it). Satisfies WCAG 1.4.13: shows on hover
//   AND focus, dismissible with Escape, and hoverable — a grace period lets
//   the pointer cross onto the bubble before it closes.
//
//   toggle — click-triggered info, the right pattern for touch and icon
//   buttons. The visual bubble is aria-hidden; the text is announced through
//   the shared live-region announcer at click time. The trigger carries
//   aria-expanded; outside-press and Escape (which returns focus) close it.
//
//   <zbk-tooltip content="Copies the link to your clipboard">
//     <zbk-button aria-label="Copy link"><svg slot="icon">…</svg></zbk-button>
//   </zbk-tooltip>
//
// Positioning is @floating-ui/dom (flip / shift / arrow / autoUpdate) so it
// works on every browser users actually have; where the popover API exists the
// bubble is promoted to the top layer, otherwise the z-index token applies.
// Show/hide timing is read from the `--zbk-tooltip-show-delay` / `-hide-grace`
// tokens at runtime, so the a11y machinery can reach it.

import {
  html,
  nothing,
  type PropertyDeclarations,
  type PropertyValues,
  type TemplateResult,
} from 'lit';
import {
  arrow,
  autoUpdate,
  computePosition,
  flip,
  offset,
  shift,
  type Placement,
} from '@floating-ui/dom';
import { ZebkitElement } from '../base/zebkit-element';
import { announce } from '../base/announce';
import { slotContract } from './slot-contract';

export type ZbkTooltipMode = 'hint' | 'toggle';

const OPPOSITE_SIDE = {
  top: 'bottom',
  right: 'left',
  bottom: 'top',
  left: 'right',
} as const;

type Side = keyof typeof OPPOSITE_SIDE;

/** `:focus-visible` support probe — older DOM engines (and jsdom) throw. */
function matchesFocusVisible(el: Element): boolean {
  try {
    return el.matches(':focus-visible');
  } catch {
    return true;
  }
}

/**
 * The zebkit tooltip/toggletip: a light-DOM element that adopts its child as
 * the trigger and renders a positioned bubble beside it. `mode="hint"` (the
 * default) describes the trigger on hover/focus per WCAG 1.4.13 (hoverable,
 * dismissible, persistent); `mode="toggle"` turns click-triggered toggletip
 * behavior on, announcing content through the shared live region. Positioning
 * uses floating-ui with `popover="manual"` top-layer promotion where
 * supported. No custom events.
 */
export class ZbkTooltip extends ZebkitElement {
  static componentName = 'tooltip';
  static slotContract = slotContract;

  /**
   * The required default content is the trigger, not an accessible name —
   * wireTrigger() warns with trigger semantics instead.
   */
  protected accessibleNameWarning(): null {
    return null;
  }

  static properties: PropertyDeclarations = {
    content: { type: String },
    mode: { type: String },
    placement: { type: String },
  };

  /** The tooltip text. Plain text only — supplementary description flattens to
   * a string for AT anyway; interactive content is a different pattern. */
  content = '';

  /** Trigger semantics: "hint" (hover/focus) or "toggle" (click). */
  mode: ZbkTooltipMode = 'hint';

  /** Preferred side, floating-ui vocabulary: top | right | bottom | left
   * (optionally `-start` / `-end`). Flips automatically when it can't fit. */
  placement: Placement = 'top';

  private open = false;
  /** Escape was pressed; stays shut until hover/focus fully resets. */
  private dismissed = false;
  private triggerHover = false;
  private bubbleHover = false;
  private focused = false;
  private lastPointerType = '';
  private showTimer?: ReturnType<typeof setTimeout>;
  private hideTimer?: ReturnType<typeof setTimeout>;
  private stopAutoUpdate?: () => void;
  private listeners?: AbortController;
  private wiredMode?: ZbkTooltipMode;
  private describedTrigger?: HTMLElement;

  /** The trigger: the first authored element child. */
  protected get nativeElement(): HTMLElement | null {
    const el = this.slotted().find((node) => node instanceof HTMLElement);
    return (el as HTMLElement) ?? null;
  }

  private get bubble(): HTMLElement | null {
    return this.querySelector(':scope > [data-zbk-tooltip-bubble]');
  }

  private get arrowElement(): HTMLElement | null {
    return this.querySelector(':scope > [data-zbk-tooltip-bubble] > .zbk-tooltip__arrow');
  }

  private get bubbleId(): string {
    return this.uidFor('bubble');
  }

  private get supportsPopover(): boolean {
    return (
      typeof HTMLElement !== 'undefined' &&
      'showPopover' in HTMLElement.prototype
    );
  }

  protected render(): TemplateResult {
    const isToggle = this.mode === 'toggle';
    return html`${this.slotted()}<div
      data-zbk-tooltip-bubble
      id=${this.bubbleId}
      class=${this.componentClasses}
      role=${isToggle ? nothing : 'tooltip'}
      aria-hidden=${isToggle ? 'true' : nothing}
      popover=${this.supportsPopover ? 'manual' : nothing}
      ?hidden=${!this.supportsPopover}
    ><span class="zbk-tooltip__content">${this.content}</span><span
        class="zbk-tooltip__arrow"
        aria-hidden="true"
      ></span></div>`;
  }

  // ---------------------------------------------------------------------------
  // Timing: read from the token surface so the a11y machinery reaches it.

  private tokenMs(token: string, fallback: number): number {
    if (typeof getComputedStyle !== 'function') return fallback;
    const raw = getComputedStyle(this)
      .getPropertyValue(`--zbk-tooltip-${token}`)
      .trim();
    if (!raw) return fallback;
    const parsed = parseFloat(raw);
    if (Number.isNaN(parsed)) return fallback;
    return raw.endsWith('ms') ? parsed : raw.endsWith('s') ? parsed * 1000 : parsed;
  }

  private arrowPx(): number {
    if (typeof getComputedStyle !== 'function') return 8;
    const raw = getComputedStyle(this)
      .getPropertyValue('--zbk-tooltip-arrow-size')
      .trim();
    const parsed = parseFloat(raw);
    return Number.isNaN(parsed) ? 8 : parsed;
  }

  // ---------------------------------------------------------------------------
  // Positioning

  private async place(): Promise<void> {
    const trigger = this.nativeElement;
    const bubble = this.bubble;
    const arrowEl = this.arrowElement;
    if (!trigger || !bubble || !arrowEl) return;

    const arrowSize = this.arrowPx();
    const { x, y, placement, middlewareData } = await computePosition(
      trigger,
      bubble,
      {
        placement: this.placement,
        strategy: 'fixed',
        middleware: [
          offset(arrowSize),
          flip({ padding: 8 }),
          shift({ padding: 8 }),
          arrow({ element: arrowEl }),
        ],
      }
    );

    bubble.style.left = `${x}px`;
    bubble.style.top = `${y}px`;
    const side = placement.split('-')[0] as Side;
    bubble.dataset.side = side;

    const arrowData = middlewareData.arrow;
    if (arrowData) {
      arrowEl.style.left = arrowData.x != null ? `${arrowData.x}px` : '';
      arrowEl.style.top = arrowData.y != null ? `${arrowData.y}px` : '';
      arrowEl.style.right = '';
      arrowEl.style.bottom = '';
      arrowEl.style.setProperty(OPPOSITE_SIDE[side], `${-arrowSize / 2}px`);
    }
  }

  private startPositioning(): void {
    const trigger = this.nativeElement;
    const bubble = this.bubble;
    if (!trigger || !bubble) return;
    if (typeof ResizeObserver === 'undefined') {
      // Positioning still works without live tracking (e.g. jsdom).
      void this.place();
      return;
    }
    this.stopAutoUpdate = autoUpdate(trigger, bubble, () => void this.place());
  }

  private show(): void {
    if (this.open) return;
    const bubble = this.bubble;
    if (!bubble) return;
    this.open = true;
    if (this.supportsPopover) {
      (bubble as HTMLElement & { showPopover: () => void }).showPopover();
    } else {
      bubble.hidden = false;
    }
    this.startPositioning();
    if (this.mode === 'toggle') {
      this.nativeElement?.setAttribute('aria-expanded', 'true');
      announce(this.content);
      document.addEventListener('pointerdown', this.onOutsidePress, true);
    }
    document.addEventListener('keydown', this.onDocumentKeydown, true);
  }

  private hide(returnFocus = false): void {
    if (!this.open) return;
    const bubble = this.bubble;
    this.open = false;
    this.stopAutoUpdate?.();
    this.stopAutoUpdate = undefined;
    if (bubble) {
      if (this.supportsPopover) {
        (bubble as HTMLElement & { hidePopover: () => void }).hidePopover();
      } else {
        bubble.hidden = true;
      }
    }
    if (this.mode === 'toggle') {
      this.nativeElement?.setAttribute('aria-expanded', 'false');
      document.removeEventListener('pointerdown', this.onOutsidePress, true);
    }
    document.removeEventListener('keydown', this.onDocumentKeydown, true);
    if (returnFocus) this.nativeElement?.focus();
  }

  // ---------------------------------------------------------------------------
  // Hint mode: hover + focus with show delay and hover-persistence grace.

  private sync(): void {
    const shouldShow =
      !this.dismissed && (this.triggerHover || this.bubbleHover || this.focused);
    if (shouldShow) {
      clearTimeout(this.hideTimer);
      this.hideTimer = undefined;
      if (!this.open && this.showTimer === undefined) {
        this.showTimer = setTimeout(() => {
          this.showTimer = undefined;
          this.show();
        }, this.tokenMs('show-delay', 150));
      }
    } else {
      clearTimeout(this.showTimer);
      this.showTimer = undefined;
      clearTimeout(this.hideTimer);
      this.hideTimer = setTimeout(() => {
        this.hideTimer = undefined;
        this.hide();
      }, this.tokenMs('hide-grace', 120));
    }
  }

  private onDocumentKeydown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape' || !this.open) return;
    if (this.mode === 'toggle') {
      event.stopPropagation();
      this.hide(true);
      return;
    }
    this.dismissed = true;
    clearTimeout(this.showTimer);
    this.showTimer = undefined;
    this.hide();
  };

  private onOutsidePress = (event: PointerEvent): void => {
    const target = event.target as Node;
    if (this.contains(target)) return;
    this.hide();
  };

  private wireTrigger(): void {
    const trigger = this.nativeElement;
    if (!trigger) {
      this.warn(
        'No trigger element found. Place the trigger (e.g. a button) as the tooltip\'s child content.'
      );
      return;
    }

    this.listeners?.abort();
    this.listeners = new AbortController();
    const { signal } = this.listeners;
    this.wiredMode = this.mode;

    if (this.mode === 'toggle') {
      // Toggletips must be activated by a real control.
      const isControl =
        trigger.matches('button, [role="button"], input[type="button"]') ||
        trigger.querySelector(':scope > button') !== null ||
        trigger.tagName.toLowerCase().startsWith('zbk-');
      if (!isControl) {
        this.warn(
          `Toggle mode needs a button trigger; got <${trigger.tagName.toLowerCase()}>. Wrap the trigger in a button so keyboard and AT users can activate it.`
        );
      }
      trigger.setAttribute('aria-expanded', 'false');
      trigger.addEventListener(
        'click',
        () => (this.open ? this.hide() : this.show()),
        { signal }
      );
      return;
    }

    // Hint mode: describe the trigger (supplement its name, never replace it).
    const prior = trigger.getAttribute('aria-describedby');
    trigger.setAttribute(
      'aria-describedby',
      prior ? `${prior} ${this.bubbleId}` : this.bubbleId
    );
    this.describedTrigger = trigger;

    trigger.addEventListener(
      'pointerdown',
      (event: PointerEvent) => {
        this.lastPointerType = event.pointerType;
      },
      { signal }
    );
    trigger.addEventListener(
      'mouseenter',
      () => {
        this.triggerHover = true;
        this.sync();
      },
      { signal }
    );
    trigger.addEventListener(
      'mouseleave',
      () => {
        this.triggerHover = false;
        this.dismissed = false;
        this.sync();
      },
      { signal }
    );
    trigger.addEventListener(
      'focusin',
      (event: FocusEvent) => {
        // Keyboard focus always shows; mouse-click focus doesn't (it would
        // stick until the next click); touch focus shows — it's the only way
        // to reach a hint on touch at all. Modality = the pointerdown (if any)
        // that produced this focus, consumed so a later keyboard focus after a
        // click still shows. `:focus-visible` is OR'd in as a browser-side
        // corroboration where the engine supports it.
        const pointerType = this.lastPointerType;
        this.lastPointerType = '';
        const target = event.target as Element;
        this.focused =
          pointerType === '' ||
          pointerType === 'touch' ||
          matchesFocusVisible(target);
        this.sync();
      },
      { signal }
    );
    trigger.addEventListener(
      'focusout',
      () => {
        this.focused = false;
        this.dismissed = false;
        this.sync();
      },
      { signal }
    );

    const bubble = this.bubble;
    if (bubble) {
      bubble.addEventListener(
        'mouseenter',
        () => {
          this.bubbleHover = true;
          this.sync();
        },
        { signal }
      );
      bubble.addEventListener(
        'mouseleave',
        () => {
          this.bubbleHover = false;
          this.sync();
        },
        { signal }
      );
    }
  }

  private unwireTrigger(): void {
    this.listeners?.abort();
    this.listeners = undefined;
    if (this.describedTrigger) {
      const current = this.describedTrigger.getAttribute('aria-describedby');
      if (current) {
        const rest = current
          .split(/\s+/)
          .filter((id) => id !== this.bubbleId)
          .join(' ');
        if (rest) this.describedTrigger.setAttribute('aria-describedby', rest);
        else this.describedTrigger.removeAttribute('aria-describedby');
      }
      this.describedTrigger = undefined;
    }
    if (this.wiredMode === 'toggle') {
      this.nativeElement?.removeAttribute('aria-expanded');
    }
    this.wiredMode = undefined;
  }

  // ---------------------------------------------------------------------------
  // Lifecycle

  protected firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed);
    this.wireTrigger();
    if (!this.content.trim()) {
      this.warn('Empty content. Set the `content` attribute to the tooltip text.');
    }
  }

  protected updated(changed: PropertyValues): void {
    super.updated(changed);
    if (changed.has('mode') && this.hasUpdated && this.wiredMode !== undefined && this.wiredMode !== this.mode) {
      this.hide();
      this.unwireTrigger();
      this.wireTrigger();
    }
    if (changed.has('content') && this.open && this.mode === 'toggle') {
      announce(this.content);
    }
    if ((changed.has('content') || changed.has('placement')) && this.open) {
      void this.place();
    }
  }

  disconnectedCallback(): void {
    clearTimeout(this.showTimer);
    clearTimeout(this.hideTimer);
    this.hide();
    this.unwireTrigger();
    super.disconnectedCallback();
  }
}

/** Register <zbk-tooltip> (idempotent). */
export const defineZbkTooltip = (): void => {
  if (!customElements.get('zbk-tooltip')) {
    customElements.define('zbk-tooltip', ZbkTooltip);
  }
};
