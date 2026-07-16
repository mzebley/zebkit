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

import {
  LitElement,
  html,
  nothing,
  type PropertyDeclarations,
  type TemplateResult,
} from "lit";
import type { VariantConfig } from "@definitions/token-variants";
import type { SlotContract } from "./slot-contract";
import { ZEBKIT_PREFIX } from "@config";

let uidCounter = 0;

export interface AdoptedChildren {
  /** Unnamed authored children, in document order. */
  defaultContent: Node[];
  /** Children captured by `slot` attribute name. */
  named: Map<string, Node[]>;
}

export type IconPosition = "start" | "end";

export abstract class ZebkitElement extends LitElement {
  /** The pattern's common name in kebab-case, e.g. "button". Set per subclass. */
  static componentName = "";

  /** Variant configs registered for this component (its ./variants module). */
  static variantConfigs: ReadonlyArray<VariantConfig> = [];

  /**
   * The component's slot contract (its generated ./slot-contract module,
   * from zbk-{name}.manifest.json). Drives the unknown-slot and missing
   * required-content warnings. Set per subclass.
   */
  static slotContract?: SlotContract;

  /** Consumer variants registered via registerVariants, keyed by component name. */
  private static consumerVariants = new Map<string, Map<string, VariantConfig>>();

  /**
   * Register consumer variants (theme JSON overlays) so the `variant`
   * attribute accepts them. Accepts the same shapes as the build's variant
   * override files — a single entry, an array of entries, or a component-keyed
   * map — so the theme's `zbk-{component}.variants.json` can be imported and
   * passed straight through. Call before elements upgrade (e.g. before
   * `defineZebkitComponents()`); already-rendered elements won't recompute.
   *
   * The variant's CSS class comes from the token build; this only teaches the
   * runtime the name so the class is applied and validation lists it.
   */
  static registerVariants(source: unknown): void {
    for (const config of normalizeConsumerVariants(source)) {
      let byName = ZebkitElement.consumerVariants.get(config.component);
      if (!byName) {
        byName = new Map();
        ZebkitElement.consumerVariants.set(config.component, byName);
      }
      byName.set(config.name.toLowerCase(), config);
    }
  }

  /** Clear all consumer-registered variants (test hook). */
  static resetConsumerVariants(): void {
    ZebkitElement.consumerVariants.clear();
  }

  /** Components excluded by the build's components config. */
  private static excludedComponents = new Set<string>();

  /** Per-component shipped-variant allowlists from the components config. */
  private static variantAllowlists = new Map<string, Set<string>>();

  /** Excluded-component warnings already emitted (once per component). */
  private static warnedExcludedComponents = new Set<string>();

  /**
   * Mirror the build's `components` config at runtime so dev warnings match
   * the compiled CSS. Pass the exact `components` object from
   * zebkit.config.json: excluded components warn on first use (their styles
   * are not in the build), and shipped variants outside an allowlist stop
   * applying and warn with the allowed vocabulary instead of silently
   * rendering base styles. Consumer variants added via registerVariants are
   * never filtered.
   */
  static applyComponentsConfig(components: unknown): void {
    if (!components || typeof components !== "object" || Array.isArray(components)) return;
    for (const [name, entry] of Object.entries(components as Record<string, unknown>)) {
      const component = name.trim().toLowerCase();
      if (!component) continue;
      if (entry === false) {
        ZebkitElement.excludedComponents.add(component);
      } else if (
        entry !== true &&
        entry &&
        typeof entry === "object" &&
        Array.isArray((entry as { variants?: unknown }).variants)
      ) {
        ZebkitElement.variantAllowlists.set(
          component,
          new Set(
            ((entry as { variants: unknown[] }).variants ?? [])
              .filter((variant): variant is string => typeof variant === "string")
              .map((variant) => variant.trim().toLowerCase()),
          ),
        );
      }
    }
  }

  /** Clear the mirrored components config (test hook). */
  static resetComponentsConfig(): void {
    ZebkitElement.excludedComponents.clear();
    ZebkitElement.variantAllowlists.clear();
    ZebkitElement.warnedExcludedComponents.clear();
  }

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
  variant = "";

