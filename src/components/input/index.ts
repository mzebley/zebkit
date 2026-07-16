// <zbk-input> — the zebkit text field.
//
// A light-DOM custom element wrapping a real <input> inside its own <label>.
// Default children are the visible label (the accessible name via the wrapping
// label — the same spelling as <zbk-checkbox>); the field box carries optional
// prefix/suffix affixes around the native input.
//
//   <zbk-input name="email" type="email" placeholder="you@example.com">
//     <svg slot="prefix">…</svg>
//     Email address
//   </zbk-input>
//
// Affixes accept any authored content — an svg, an icon-font glyph, an HTML
// character, an image — via the prefix/suffix slots (GRAMMAR.md §7 shared
// vocabulary). They render aria-hidden: information an affix carries must also
// live in the accessible name or description.
//
// Masking (`mask` attribute) formats the value as the user types: `#` accepts
// a digit, `a` a letter, `*` a letter or digit; every other character is a
// literal the mask inserts automatically (escape a token character with `\`).
// The masked value is the value — what you see is what submits. `rawValue`
// reads the same value with the mask's literals stripped.
//
//   <zbk-input name="phone" mask="(###) ###-####">Phone</zbk-input>
//
// Value changes surface as the input's own bubbling `input`/`change` events —
// there is no custom event. Styling lives entirely in the compiled zebkit CSS
// (`.zbk-input`, consuming `--zbk-input-*` tokens).

import { html, nothing, type PropertyDeclarations, type PropertyValues, type TemplateResult } from 'lit';
import { ZebkitElement } from '../base/zebkit-element';
import { inputVariants } from './variants/index';
import { slotContract } from './slot-contract';

type MaskToken =
  | { kind: 'slot'; accepts: RegExp }
  | { kind: 'literal'; char: string };

const MASK_CLASSES: Record<string, RegExp> = {
  '#': /\d/,
  a: /\p{L}/u,
  '*': /[\p{L}\d]/u,
};

/** Parse a mask string into slot/literal tokens (`\` escapes a token char). */
const parseMask = (mask: string): MaskToken[] => {
  const tokens: MaskToken[] = [];
  for (let i = 0; i < mask.length; i++) {
    const char = mask[i];
    if (char === '\\' && i + 1 < mask.length) {
      tokens.push({ kind: 'literal', char: mask[++i] });
    } else if (MASK_CLASSES[char]) {
      tokens.push({ kind: 'slot', accepts: MASK_CLASSES[char] });
    } else {
      tokens.push({ kind: 'literal', char });
    }
  }
  return tokens;
};

/**
 * The zebkit text field: a light-DOM element wrapping a real `<input>` inside
 * its own `<label>`. Default children are the visible label; prefix/suffix
 * slots render aria-hidden affixes inside the field box. The optional `mask`
 * formats the value as the user types. No custom events — the native
 * `input`/`change` bubble.
 */
export class ZbkInput extends ZebkitElement {
  static componentName = 'input';
  static variantConfigs = inputVariants;
  static slotContract = slotContract;

  static properties: PropertyDeclarations = {
    type: { type: String },
    value: { type: String },
    mask: { type: String },
    placeholder: { type: String },
    disabled: { type: Boolean },
    readonly: { type: Boolean },
    required: { type: Boolean },
    name: { type: String },
    form: { type: String },
    autocomplete: { type: String },
    inputmode: { type: String },
    minlength: { type: Number },
    maxlength: { type: Number },
    min: { type: String },
    max: { type: String },
    step: { type: String },
    pattern: { type: String },
  };

  /** Forwarded to the internal input. Text-like types (text, email, password,
   * search, tel, url, number, ...) — for checkboxes, radios, and buttons use
   * their own zebkit components. */
  type = 'text';

  /** The field's current value. With a `mask`, always the masked form. */
  value = '';

  /**
   * Format-as-you-type mask: `#` digit, `a` letter, `*` letter or digit,
   * anything else a literal inserted automatically (`\` escapes a token char).
   * The masked value is the value submitted; read `rawValue` for the value
   * with literals stripped.
   */
  mask?: string;

  /** Forwarded to the internal input. A placeholder is not a label — the
   * accessible name comes from label children or aria-label. */
  placeholder?: string;

  /** Native disabled: removed from the tab order, blocks all interaction. */
  disabled = false;

  /** Native readonly: focusable and legible, value locked. */
  readonly = false;

  /** Forwarded for native constraint validation. */
  required = false;

  /** Forwarded to the internal input for native form participation. */
  name?: string;
  form?: string;

  /** Native autofill hint, forwarded verbatim. */
  autocomplete?: string;

  /** Forwarded verbatim. With an all-digit mask the component defaults this
   * to "numeric" so touch keyboards match the accepted characters. */
  inputmode?: string;

  /** Forwarded for native constraint validation. */
  minlength?: number;
  maxlength?: number;
  min?: string;
  max?: string;
  step?: string;
  pattern?: string;

  /** True while an IME composition is in flight; masking waits for the end. */
  private composing = false;

  protected get nativeElement(): HTMLInputElement | null {
    return this.querySelector(':scope input');
  }

  /** The current value with the mask's literal characters stripped. Without a
   * mask this is simply the value. */
  get rawValue(): string {
    if (!this.mask) return this.value;
    return this.extractRaw(this.value, parseMask(this.mask));
  }

