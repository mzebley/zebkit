// <zbk-select> — the zebkit select.
//
// A light-DOM custom element wrapping a real <select> inside its own <label>.
// Authored <option>, <optgroup>, and <hr> children are adopted into the native
// select; every other default child is the visible label (the accessible name
// via the wrapping label — the same spelling as <zbk-input>). The field box
// carries optional prefix/suffix affixes and draws a chevron indicator that
// slotted suffix content replaces.
//
//   <zbk-select name="country">
//     Country
//     <option value="us">United States</option>
//     <option value="ca">Canada</option>
//   </zbk-select>
//
// Affixes accept any authored content via the prefix/suffix slots (GRAMMAR.md
// §7 shared vocabulary) and render aria-hidden: information an affix carries
// must also live in the accessible name or description.
//
// Selection changes surface as the select's own bubbling `change`/`input`
// events — there is no custom event. Styling lives entirely in the compiled
// zebkit CSS (`.zbk-select`, consuming `--zbk-select-*` tokens).

import { html, nothing, type PropertyDeclarations, type PropertyValues, type TemplateResult } from 'lit';
import { ZebkitElement } from '../base/zebkit-element';
import { selectVariants } from './variants/index';
import { slotContract } from './slot-contract';

/** Elements that belong inside a native <select>. */
const OPTION_TAGS = new Set(['OPTION', 'OPTGROUP', 'HR']);

/**
 * The zebkit select: a light-DOM element wrapping a real `<select>` inside its
 * own `<label>`. Authored option content is adopted into the select; remaining
 * default children are the visible label. The drawn chevron indicator can be
 * replaced through the suffix slot. No custom events — the native
 * `change`/`input` bubble.
 */
export class ZbkSelect extends ZebkitElement {
  static componentName = 'select';
  static variantConfigs = selectVariants;
  static slotContract = slotContract;

  static properties: PropertyDeclarations = {
    value: { type: String },
    disabled: { type: Boolean },
    required: { type: Boolean },
    multiple: { type: Boolean },
    size: { type: Number },
    name: { type: String },
    form: { type: String },
    autocomplete: { type: String },
  };

  /**
   * The selected option's value. Leave unset for uncontrolled behavior (the
   * platform selects the first option); syncs from user interaction.
   */
  value?: string;

  /** Native disabled: removed from the tab order, blocks all interaction. */
  disabled = false;

  /** Forwarded for native constraint validation. */
  required = false;

  /** Native multiple selection: renders as a list box (no chevron). */
  multiple = false;

  /** Number of visible rows, forwarded verbatim. */
  size?: number;

  /** Forwarded to the internal select for native form participation. */
  name?: string;
  form?: string;

  /** Native autofill hint, forwarded verbatim. */
  autocomplete?: string;

  protected get nativeElement(): HTMLSelectElement | null {
    return this.querySelector(':scope select');
  }

  protected render(): TemplateResult {
    return html`<label class=${this.componentClasses}>
      ${this.hasLabelContent()
        ? html`<span class="${this.baseClass}__label">${this.labelContent()}</span>`
        : nothing}
      <span class=${this.fieldClasses()}>
        ${this.renderAffix('prefix')}
        <select
          class="${this.baseClass}__select"
          ?disabled=${this.disabled}
          ?required=${this.required}
          ?multiple=${this.multiple}
          size=${this.size ?? nothing}
          name=${this.name ?? nothing}
          form=${this.form ?? nothing}
          autocomplete=${this.autocomplete ?? nothing}
          @change=${this.handleChange}
        >${this.optionContent()}</select>
        ${this.renderAffix('suffix')}
      </span>
    </label>`;
  }

  /** Authored option content: the default children a native select accepts. */
  private optionContent(): Node[] {
    return this.slotted().filter(
      (node) => node instanceof Element && OPTION_TAGS.has(node.tagName)
    );
  }

  /** Everything else in the default content is the visible label. */
  private labelContent(): Node[] {
    return this.slotted().filter(
      (node) => !(node instanceof Element && OPTION_TAGS.has(node.tagName))
    );
  }

  private hasLabelContent(): boolean {
    return this.labelContent().some(
      (node) => node instanceof Element || node.textContent?.trim()
    );
  }

  /**
   * A `--slotted-suffix` modifier when the author replaced the chevron lets
   * the stylesheet retire the drawn indicator.
   */
  private fieldClasses(): string {
    const classes = [`${this.baseClass}__field`];
    if (this.hasSlotted('suffix')) {
      classes.push(`${this.baseClass}__field--slotted-suffix`);
    }
    return classes.join(' ');
  }

  private renderAffix(name: 'prefix' | 'suffix'): TemplateResult | typeof nothing {
    if (!this.hasSlotted(name)) return nothing;
    return html`<span
      class="${this.baseClass}__affix ${this.baseClass}__affix--${name}"
      aria-hidden="true"
    >${this.slotted(name)}</span>`;
  }

  /** Keep element state mirroring the native select (the source of truth). */
  private handleChange(): void {
    const select = this.nativeElement;
    if (select) this.value = select.value;
  }

  protected updated(changed: PropertyValues): void {
    super.updated(changed);
    // `value` selects across adopted options, so it lands after render (an
    // attribute binding can't — options must exist first).
    const select = this.nativeElement;
    if (select && this.value !== undefined && select.value !== this.value) {
      select.value = this.value;
    }
  }

  /** The wrapping label names the control; check adopted label content too. */
  protected hasAccessibleName(): boolean {
    if (this.labelContent().some((node) => node.textContent?.trim())) return true;
    const target = this.nativeElement;
    if (!target) return false;
    if (target.getAttribute('aria-label')?.trim()) return true;
    const labelledBy = target.getAttribute('aria-labelledby');
    if (labelledBy) {
      return labelledBy
        .split(/\s+/)
        .some((id) => document.getElementById(id)?.textContent?.trim());
    }
    return false;
  }

  protected accessibleNameWarning(): string {
    return 'No accessible name. Provide label text as children (options are adopted into the select; other content labels it), or aria-label / aria-labelledby.';
  }
}

/** Register <zbk-select> (idempotent). */
export const defineZbkSelect = (): void => {
  if (!customElements.get('zbk-select')) {
    customElements.define('zbk-select', ZbkSelect);
  }
};
