// <zbk-button> — the zebkit button.
//
// A light-DOM custom element wrapping a real <button>. The platform already
// ships the platonic button; this element's job is to complete the pattern:
// render the token-driven skeleton, reflect `variant` into classes, forward
// native semantics, and add the one behavior a native button lacks (loading).
//
//   <zbk-button variant="ghost lg" type="submit">
//     <svg slot="icon">…</svg>
//     Save draft
//   </zbk-button>
//
// Styling lives entirely in the compiled zebkit CSS (`.zbk-button`, consuming
// `--zbk-button-*` tokens) — this file contains zero visual opinion.

import { html, nothing, type PropertyDeclarations, type PropertyValues, type TemplateResult } from 'lit';
import { ZebkitElement } from '../base/zebkit-element';
import { buttonVariants } from './variants/index';

export type ZbkButtonType = 'button' | 'submit' | 'reset';

/**
 * The zebkit button: a light-DOM element wrapping a real `<button>`. Renders
 * the token-driven skeleton, reflects `variant` into classes, forwards native
 * semantics, and adds the one behavior a native button lacks (`loading`).
 * No custom events — the native `click` bubbles, and keyboard activation
 * (Enter/Space) arrives as a click.
 *
 * @slot - The button's label content (its accessible name).
 * @slot icon - A supplementary pictogram, rendered aria-hidden beside the label.
 */
export class ZbkButton extends ZebkitElement {
  static componentName = 'button';
  static variantConfigs = buttonVariants;

  static properties: PropertyDeclarations = {
    type: { type: String },
    disabled: { type: Boolean },
    loading: { type: Boolean },
    name: { type: String },
    value: { type: String },
    form: { type: String },
  };

  /** Forwarded to the internal button. Defaults to "button" — the platform's
   * "submit" default is a well-known footgun inside forms. */
  type: ZbkButtonType = 'button';

  /** Native disabled: removed from the tab order, blocks all interaction. */
  disabled = false;

  /**
   * Busy state (`aria-busy`): announces in-flight work, suppresses activation,
   * and — unlike `disabled` — keeps the button focusable so keyboard and
   * screen-reader users don't lose their place mid-operation.
   */
  loading = false;

  /** Forwarded to the internal button for native form participation. */
  name?: string;
  value?: string;
  form?: string;

  protected get nativeElement(): HTMLButtonElement | null {
    return this.querySelector(':scope > button');
  }

  protected render(): TemplateResult {
    return html`<button
      class=${this.componentClasses}
      type=${this.type}
      ?disabled=${this.disabled}
      name=${this.name ?? nothing}
      value=${this.value ?? nothing}
      form=${this.form ?? nothing}
      aria-busy=${this.loading ? 'true' : nothing}
      @click=${this.handleClick}
    >${this.hasSlotted('icon')
        ? html`<span class="zbk-button__icon" aria-hidden="true">${this.slotted('icon')}</span>`
        : nothing}<span class="zbk-button__label">${this.slotted()}</span></button>`;
  }

  /**
   * While loading, activation is suppressed before anything else can see it
   * (form submission, consumer listeners). Keyboard activation (Enter/Space)
   * arrives as a click on a native button, so this covers every input.
   */
  private handleClick(event: MouseEvent): void {
    if (this.loading) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }

  protected firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed);
    if (!this.hasAccessibleName()) {
      this.warn(
        'No accessible name. Provide label text, or aria-label / aria-labelledby for icon-only buttons.'
      );
    }
  }
}

/** Register <zbk-button> (idempotent). */
export const defineZbkButton = (): void => {
  if (!customElements.get('zbk-button')) {
    customElements.define('zbk-button', ZbkButton);
  }
};
