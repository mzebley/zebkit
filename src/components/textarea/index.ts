// <zbk-textarea> — the zebkit multi-line text field.
//
// A light-DOM custom element wrapping a real <textarea> inside its own <label>.
// It is <zbk-input> for multi-line text: default children are the visible label
// (the accessible name via the wrapping label), and the field box carries the
// native textarea. It is not a rich-text editor and it has no masking.
//
//   <zbk-textarea name="notes" rows="4" placeholder="Anything else we should know?">
//     Additional notes
//   </zbk-textarea>
//
// There are no prefix/suffix affixes — they do not compose with a multi-line
// scrolling box. Resizability is a token (`resize`), not an attribute, so
// consumers re-theme it like any other visual property.
//
// Value changes surface as the textarea's own bubbling `input`/`change` events —
// there is no custom event. Styling lives entirely in the compiled zebkit CSS
// (`.zbk-textarea`, consuming `--zbk-textarea-*` tokens).

import { html, nothing, type PropertyDeclarations, type TemplateResult } from 'lit';
import { ZebkitElement } from '../base/zebkit-element';
import { textareaVariants } from './variants/index';
import { slotContract } from './slot-contract';

/**
 * The zebkit multi-line text field: a light-DOM element wrapping a real
 * `<textarea>` inside its own `<label>`. Default children are the visible label
 * (the accessible name via the wrapping label). No affixes, no masking. No
 * custom events — the native `input`/`change` bubble.
 */
export class ZbkTextarea extends ZebkitElement {
  static componentName = 'textarea';
  static variantConfigs = textareaVariants;
  static slotContract = slotContract;

  static properties: PropertyDeclarations = {
    value: { type: String },
    placeholder: { type: String },
    disabled: { type: Boolean },
    readonly: { type: Boolean },
    required: { type: Boolean },
    name: { type: String },
    form: { type: String },
    autocomplete: { type: String },
    minlength: { type: Number },
    maxlength: { type: Number },
    rows: { type: Number },
    wrap: { type: String },
  };

  /** The field's current value, synced from the native `input` event. */
  value = '';

  /** Forwarded to the internal textarea. A placeholder is not a label — the
   * accessible name comes from label children or aria-label. */
  placeholder?: string;

  /** Native disabled: removed from the tab order, blocks all interaction. */
  disabled = false;

  /** Native readonly: focusable and legible, value locked. */
  readonly = false;

  /** Forwarded for native constraint validation. */
  required = false;

  /** Forwarded to the internal textarea for native form participation. */
  name?: string;
  form?: string;

  /** Native autofill hint, forwarded verbatim. */
  autocomplete?: string;

  /** Forwarded for native constraint validation. */
  minlength?: number;
  maxlength?: number;

  /** Native initial visible rows (the browser default applies when unset). */
  rows?: number;

  /** Native soft/hard wrapping mode, forwarded verbatim. */
  wrap?: string;

  protected get nativeElement(): HTMLTextAreaElement | null {
    return this.querySelector(':scope textarea');
  }

  protected render(): TemplateResult {
    return html`<label class=${this.componentClasses}>
      ${this.hasSlotted()
        ? html`<span class="${this.baseClass}__label">${this.slotted()}</span>`
        : nothing}
      <span class="${this.baseClass}__field">
        <textarea
          class="${this.baseClass}__textarea"
          .value=${this.value}
          placeholder=${this.placeholder ?? nothing}
          ?disabled=${this.disabled}
          ?readonly=${this.readonly}
          ?required=${this.required}
          name=${this.name ?? nothing}
          form=${this.form ?? nothing}
          autocomplete=${this.autocomplete ?? nothing}
          minlength=${this.minlength ?? nothing}
          maxlength=${this.maxlength ?? nothing}
          rows=${this.rows ?? nothing}
          wrap=${this.wrap ?? nothing}
          @input=${this.handleInput}
        ></textarea>
      </span>
    </label>`;
  }

  /** Sync the element from typing; the native `input` event bubbles on its own. */
  private handleInput(): void {
    this.value = this.nativeElement?.value ?? this.value;
  }

  /** The wrapping label names the control; check adopted content too. */
  protected hasAccessibleName(): boolean {
    if (this.slotted().some((node) => node.textContent?.trim())) return true;
    return super.hasAccessibleName();
  }

  protected accessibleNameWarning(): string {
    return 'No accessible name. Provide label text as children, or aria-label / aria-labelledby — a placeholder is not a label.';
  }
}

/** Register <zbk-textarea> (idempotent). */
export const defineZbkTextarea = (): void => {
  if (!customElements.get('zbk-textarea')) {
    customElements.define('zbk-textarea', ZbkTextarea);
  }
};
