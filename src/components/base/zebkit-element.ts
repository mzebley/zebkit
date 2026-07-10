// ZebkitElement: the light-DOM base class every zebkit component extends.
//
// It owns the grammar mechanics (GRAMMAR.md) so no component reimplements them:
//   - light DOM rendering (tokens, utilities, cascade layers, and the runtime
//     a11y machinery must reach everything)
//   - `variant` attribute -> `zbk-{component}--{name}` classes, validated
//     against the component's registered variants with fix-naming warnings
//   - ARIA relocation: authors write `aria-*`/`role` on the zebkit element as
//     if it were the native control; we move them to the internal native
//     element and mirror later changes
//   - generated unique ids for internal ARIA relationships
//   - focus()/blur() forwarding to the internal focusable
//   - child adoption: authored children are captured before first render and
//     placed into the skeleton (default content + `slot`-named positions)

import { LitElement, type PropertyDeclarations } from 'lit';
import type { VariantConfig } from '@definitions/token-variants';
import { ZEBKIT_PREFIX } from '@config';

let uidCounter = 0;

export interface AdoptedChildren {
  /** Unnamed authored children, in document order. */
  defaultContent: Node[];
  /** Children captured by `slot` attribute name. */
  named: Map<string, Node[]>;
}

export abstract class ZebkitElement extends LitElement {
  /** The pattern's common name in kebab-case, e.g. "button". Set per subclass. */
  static componentName = '';

  /** Variant configs registered for this component (its ./variants module). */
  static variantConfigs: ReadonlyArray<VariantConfig> = [];

  /**
   * Dev diagnostics switch. Warnings name the fix (see GRAMMAR.md §9); silence
   * them wholesale in production builds if desired.
   */
  static warnings = true;

  /** Space-separated list of registered variant names, e.g. "ghost lg". */
  static properties: PropertyDeclarations = {
    variant: { type: String, reflect: false },
  };

  /** Space-separated registered variant names, e.g. "ghost lg". Unknown names warn with the registered vocabulary. */
  variant = '';

  private zbkUid = ++uidCounter;
  private adopted?: AdoptedChildren;
  private ariaObserver?: MutationObserver;
  private relocatingAria = false;

  /** Light DOM: the component renders into itself. */
  protected createRenderRoot(): HTMLElement {
    return this;
  }

  // ---------------------------------------------------------------------------
  // Naming helpers

  protected get componentName(): string {
    return (this.constructor as typeof ZebkitElement).componentName;
  }

  protected get baseClass(): string {
    return `${ZEBKIT_PREFIX}-${this.componentName}`;
  }

  /**
   * `zbk-{component}` plus one `zbk-{component}--{name}` per applied variant.
   * Subclass templates bind this to the skeleton's root native element.
   */
  protected get componentClasses(): string {
    const classes = [this.baseClass];
    for (const variant of this.appliedVariants()) {
      classes.push(
        variant.classNameOverride ?? `${this.baseClass}--${variant.name}`
      );
    }
    return classes.join(' ');
  }

  /** Generate a document-unique id for internal ARIA relationships. */
  protected uidFor(suffix: string): string {
    return `${this.baseClass}-${this.zbkUid}-${suffix}`;
  }

  // ---------------------------------------------------------------------------
  // Variants

  private parsedVariantNames(): string[] {
    return (this.variant ?? '')
      .split(/\s+/)
      .map((name) => name.trim().toLowerCase())
      .filter(Boolean);
  }

  /** The registered VariantConfigs matching the `variant` attribute, in order. */
  protected appliedVariants(): VariantConfig[] {
    const configs = (this.constructor as typeof ZebkitElement).variantConfigs;
    const applied: VariantConfig[] = [];
    for (const name of this.parsedVariantNames()) {
      const config = configs.find((entry) => entry.name.toLowerCase() === name);
      if (config) applied.push(config);
    }
    return applied;
  }