  protected render(): TemplateResult {
    return html`<label class=${this.componentClasses}>
      ${this.hasSlotted()
        ? html`<span class="${this.baseClass}__label">${this.slotted()}</span>`
        : nothing}
      <span class="${this.baseClass}__field">
        ${this.renderAffix('prefix')}
        <input
          class="${this.baseClass}__input"
          type=${this.type}
          .value=${this.value}
          placeholder=${this.placeholder ?? nothing}
          ?disabled=${this.disabled}
          ?readonly=${this.readonly}
          ?required=${this.required}
          name=${this.name ?? nothing}
          form=${this.form ?? nothing}
          autocomplete=${this.autocomplete ?? nothing}
          inputmode=${this.effectiveInputmode() ?? nothing}
          minlength=${this.minlength ?? nothing}
          maxlength=${this.maxlength ?? nothing}
          min=${this.min ?? nothing}
          max=${this.max ?? nothing}
          step=${this.step ?? nothing}
          pattern=${this.pattern ?? nothing}
          @input=${this.handleInput}
          @compositionstart=${this.handleCompositionStart}
          @compositionend=${this.handleCompositionEnd}
        />
        ${this.renderAffix('suffix')}
      </span>
    </label>`;
  }

  private renderAffix(name: 'prefix' | 'suffix'): TemplateResult | typeof nothing {
    if (!this.hasSlotted(name)) return nothing;
    return html`<span
      class="${this.baseClass}__affix ${this.baseClass}__affix--${name}"
      aria-hidden="true"
    >${this.slotted(name)}</span>`;
  }

  /** An all-digit mask implies a numeric touch keyboard unless the author
   * chose otherwise. */
  private effectiveInputmode(): string | undefined {
    if (this.inputmode) return this.inputmode;
    if (!this.mask) return undefined;
    const tokens = parseMask(this.mask);
    const slots = tokens.filter((token) => token.kind === 'slot');
    if (
      slots.length > 0 &&
      slots.every((token) => token.kind === 'slot' && token.accepts === MASK_CLASSES['#'])
    ) {
      return 'numeric';
    }
    return undefined;
  }

  // ---------------------------------------------------------------------------
  // Masking

  /** Characters from `text` that could fill a slot of this mask, in order. */
  private extractRaw(text: string, tokens: MaskToken[]): string {
    const classes = tokens
      .filter((token): token is Extract<MaskToken, { kind: 'slot' }> => token.kind === 'slot')
      .map((token) => token.accepts);
    if (classes.length === 0) return '';
    let raw = '';
    for (const char of text) {
      if (classes.some((accepts) => accepts.test(char))) raw += char;
    }
    return raw;
  }

  /**
   * Format raw characters through the mask: literals insert themselves while
   * raw input remains, slots consume the next raw character that matches
   * (characters no slot accepts are dropped). Returns the masked string and,
   * per consumed character, its end position for caret restoration.
   */
  private formatMasked(raw: string, tokens: MaskToken[]): { masked: string; caretAfter: number[] } {
    let masked = '';
    const caretAfter: number[] = [];
    let ri = 0;
    for (const token of tokens) {
      if (ri >= raw.length) break;
      if (token.kind === 'literal') {
        masked += token.char;
        continue;
      }
      while (ri < raw.length && !token.accepts.test(raw[ri])) ri++;
      if (ri >= raw.length) break;
      masked += raw[ri++];
      caretAfter.push(masked.length);
    }
    return { masked, caretAfter };
  }

  /**
   * Re-mask on every input, preserving the caret: the caret lands after the
   * same number of raw characters it had behind it before formatting.
   */
  private handleInput(): void {
    if (!this.mask || this.composing) {
      this.value = this.nativeElement?.value ?? this.value;
      return;
    }
    this.applyMaskToInput();
  }

  private handleCompositionStart(): void {
    this.composing = true;
  }

  private handleCompositionEnd(): void {
    this.composing = false;
    if (this.mask) this.applyMaskToInput();
  }

  private applyMaskToInput(): void {
    const input = this.nativeElement;
    if (!input || !this.mask) return;
    const tokens = parseMask(this.mask);
    // Selection APIs exist only on text-like types (text, tel, search, ...).
    let caret: number | null = null;
    try {
      caret = input.selectionStart;
    } catch {
      caret = null;
    }
    const atEnd = caret === null || caret >= input.value.length;
    const rawBeforeCaret =
      caret === null ? 0 : this.extractRaw(input.value.slice(0, caret), tokens).length;

    const raw = this.extractRaw(input.value, tokens);
    const { masked, caretAfter } = this.formatMasked(raw, tokens);

    input.value = masked;
    if (caret !== null) {
      const nextCaret = atEnd
        ? masked.length
        : rawBeforeCaret === 0
          ? 0
          : caretAfter[Math.min(rawBeforeCaret, caretAfter.length) - 1];
      input.setSelectionRange(nextCaret, nextCaret);
    }
    this.value = masked;
  }

  protected willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed);
    // Programmatic values pass through the mask too, so the element never
    // renders an unmasked value. Formatting is idempotent, so this converges.
    if (this.mask && (changed.has('value') || changed.has('mask'))) {
      const tokens = parseMask(this.mask);
      this.value = this.formatMasked(this.extractRaw(this.value, tokens), tokens).masked;
    }
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

/** Register <zbk-input> (idempotent). */
export const defineZbkInput = (): void => {
  if (!customElements.get('zbk-input')) {
    customElements.define('zbk-input', ZbkInput);
  }
};
