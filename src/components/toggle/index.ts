// <zbk-toggle> — the zebkit toggle (switch).
//
// A light-DOM custom element wrapping a real <input type="checkbox"
// role="switch"> inside its own <label>. Deliberately a separate component
// from <zbk-checkbox>: a switch is a track with a traveling thumb, announces
// as on/off, and represents an immediate state change — not a form selection —
// so it carries its own token surface instead of contorting the checkbox's.
//
//   <zbk-toggle name="notifications" checked>Email me</zbk-toggle>
//
// The native input stays functional but invisible, stretched across the whole
// label so hover, press, click, and focus land on it natively anywhere in the
// component; an aria-hidden track span (thumb as its ::before) visualizes its
// state through sibling selectors. State changes surface as the input's own
// bubbling `change`/`input` events — there is no custom event. Styling lives
// entirely in the compiled zebkit CSS (`.zbk-toggle`, consuming
// `--zbk-toggle-*` tokens).

import { html, nothing, type PropertyDeclarations, type TemplateResult } from 'lit';
import { ZebkitElement } from '../base/zebkit-element';
import { toggleVariants } from './variants/index';
import { slotContract } from './slot-contract';

/**
 * The zebkit toggle (switch): a light-DOM element wrapping a real
 * `<input type="checkbox" role="switch">` inside its own `<label>` — the APG
 * switch pattern on a fully native input. A track with a traveling thumb that
 * announces on/off; deliberately separate from `<zbk-checkbox>` so each
 * carries an intentional token surface. No custom events — the native
 * `change`/`input` bubble.
 */
export class ZbkToggle extends ZebkitElement {
  static componentName = 'toggle';
  static variantConfigs = toggleVariants;
  static slotContract = slotContract;

  static properties: PropertyDeclarations = {
    checked: { type: Boolean },
    disabled: { type: Boolean },
    required: { type: Boolean },
    name: { type: String },
    value: { type: String },
  };

  /** Whether the toggle is on. Syncs from user interaction. */
  checked = false;

  /** Native disabled: removed from the tab order, blocks all interaction. */
  disabled = false;

  /** Forwarded for native constraint validation. */
  required = false;

  /** Forwarded to the internal input for native form participation. */
  name?: string;

  /** The submitted value; defaults to the platform's "on". */
  value = 'on';

  protected get nativeElement(): HTMLInputElement | null {
    return this.querySelector(':scope input');
  }

  protected render(): TemplateResult {
    // role="switch" on a native checkbox is the APG switch pattern: AT
    // announces on/off while checkedness, form participation, and events
    // stay fully native.
    return html`<label class=${this.componentClasses}>
      <input
        type="checkbox"
        role="switch"
        class="${this.baseClass}__input"
        .checked=${this.checked}
        ?disabled=${this.disabled}
        ?required=${this.required}
        name=${this.name ?? nothing}
        .value=${this.value}
        @change=${this.handleChange}
      />
      <span class="${this.baseClass}__track" aria-hidden="true"></span>
      <span class="${this.baseClass}__label">${this.slotted()}</span>
    </label>`;
  }

  /** Keep element state mirroring the native input (the source of truth). */
  private handleChange(): void {
    const input = this.nativeElement;
    if (!input) return;
    this.checked = input.checked;
  }

  /** The wrapping label names the control; check adopted content too. */
  protected hasAccessibleName(): boolean {
    if (this.slotted().some((node) => node.textContent?.trim())) return true;
    return super.hasAccessibleName();
  }

}

/** Register <zbk-toggle> (idempotent). */
export const defineZbkToggle = (): void => {
  if (!customElements.get('zbk-toggle')) {
    customElements.define('zbk-toggle', ZbkToggle);
  }
};