  /** Validate the `variant` attribute; every warning names the fix. */
  private validateVariants(): void {
    const configs = (this.constructor as typeof ZebkitElement).variantConfigs;
    const registered = configs.map((entry) => entry.name);

    for (const name of this.parsedVariantNames()) {
      if (!configs.some((entry) => entry.name.toLowerCase() === name)) {
        this.warn(
          `Unknown variant "${name}". Registered variants: ${
            registered.length > 0 ? registered.join(', ') : '(none)'
          }.`
        );
      }
    }

    // Same-axis conflicts: advisory, never blocking. The later class wins in CSS.
    const applied = this.appliedVariants();
    for (let i = 0; i < applied.length; i++) {
      for (let j = i + 1; j < applied.length; j++) {
        const a = applied[i];
        const b = applied[j];
        if (!a.axis || a.axis !== b.axis) continue;
        const overlap = Object.keys(a.overrides ?? {}).filter((key) =>
          Object.prototype.hasOwnProperty.call(b.overrides ?? {}, key)
        );
        if (overlap.length > 0) {
          this.warn(
            `Variants "${a.name}" and "${b.name}" share axis "${a.axis}" and both set ${overlap
              .map((key) => `--${ZEBKIT_PREFIX}-${this.componentName}-${key}`)
              .join(', ')}; the later class wins.`
          );
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // ARIA relocation + focus forwarding

  /**
   * The internal native element that carries the pattern's semantics (the
   * `<button>` inside `<zbk-button>`). ARIA relocates here; focus forwards here.
   */
  protected abstract get nativeElement(): HTMLElement | null;

  /** Override when the focus target differs from the ARIA target. */
  protected get focusTarget(): HTMLElement | null {
    return this.nativeElement;
  }

  focus(options?: FocusOptions): void {
    this.focusTarget?.focus(options);
  }

  blur(): void {
    this.focusTarget?.blur();
  }

  /**
   * Move `aria-*` and `role` from the host to the internal native element.
   * The host stays role-generic; AT reads the native element.
   */
  private relocateAria(): void {
    const target = this.nativeElement;
    if (!target) return;

    this.relocatingAria = true;
    try {
      for (const attr of Array.from(this.attributes)) {
        if (attr.name !== 'role' && !attr.name.startsWith('aria-')) continue;
        target.setAttribute(attr.name, attr.value);
        this.removeAttribute(attr.name);
      }
    } finally {
      this.relocatingAria = false;
    }
  }

  private observeAria(): void {
    if (this.ariaObserver) return;
    this.ariaObserver = new MutationObserver((records) => {
      if (this.relocatingAria) return;
      const relevant = records.some(
        (record) =>
          record.type === 'attributes' &&
          record.attributeName &&
          (record.attributeName === 'role' ||
            record.attributeName.startsWith('aria-'))
      );
      if (relevant) this.relocateAria();
    });
    this.ariaObserver.observe(this, { attributes: true });
  }

  // ---------------------------------------------------------------------------
  // Child adoption (light-DOM content model, GRAMMAR.md §7)

  /**
   * Capture authored children before Lit's first render so the component can
   * place them inside the skeleton it renders. Named positions use the `slot`
   * attribute; everything else is default content.
   */
  private captureChildren(): void {
    if (this.adopted) return;
    const named = new Map<string, Node[]>();
    const defaultContent: Node[] = [];

    for (const node of Array.from(this.childNodes)) {
      const slotName =
        node instanceof Element ? node.getAttribute('slot') : null;
      if (slotName) {
        const bucket = named.get(slotName) ?? [];
        bucket.push(node);
        named.set(slotName, bucket);
      } else {
        defaultContent.push(node);
      }
      node.parentNode?.removeChild(node);
    }

    this.adopted = { defaultContent, named };
  }

  /** Authored content for a named slot (or the default content when omitted). */
  protected slotted(name?: string): Node[] {
    if (!this.adopted) return [];
    if (name === undefined) return this.adopted.defaultContent;
    return this.adopted.named.get(name) ?? [];
  }

  /** True when the author supplied content for the given position. */
  protected hasSlotted(name?: string): boolean {
    return this.slotted(name).length > 0;
  }

  // ---------------------------------------------------------------------------
  // Diagnostics

  /** `[zbk-button] <message>` — every message names the fix (GRAMMAR.md §9). */
  protected warn(message: string): void {
    if (!(this.constructor as typeof ZebkitElement).warnings) return;
    console.warn(`[${this.baseClass}] ${message}`);
  }

  /**
   * Rough accessible-name computation for the dev-mode nameless-control check:
   * visible text, aria-label, or aria-labelledby on the native element.
   */
  protected hasAccessibleName(): boolean {
    const target = this.nativeElement;
    if (!target) return false;
    if (target.textContent?.trim()) return true;
    if (target.getAttribute('aria-label')?.trim()) return true;
    const labelledBy = target.getAttribute('aria-labelledby');
    if (labelledBy) {
      return labelledBy
        .split(/\s+/)
        .some((id) => document.getElementById(id)?.textContent?.trim());
    }
    return false;
  }

  // ---------------------------------------------------------------------------
  // Lifecycle

  connectedCallback(): void {
    this.captureChildren();
    super.connectedCallback();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.ariaObserver?.disconnect();
    this.ariaObserver = undefined;
  }

  protected willUpdate(changed: Map<PropertyKey, unknown>): void {
    super.willUpdate(changed);
    if (changed.has('variant')) this.validateVariants();
  }

  protected firstUpdated(changed: Map<PropertyKey, unknown>): void {
    super.firstUpdated(changed);
    this.relocateAria();
    this.observeAria();
  }
}
