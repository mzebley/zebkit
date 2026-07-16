// <zbk-checkbox> — the zebkit checkbox.
//
// A light-DOM custom element wrapping a real <input type="checkbox"> inside
// its own <label>. The native input stays functional but invisible, stretched
// across the whole label so hover, press, click, and focus land on it natively
// anywhere in the component; an aria-hidden control span visualizes its state
// through sibling selectors.
//
//   <zbk-checkbox name="terms" value="yes" checked>I agree</zbk-checkbox>
//
// The drawn checkmark and indeterminate bar can be replaced with any authored
// content — an svg, an icon-font glyph, an HTML character, an image — via the
// state-indicator slots (GRAMMAR.md §7 shared vocabulary):
//
//   <zbk-checkbox name="tasks">
//     <i class="ti ti-checks" slot="checked"></i>
//     <span slot="indeterminate">&ndash;</span>
//     All tasks
//   </zbk-checkbox>
//
// Slotted indicators layer over the control, size from the indicator-size
// token, inherit indicator-color, and animate with the component's transition
// tokens. The control is aria-hidden, so indicator content is presentational.
//
// State changes surface as the input's own bubbling `change`/`input` events —
// there is no custom event. Styling lives entirely in the compiled zebkit CSS
// (`.zbk-checkbox`, consuming `--zbk-checkbox-*` tokens).

import { html, nothing, type PropertyDeclarations, type PropertyValues, type TemplateResult } from 'lit';
import { ZebkitElement } from '../base/zebkit-element';
import { checkboxVariants } from './variants/index';
import { slotContract } from './slot-contract';

/**
 * The zebkit checkbox: a light-DOM element wrapping a real
 * `<input type="checkbox">` inside its own `<label>`. The invisible native
 * input stretches across the whole label (hover, press, click, and focus land
 * on it natively anywhere); an aria-hidden control span visualizes its state.
 * No custom events — the native `change`/`input` bubble.
 */
export class ZbkCheckbox extends ZebkitElement {
  static componentName = 'checkbox';
  static variantConfigs = checkboxVariants;
  static slotContract = slotContract;

  static properties: PropertyDeclarations = {
    checked: { type: Boolean },
    indeterminate: { type: Boolean },
    disabled: { type: Boolean },
    required: { type: Boolean },
    name: { type: String },
    value: { type: String },
  };

  /** Whether the checkbox is checked. Syncs from user interaction. */
  checked = false;

  /**
   * The mixed "some but not all" state. Visual + AT state only, never
   * submitted; any user toggle clears it (native behavior).
   */
  indeterminate = false;

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
    return html`<label class=${this.componentClasses}>
      <input
        type="checkbox"
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
        ${this.renderIndicator('indeterminate')}
      </span>
      <span class="${this.baseClass}__label">${this.slotted()}</span>
    </label>`;
  }

  /**
   * A `--slotted-{state}` modifier per authored indicator lets the stylesheet
   * retire the drawn pseudo the slotted content replaces.
   */
  private controlClasses(): string {
    const classes = [`${this.baseClass}__control`];
    for (const state of ['checked', 'unchecked', 'indeterminate'] as const) {
      if (this.hasSlotted(state)) {
        classes.push(`${this.baseClass}__control--slotted-${state}`);
      }
    }
    return classes.join(' ');
  }

  private renderIndicator(
    state: 'checked' | 'unchecked' | 'indeterminate'
  ): TemplateResult | typeof nothing {
    if (!this.hasSlotted(state)) return nothing;
    return html`<span
      class="${this.baseClass}__indicator ${this.baseClass}__indicator--${state}"
    >${this.slotted(state)}</span>`;
  }

  /** Keep element state mirroring the native input (the source of truth). */
  private handleChange(): void {
    const input = this.nativeElement;
    if (!input) return;
    this.checked = input.checked;
    this.indeterminate = input.indeterminate;
  }

  protected updated(changed: PropertyValues): void {
    super.updated(changed);
    // `indeterminate` is property-only on the platform; no template binding
    // exists for it, so push it after every render.
    const input = this.nativeElement;
    if (input) input.indeterminate = this.indeterminate;
  }

  /** The wrapping label names the control; check adopted content too. */
  protected hasAccessibleName(): boolean {
    if (this.slotted().some((node) => node.textContent?.trim())) return true;
    return super.hasAccessibleName();
  }

}

/** Register <zbk-checkbox> (idempotent). */
export const defineZbkCheckbox = (): void => {
  if (!customElements.get('zbk-checkbox')) {
    customElements.define('zbk-checkbox', ZbkCheckbox);
  }
};