  private zbkUid = ++uidCounter;
  private adopted?: AdoptedChildren;
  private originalChildIndexes = new WeakMap<Node, number>();
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
        variant.classNameOverride ?? `${this.baseClass}--${variant.name}`,
      );
    }
    return classes.join(" ");
  }

  /** Generate a document-unique id for internal ARIA relationships. */
  protected uidFor(suffix: string): string {
    return `${this.baseClass}-${this.zbkUid}-${suffix}`;
  }

  // ---------------------------------------------------------------------------
  // Variants

  private parsedVariantNames(): string[] {
    return (this.variant ?? "")
      .split(/\s+/)
      .map((name) => name.trim().toLowerCase())
      .filter(Boolean);
  }

  /**
   * Shipped variant names removed by the components config's allowlist.
   * They cannot come back via registerVariants — their CSS is not in the build.
   */
  private excludedShippedVariantNames(): Set<string> {
    const allowlist = ZebkitElement.variantAllowlists.get(this.componentName);
    if (!allowlist) return new Set();
    const compiled = (this.constructor as typeof ZebkitElement).variantConfigs;
    return new Set(
      compiled
        .map((entry) => entry.name.toLowerCase())
        .filter((name) => !allowlist.has(name)),
    );
  }

  /**
   * The component's full variant vocabulary: compiled-in configs (minus any
   * removed by the components config's allowlist) plus consumer variants
   * registered at runtime. A consumer entry with a shipped name wins (the
   * build already merged its overrides into that variant's CSS).
   */
  private registeredVariantConfigs(): VariantConfig[] {
    const excludedShipped = this.excludedShippedVariantNames();
    const compiled = (
      this.constructor as typeof ZebkitElement
    ).variantConfigs.filter(
      (entry) => !excludedShipped.has(entry.name.toLowerCase()),
    );
    const consumer = ZebkitElement.consumerVariants.get(this.componentName);
    if (!consumer || consumer.size === 0) return [...compiled];

    const merged = compiled.map(
      (entry) => consumer.get(entry.name.toLowerCase()) ?? entry,
    );
    const compiledNames = new Set(
      compiled.map((entry) => entry.name.toLowerCase()),
    );
    for (const [name, entry] of consumer) {
      if (!compiledNames.has(name) && !excludedShipped.has(name)) {
        merged.push(entry);
      }
    }
    return merged;
  }

  /** The registered VariantConfigs matching the `variant` attribute, in order. */
  protected appliedVariants(): VariantConfig[] {
    const configs = this.registeredVariantConfigs();
    const applied: VariantConfig[] = [];
    for (const name of this.parsedVariantNames()) {
      const config = configs.find((entry) => entry.name.toLowerCase() === name);
      if (config) applied.push(config);
    }
    return applied;
  }

  /** Validate the `variant` attribute; every warning names the fix. */
  private validateVariants(): void {
    const configs = this.registeredVariantConfigs();
    const registered = configs.map((entry) => entry.name);
    const excludedShipped = this.excludedShippedVariantNames();

    for (const name of this.parsedVariantNames()) {
      if (configs.some((entry) => entry.name.toLowerCase() === name)) continue;
      if (excludedShipped.has(name)) {
        this.warn(
          `Variant "${name}" is excluded by the components config ` +
            `(components.${this.componentName}.variants) — its CSS is not in the build. ` +
            `Registered variants: ${registered.length > 0 ? registered.join(", ") : "(none)"}.`,
        );
        continue;
      }
      this.warn(
        `Unknown variant "${name}". Registered variants: ${
          registered.length > 0 ? registered.join(", ") : "(none)"
        }.`,
      );
    }

    // Same-axis conflicts: advisory, never blocking. The later class wins in CSS.
    const applied = this.appliedVariants();
    for (let i = 0; i < applied.length; i++) {
      for (let j = i + 1; j < applied.length; j++) {
        const a = applied[i];
        const b = applied[j];
        if (!a.axis || a.axis !== b.axis) continue;
        const overlap = Object.keys(a.overrides ?? {}).filter((key) =>
          Object.prototype.hasOwnProperty.call(b.overrides ?? {}, key),
        );
        if (overlap.length > 0) {
          this.warn(
            `Variants "${a.name}" and "${b.name}" share axis "${a.axis}" and both set ${overlap
              .map((key) => `--${ZEBKIT_PREFIX}-${this.componentName}-${key}`)
              .join(", ")}; the later class wins.`,
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
        if (attr.name !== "role" && !attr.name.startsWith("aria-")) continue;
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
          record.type === "attributes" &&
          record.attributeName &&
          (record.attributeName === "role" ||
            record.attributeName.startsWith("aria-")),
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

    for (const [index, node] of Array.from(this.childNodes).entries()) {
      this.originalChildIndexes.set(node, index);
      const slotName =
        node instanceof Element ? node.getAttribute("slot") : null;
      if (slotName) {
        const bucket = named.get(slotName) ?? [];
        bucket.push(node);
        named.set(slotName, bucket);
      } else {
        defaultContent.push(node);
      }
      node.parentNode?.removeChild(node);
    }

    // A slot name outside the contract lands in a bucket nothing renders —
    // the content would silently vanish. Name the fix (GRAMMAR.md §9).
    const contract = (this.constructor as typeof ZebkitElement).slotContract;
    if (contract) {
      const supported = contract.slots.filter((name) => name !== "default");
      for (const slotName of named.keys()) {
        if (!contract.slots.includes(slotName)) {
          this.warn(
            `Unknown slot "${slotName}" — its content will not render. ` +
              (supported.length > 0
                ? `Supported slots: ${supported.join(", ")}.`
                : `This component has no named slots; remove the slot attribute for default content.`),
          );
        }
      }
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
  // Icons

  protected renderIcon(
    position: IconPosition,
    name = "icon",
  ): TemplateResult | typeof nothing {
    const icons = this.iconsAt(position, name);
    if (icons.length === 0) return nothing;

    return html`<span
      class="${this.baseClass}__${name} ${this.baseClass}__${name}--${position}"
      aria-hidden="true"
      >${icons}</span
    >`;
  }

  protected iconsAt(position: IconPosition, name = "icon"): Node[] {
    return this.slotted(name).filter(
      (node) => this.iconPosition(node, name) === position,
    );
  }

  protected hasIcon(position?: IconPosition, name = "icon"): boolean {
    if (position === undefined) return this.hasSlotted(name);
    return this.iconsAt(position, name).length > 0;
  }

  /**
   * Explicit icon placement uses `data-position`, not `position`.
   * `position` is a CSS property name and is rejected by framework HTML typings
   * on normal child elements such as `<i>`, so unsupported values fall through
   * to authored-order inference.
   */
  protected iconPosition(node: Node, name = "icon"): IconPosition {
    if (node instanceof Element) {
      const position = node.getAttribute("data-position");
      if (position === "start" || position === "end") return position;
    }

    const iconIndex =
      this.originalChildIndexes.get(node) ?? Number.MAX_SAFE_INTEGER;
    const contentIndexes = this.meaningfulDefaultContent().map(
      (content) =>
        this.originalChildIndexes.get(content) ?? Number.MAX_SAFE_INTEGER,
    );

    if (contentIndexes.length > 0) {
      return iconIndex < Math.min(...contentIndexes) ? "start" : "end";
    }

    const iconIndexes = this.slotted(name).map(
      (icon) => this.originalChildIndexes.get(icon) ?? Number.MAX_SAFE_INTEGER,
    );
    return iconIndex === Math.min(...iconIndexes) ? "start" : "end";
  }

  private meaningfulDefaultContent(): Node[] {
    return this.slotted().filter((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        return Boolean(node.textContent?.trim());
      }
      return true;
    });
  }

  // ---------------------------------------------------------------------------
  // Diagnostics

  /** `[zbk-button] <message>` — every message names the fix (GRAMMAR.md §9). */
  protected warn(message: string): void {
    if (!(this.constructor as typeof ZebkitElement).warnings) return;
    console.warn(`[${this.baseClass}] ${message}`);
  }

  /**
   * The dev-mode warning for a required-but-empty accessible name, fired from
   * firstUpdated when the slot contract requires default content. Override to
   * tailor the fix text; return null to opt out (a component whose default
   * content is not its accessible name, e.g. a tooltip's trigger, warns with
   * its own semantics instead).
   */
  protected accessibleNameWarning(): string | null {
    return "No accessible name. Provide label text as children, or aria-label / aria-labelledby.";
  }

  /**
   * Rough accessible-name computation for the dev-mode nameless-control check:
   * visible text, aria-label, or aria-labelledby on the native element.
   */
  protected hasAccessibleName(): boolean {
    const target = this.nativeElement;
    if (!target) return false;
    if (target.textContent?.trim()) return true;
    if (target.getAttribute("aria-label")?.trim()) return true;
    const labelledBy = target.getAttribute("aria-labelledby");
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
    if (
      ZebkitElement.excludedComponents.has(this.componentName) &&
      !ZebkitElement.warnedExcludedComponents.has(this.componentName)
    ) {
      ZebkitElement.warnedExcludedComponents.add(this.componentName);
      this.warn(
        `<zbk-${this.componentName}> is excluded by the components config — its styles ` +
          `and tokens are not in the compiled CSS. Re-include it (components.${this.componentName}) ` +
          `or remove the element.`,
      );
    }
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.ariaObserver?.disconnect();
    this.ariaObserver = undefined;
  }

  protected willUpdate(changed: Map<PropertyKey, unknown>): void {
    super.willUpdate(changed);
    if (changed.has("variant")) this.validateVariants();
  }

  protected firstUpdated(changed: Map<PropertyKey, unknown>): void {
    super.firstUpdated(changed);
    this.relocateAria();
    this.observeAria();

    const contract = (this.constructor as typeof ZebkitElement).slotContract;
    if (contract?.required.includes("default")) {
      const message = this.accessibleNameWarning();
      if (message && !this.hasAccessibleName()) this.warn(message);
    }
  }
}

/**
 * Accepts every shape the build's variant override files use — single entry,
 * array, or component-keyed map — plus the compiled registry's `className`
 * field, and yields flat VariantConfigs. Browser-safe mirror of the build's
 * extractVariantOverrideEntries.
 */
function normalizeConsumerVariants(source: unknown): VariantConfig[] {
  if (!source || typeof source !== "object") return [];

  if (Array.isArray(source)) {
    return source.flatMap((entry) => normalizeConsumerVariantEntry(entry));
  }

  const record = source as Record<string, unknown>;
  if (typeof record.component === "string" && typeof record.name === "string") {
    return normalizeConsumerVariantEntry(record);
  }

  const configs: VariantConfig[] = [];
  for (const [componentKey, variants] of Object.entries(record)) {
    if (!variants || typeof variants !== "object") continue;
    if (Array.isArray(variants)) {
      for (const entry of variants) {
        configs.push(...normalizeConsumerVariantEntry(entry, componentKey));
      }
    } else {
      for (const [variantName, entry] of Object.entries(
        variants as Record<string, unknown>,
      )) {
        configs.push(
          ...normalizeConsumerVariantEntry(entry, componentKey, variantName),
        );
      }
    }
  }
  return configs;
}

function normalizeConsumerVariantEntry(
  entry: unknown,
  fallbackComponent?: string,
  fallbackName?: string,
): VariantConfig[] {
  if (!entry || typeof entry !== "object") return [];
  const raw = entry as Record<string, unknown>;

  const component =
    typeof raw.component === "string" && raw.component.trim()
      ? raw.component.trim()
      : fallbackComponent;
  const name =
    typeof raw.name === "string" && raw.name.trim()
      ? raw.name.trim()
      : fallbackName;
  if (!component || !name) return [];

  const overrides: Record<string, string> = {};
  if (raw.overrides && typeof raw.overrides === "object") {
    for (const [key, value] of Object.entries(
      raw.overrides as Record<string, unknown>,
    )) {
      if (typeof value === "string") overrides[key] = value;
    }
  }

  const className = raw.classNameOverride ?? raw.className;
  const config: VariantConfig = { component, name, overrides };
  if (typeof className === "string" && className.trim()) {
    config.classNameOverride = className.trim();
  }
  if (typeof raw.axis === "string" && raw.axis.trim()) {
    config.axis = raw.axis.trim();
  }
  if (typeof raw.description === "string" && raw.description.trim()) {
    config.description = raw.description.trim();
  }
  return [config];
}
