// <zbk-radio> — the zebkit radio.
//
// A light-DOM custom element wrapping a real <input type="radio"> inside its
// own <label>. Because the inputs live in the document (no shadow boundaries),
// radios sharing a `name` form a native group: mutual exclusion, arrow-key
// navigation, and form submission all come from the platform, not from us.
//
//   <fieldset>
//     <legend>Size</legend>
//     <div class="zbk-radio-group">
//       <zbk-radio name="size" value="s">Small</zbk-radio>
//       <zbk-radio name="size" value="m" checked>Medium</zbk-radio>
//     </div>
//   </fieldset>
//
// The drawn selection dot can be replaced with any authored content — an svg,
// an icon-font glyph, an HTML character, an image — via the state-indicator
// slots (GRAMMAR.md §7 shared vocabulary):
//
//   <zbk-radio name="mood" value="happy">
//     <i class="ti ti-mood-smile" slot="checked"></i>
//     Happy
//   </zbk-radio>
//
// Slotted indicators layer over the control, size from the indicator-size
// token, inherit indicator-color, and animate with the component's transition
// tokens. The control is aria-hidden, so indicator content is presentational.
//
// Selection changes surface as the input's own bubbling `change`/`input`
// events — there is no custom event. Styling lives entirely in the compiled
// zebkit CSS (`.zbk-radio`, consuming `--zbk-radio-*` tokens).

import { html, nothing, type PropertyDeclarations, type PropertyValues, type TemplateResult } from 'lit';
import { ZebkitElement } from '../base/zebkit-element';
import { radioVariants } from './variants/index';
import { slotContract } from './slot-contract';

/**
 * The zebkit radio: a light-DOM element wrapping a real
 * `<input type="radio">` inside its own `<label>`. Radios sharing a `name`
 * form a native group — mutual exclusion, arrow-key navigation, and form
 * submission come from the platform. No custom events — the native `change`
 * bubbles from the newly selected input.
 */
export class ZbkRadio extends ZebkitElement {
  static componentName = 'radio';
  static variantConfigs = radioVariants;
  static slotContract = slotContract;

  static properties: PropertyDeclarations = {
    checked: { type: Boolean },
    disabled: { type: Boolean },
    required: { type: Boolean },
    name: { type: String },
    value: { type: String },
  };

  /** Whether this radio is the group's selection. Syncs from user interaction. */
  checked = false;

  /** Native disabled: removed from the tab order, blocks all interaction. */
  disabled = false;

  /** Forwarded for native constraint validation. */
  required = false;

  /** The group key. Radios only behave as one group when they share a name. */
  name?: string;

  /** This option's submitted value; defaults to the platform's "on". */
  value = 'on';

  protected get nativeElement(): HTMLInputElement | null {
    return this.querySelector(':scope input');
  }

  protected render(): TemplateResult {
    return html`<label class=${this.componentClasses}>
      <input
        type="radio"
        class="${this.baseClass}__input"
        .checked=${this.checked}
        ?disabled=${this.disabled}
        ?required=${this.required}
        name=${this.name ?? nothing}
        .value=${this.value}
        @change=${this.handleChange}
      />
      <span class=${this.controlClasses()} aria-hidden="true">
        ${this.renderIndicator('checked')}
        ${this.renderIndicator('unchecked')}
      </span>
      <span class="${this.baseClass}__label">${this.slotted()}</span>
    </label>`;
  }

  /**
   * A `--slotted-{state}` modifier per authored indicator lets the stylesheet
   * retire the drawn dot the slotted content replaces.
   */
  private controlClasses(): string {
    const classes = [`${this.baseClass}__control`];
    for (const state of ['checked', 'unchecked'] as const) {
      if (this.hasSlotted(state)) {
        classes.push(`${this.baseClass}__control--slotted-${state}`);
      }
    }
    return classes.join(' ');
  }

  private renderIndicator(
    state: 'checked' | 'unchecked'
  ): TemplateResult | typeof nothing {
    if (!this.hasSlotted(state)) return nothing;
    return html`<span
      class="${this.baseClass}__indicator ${this.baseClass}__indicator--${state}"
    >${this.slotted(state)}</span>`;
  }

  /**
   * The platform already unchecked the rest of the group; it just doesn't
   * fire events on them. Mirror the native state back onto every zbk-radio
   * sharing this group so their `checked` properties stay truthful.
   */
  private handleChange(): void {
    const input = this.nativeElement;
    if (!input) return;
    this.checked = input.checked;
    if (!this.checked || !this.name) return;

    const root = this.closest('form') ?? document;
    for (const radio of root.querySelectorAll<ZbkRadio>('zbk-radio')) {
      if (radio !== this && radio.name === this.name) radio.syncFromNative();
    }
  }

  /** Re-read `checked` from the native input (the source of truth). */
  syncFromNative(): void {
    const input = this.nativeElement;
    if (input) this.checked = input.checked;
  }

  /** The wrapping label names the control; check adopted content too. */
  protected hasAccessibleName(): boolean {
    if (this.slotted().some((node) => node.textContent?.trim())) return true;
    return super.hasAccessibleName();
  }

  protected firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed);
    if (!this.name) {
      this.warn(
        'No name. Radios only behave as one group when they share a name; set the same name attribute on every radio in the group.'
      );
    }
  }
}

/** Register <zbk-radio> (idempotent). */
export const defineZbkRadio = (): void => {
  if (!customElements.get('zbk-radio')) {
    customElements.define('zbk-radio', ZbkRadio);
  }
};
