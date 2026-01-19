import { buttonVariants } from "./variants/index";
import { buildVariantClassMap } from "@component-scripts/helpers";
import { ZEBKIT_PREFIX } from "@config";

type ButtonVariantEntry = (typeof buttonVariants)[number];

const REGISTERED_VARIANT_CLASSES: Record<string, string> = buildVariantClassMap(
  "button",
  ZEBKIT_PREFIX,
  buttonVariants as ButtonVariantEntry[]
);

const CSS_VAR_PREFIX = `--${ZEBKIT_PREFIX}-button-`;
const buttonVar = (name: string): string => `var(${CSS_VAR_PREFIX}${name})`;

const BUTTON_SHADOW_STYLES = `
  :host {
    display: inline-block;
  }

  :host([hidden]) {
    display: none;
  }

  button {
    /* Core text & color */
    color: ${buttonVar("ink")};
    background-color: ${buttonVar("canvas")};
    border-color: ${buttonVar("border-color")};

    /* Border geometry */
    border-width: ${buttonVar("border-width")};
    border-style: ${buttonVar("border-style")};
    border-radius: ${buttonVar("border-radius")};

    /* Typography */
    font-family: ${buttonVar("font-family")};
    font-size: ${buttonVar("font-size")};
    font-weight: ${buttonVar("font-weight")};
    line-height: ${buttonVar("line-height")};
    letter-spacing: ${buttonVar("letter-spacing")};
    text-transform: ${buttonVar("text-transform")};
    text-decoration: ${buttonVar("text-decoration")};
    text-align: ${buttonVar("text-align")};

    /* Layout & sizing */
    display: ${buttonVar("display")};
    width: ${buttonVar("width")};
    min-width: ${buttonVar("min-width")};
    max-width: ${buttonVar("max-width")};
    height: ${buttonVar("height")};
    min-height: ${buttonVar("min-height")};
    max-height: ${buttonVar("max-height")};

    /* Internal spacing (padding) */
    padding-block: ${buttonVar("padding-block")};
    padding-inline: ${buttonVar("padding-inline")};

    /* Optional directional overrides */
    padding-inline-start: ${buttonVar("padding-inline-start")};
    padding-inline-end: ${buttonVar("padding-inline-end")};
    padding-block-start: ${buttonVar("padding-block-start")};
    padding-block-end: ${buttonVar("padding-block-end")};

    /* External spacing (margin) */
    margin-inline: ${buttonVar("margin-inline")};
    margin-block: ${buttonVar("margin-block")};
    margin-inline-start: ${buttonVar("margin-inline-start")};
    margin-inline-end: ${buttonVar("margin-inline-end")};
    margin-block-start: ${buttonVar("margin-block-start")};
    margin-block-end: ${buttonVar("margin-block-end")};

    /* Layout alignment (flex-based button content) */
    flex-direction: ${buttonVar("flex-direction")};
    justify-content: ${buttonVar("justify-content")};
    align-items: ${buttonVar("align-items")};

    /* Focus ring */
    outline: none;

    /* Shadows / elevation */
    box-shadow: ${buttonVar("box-shadow")};

    /* Interaction behavior */
    cursor: ${buttonVar("cursor")};

    /* Transitions */
    transition-property: ${buttonVar("transition-property")};
    transition-duration: ${buttonVar("transition-duration")};
    transition-timing-function: ${buttonVar("transition-timing-function")};
    transition-delay: ${buttonVar("transition-delay")};

    /* Other */
    opacity: ${buttonVar("opacity")};
    gap: ${buttonVar("gap")};
  }

  :host(:hover) button {
    color: ${buttonVar("ink-hover")};
    background-color: ${buttonVar("canvas-hover")};
    border-color: ${buttonVar("border-color-hover")};
    box-shadow: ${buttonVar("box-shadow-hover")};
  }

  :host(:active) button {
    color: ${buttonVar("ink-active")};
    background-color: ${buttonVar("canvas-active")};
    border-color: ${buttonVar("border-color-selected")};
    box-shadow: ${buttonVar("box-shadow-active")};
  }

  button:focus-visible {
    outline-color: ${buttonVar("focus-color")};
    outline-width: ${buttonVar("focus-width")};
    outline-style: solid;
    outline-offset: ${buttonVar("focus-offset")};
    box-shadow: ${buttonVar("box-shadow-focus")};
  }

  button:disabled,
  button[aria-disabled='true'] {
    color: ${buttonVar("ink-disabled")};
    background-color: ${buttonVar("canvas-disabled")};
    border-color: ${buttonVar("border-color-disabled")};
    box-shadow: none;
    opacity: ${buttonVar("opacity")};
    cursor: not-allowed;
    pointer-events: none;
  }

  slot[name='icon'] {
    display: none;
  }

  :host([data-has-icon]) slot[name='icon'] {
    display: contents;
  }

  ::slotted([slot='icon']),
  [data-fallback-icon] {
    inline-size: ${buttonVar("icon-size")};
    block-size: ${buttonVar("icon-size")};
    flex-shrink: 0;
  }

  [data-fallback-icon] {
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  :host(:not([data-has-icon])) [data-fallback-icon] {
    display: none;
  }
`;

// Shadow DOM template uses slots with fallback content to enable icon-class usage.
const SHADOW_TEMPLATE = document.createElement("template");
SHADOW_TEMPLATE.innerHTML = `
  <style>${BUTTON_SHADOW_STYLES}</style>
  <button part="button" class="zbk-button" type="button">
    <slot name="icon" part="icon-slot">
      <span data-fallback-icon part="icon" class="zbk-icon" aria-hidden="true"></span>
    </slot>
    <slot>
      <span data-fallback-label></span>
    </slot>
  </button>
`;

/**
 * Interface defining the options for the ZbkButton component.
 */
export interface ZbkButtonOptions {
  /**
   * Optional list of variant names (space/comma separated in the `variant` attribute)
   * that will be converted into scoped variant classes (zbk-button--{name}).
   */
  variant?: string | string[];
  /**
   * Optional icon class used to render the fallback icon when no icon slot is provided.
   * Intended for icon font systems like Tabler.
   */
  iconClass?: string;
}

/**
 * ZbkButton is a custom web component that creates an enhanced button element.
 * It provides additional functionality and styling options beyond a standard HTML button.
 */
export class ZbkButton extends HTMLElement {
  /** Shadow root that owns the internal button markup. */
  private shadowRootRef: ShadowRoot;

  /** The actual button element that this component wraps. */
  private button: HTMLButtonElement;

  /** Named slot for icons so consumers can project custom SVGs. */
  private iconSlot: HTMLSlotElement;

  /** Default slot for label content. */
  private labelSlot: HTMLSlotElement;

  /** Fallback icon element when no icon slot is provided. */
  private fallbackIcon: HTMLElement;

  /** Fallback label element when the default slot is empty. */
  private fallbackLabel: HTMLElement;

  /** Tracks when a named icon slot is populated. */
  private hasIconSlot = false;

  /** Tracks when the default slot is populated. */
  private hasLabelSlot = false;

  /** Stores the click handler function if provided. */
  private clickHandler: Function | null = null;

  /** Stores the bound handleClick reference for add/remove event listener symmetry. */
  private boundHandleClick: EventListener;

  /** Stores the bound slot change handlers for add/remove symmetry. */
  private boundHandleIconSlotChange: EventListener;
  private boundHandleLabelSlotChange: EventListener;

  /** Accessibility-related attributes that should be synced to the inner button. */
  private static readonly accessibilityAttributes = [
    "aria-label",
    "aria-describedby",
    "aria-pressed",
    "aria-expanded",
    "aria-controls",
    "role",
    "tabindex",
  ];

  /** Default options for all ZbkButton instances. */
  static defaultOptions: ZbkButtonOptions = {};

  /** Current options for this ZbkButton instance. */
  private options: ZbkButtonOptions = { ...ZbkButton.defaultOptions };

  /** Tracks the concrete classes applied for variants to enable removal. */
  private previousVariantClasses: string[] = [];
  /** Normalized class names sourced from the variant attribute. */
  private variantNames: string[] = [];

  /** Indicates if accessibility attributes are currently being migrated. */
  private isMigratingAccessibilityAttributes = false;
  /** Indicates when disabled changes are being synced from internal APIs. */
  private isSyncingDisabledAttribute = false;

  /**
   * Specifies which attributes should be observed for changes.
   * Changes to these attributes will trigger the attributeChangedCallback.
   */
  static get observedAttributes() {
    return [
      "(click)",
      "disabled",
      "icon-class",
      ...ZbkButton.accessibilityAttributes,
      "options",
      "variant",
    ];
  }

  /**
   * Constructor for the ZbkButton component.
   * Initializes the shadow DOM structure, slots, and event handlers.
   */
  constructor() {
    super();
    this.shadowRootRef = this.attachShadow({ mode: "open" });
    this.shadowRootRef.appendChild(
      SHADOW_TEMPLATE.content.cloneNode(true)
    );

    const button = this.shadowRootRef.querySelector("button");
    if (!(button instanceof HTMLButtonElement)) {
      throw new Error("ZbkButton: internal button element missing.");
    }

    const iconSlot = this.shadowRootRef.querySelector("slot[name='icon']");
    if (!(iconSlot instanceof HTMLSlotElement)) {
      throw new Error("ZbkButton: icon slot missing.");
    }

    const labelSlot = this.shadowRootRef.querySelector("slot:not([name])");
    if (!(labelSlot instanceof HTMLSlotElement)) {
      throw new Error("ZbkButton: label slot missing.");
    }

    const fallbackIcon = this.shadowRootRef.querySelector(
      "[data-fallback-icon]"
    );
    if (!(fallbackIcon instanceof HTMLElement)) {
      throw new Error("ZbkButton: fallback icon element missing.");
    }

    const fallbackLabel = this.shadowRootRef.querySelector(
      "[data-fallback-label]"
    );
    if (!(fallbackLabel instanceof HTMLElement)) {
      throw new Error("ZbkButton: fallback label element missing.");
    }

    this.button = button;
    this.iconSlot = iconSlot;
    this.labelSlot = labelSlot;
    this.fallbackIcon = fallbackIcon;
    this.fallbackLabel = fallbackLabel;

    this.boundHandleClick = this.handleClick.bind(this);
    this.boundHandleIconSlotChange = this.handleIconSlotChange.bind(this);
    this.boundHandleLabelSlotChange = this.handleLabelSlotChange.bind(this);
  }

  /**
   * Lifecycle callback that runs when the component is added to the DOM.
   * Sets up the button, event listeners, and initial state.
   */
  connectedCallback() {
    if (!this.classList.contains("zbk-button")) {
      this.classList.add("zbk-button");
    }
    this.button.addEventListener("click", this.boundHandleClick);
    this.iconSlot.addEventListener("slotchange", this.boundHandleIconSlotChange);
    this.labelSlot.addEventListener("slotchange", this.boundHandleLabelSlotChange);

    this.updateClickHandler();
    this.setupAccessibility();
    this.parseOptions();
    this.handleIconSlotChange();
    this.handleLabelSlotChange();

    // Use requestAnimationFrame to defer showing the button
    requestAnimationFrame(() => {
      this.classList.add("zbk-button-ready");
    });
  }

  /**
   * Lifecycle callback that runs when the component is removed from the DOM.
   * Removes the click event listener and slot observers.
   */
  disconnectedCallback() {
    this.button.removeEventListener("click", this.boundHandleClick);
    this.iconSlot.removeEventListener(
      "slotchange",
      this.boundHandleIconSlotChange
    );
    this.labelSlot.removeEventListener(
      "slotchange",
      this.boundHandleLabelSlotChange
    );
  }

  /**
   * Lifecycle callback that runs when an observed attribute changes.
   * @param name - The name of the attribute that changed.
   * @param _oldValue - The old value of the attribute.
   * @param newValue - The new value of the attribute.
   */
  attributeChangedCallback(
    name: string,
    _oldValue: string | null,
    newValue: string | null
  ) {
    if (name === "(click)") {
      this.updateClickHandler();
    } else if (name === "disabled") {
      if (this.isSyncingDisabledAttribute) {
        return;
      }
      this.updateDisabledState(newValue !== null);
    } else if (name === "icon-class") {
      this.parseOptions({ iconClass: newValue ?? undefined });
    } else if (ZbkButton.accessibilityAttributes.includes(name)) {
      if (this.isMigratingAccessibilityAttributes) {
        return;
      }
      this.updateAccessibilityAttribute(name, newValue);
    } else if (name === "options" || name === "variant") {
      this.parseOptions();
    }
  }

  /**
   * Parses and updates the component's options.
   * @param newOptions - Optional object containing new options to apply.
   */
  private parseOptions(newOptions?: Partial<ZbkButtonOptions>) {
    // Start with current options and normalized variant set
    let updatedOptions: ZbkButtonOptions = { ...this.options };
    const variantSet: Set<string> = new Set(
      this.normalizeVariantInput(updatedOptions.variant)
    );

    const mergeVariants = (value?: string | string[] | null) => {
      this.normalizeVariantInput(value).forEach((v) => variantSet.add(v));
    };

    if (newOptions) {
      updatedOptions = { ...updatedOptions, ...newOptions };
      mergeVariants(newOptions.variant);
    } else {
      // Parse options from the 'options' attribute
      const optionsAttr = this.getAttribute("options");
      if (optionsAttr) {
        try {
          const parsedOptions = JSON.parse(optionsAttr);
          updatedOptions = { ...updatedOptions, ...parsedOptions };
          mergeVariants(parsedOptions.variant);
        } catch (error) {
          console.warn("Error parsing options:", error);
          console.warn(
            "Falling back to current options and individual attributes"
          );
        }
      }

      mergeVariants(this.getAttribute("variant"));
      updatedOptions.iconClass =
        this.getAttribute("icon-class") ?? updatedOptions.iconClass;
    }

    updatedOptions.variant = Array.from(variantSet);

    this.options = updatedOptions;
    this.variantNames = Array.from(new Set(variantSet));
    this.applyOptions();
  }

  /**
   * Normalizes different variant inputs to a trimmed string array.
   */
  private normalizeVariantInput(
    value?: string | string[] | null
  ): string[] {
    if (!value) {
      return [];
    }

    if (Array.isArray(value)) {
      return value.map((v) => v.trim()).filter(Boolean);
    }

    return value
      .split(/[\s,]+/)
      .map((v) => v.trim())
      .filter(Boolean);
  }

  /**
   * Applies the current options to the button's layout.
   */
  private applyOptions() {
    // Remove previously applied variant classes
    if (this.previousVariantClasses.length > 0) {
      this.classList.remove(...this.previousVariantClasses);
    }

    const variantClasses = this.resolveVariantClasses(this.variantNames);
    if (variantClasses.length > 0) {
      this.classList.add(...variantClasses);
    }
    this.previousVariantClasses = variantClasses;

    this.renderIconFallback();
  }

  /**
   * Handles the click event on the button.
   * @param event - The click event object.
   */
  private handleClick(event: Event) {
    if (!this.button.disabled) {
      this.dispatchEvent(
        new CustomEvent("z-click", {
          bubbles: true,
          composed: true,
          detail: event,
        })
      );

      if (this.clickHandler) {
        this.clickHandler(event);
      }
    }
  }

  /**
   * Updates the click handler based on the (click) attribute.
   */
  private updateClickHandler() {
    const clickAttr = this.getAttribute("(click)");
    if (clickAttr) {
      this.clickHandler = new Function("event", clickAttr) as Function;
    } else {
      this.clickHandler = null;
    }
  }

  /**
   * Syncs slotted icon nodes and flags when an icon is provided.
   */
  private handleIconSlotChange() {
    const assigned = this.getAssignedLightNodes(this.iconSlot);
    this.hasIconSlot = assigned.length > 0;

    assigned.forEach((node) => {
      if (node instanceof HTMLElement && !node.classList.contains("zbk-icon")) {
        node.classList.add("zbk-icon");
      }
    });

    if (this.hasIconSlot && this.options.iconClass) {
      console.warn(
        "ZbkButton: icon-class is ignored because a slot=\"icon\" node was provided."
      );
    }

    this.updateIconState();
  }

  /**
   * Updates label slot state so accessible naming can use visible content.
   */
  private handleLabelSlotChange() {
    const assigned = this.getAssignedLightNodes(this.labelSlot);
    this.hasLabelSlot = assigned.length > 0;
    this.updateAccessibleName();
  }

  /**
   * Updates the fallback icon element based on icon-class and slot presence.
   */
  private renderIconFallback() {
    const iconClass = this.options.iconClass?.trim() ?? "";
    const shouldShowFallback = Boolean(iconClass) && !this.hasIconSlot;

    this.fallbackIcon.className = "zbk-icon";
    if (iconClass) {
      iconClass.split(/\s+/).forEach((cls) => {
        if (cls) this.fallbackIcon.classList.add(cls);
      });
    }

    this.fallbackIcon.toggleAttribute("hidden", !shouldShowFallback);
    this.updateIconState();
  }

  /**
   * Sets a host attribute so CSS can avoid layout gaps when no icon exists.
   */
  private updateIconState() {
    const hasIcon = this.hasIconSlot || Boolean(this.options.iconClass?.trim());
    this.toggleAttribute("data-has-icon", hasIcon);
  }

  /**
   * Sets up accessibility attributes and ensures proper ARIA support.
   */
  private setupAccessibility() {
    // Ensure the button has a type
    if (!this.button.getAttribute("type")) {
      this.button.setAttribute("type", "button");
    }

    // Transfer existing accessibility attributes
    this.isMigratingAccessibilityAttributes = true;
    try {
      ZbkButton.accessibilityAttributes.forEach((attr) => {
        const value = this.getAttribute(attr);
        if (value !== null) {
          this.updateAccessibilityAttribute(attr, value);
          this.removeAttribute(attr);
        }
      });
    } finally {
      this.isMigratingAccessibilityAttributes = false;
    }

    // If role is not provided, set it to "button"
    if (!this.button.getAttribute("role")) {
      this.button.setAttribute("role", "button");
    }

    if (this.hasAttribute("disabled")) {
      this.updateDisabledState(true);
    }
  }

  /**
   * Computes a fallback accessible label from slotted or fallback text.
   */
  private getAccessibleLabelText(): string | null {
    const assigned = this.getAssignedLightNodes(this.labelSlot);
    const assignedText = assigned
      .map((node) => node.textContent ?? "")
      .join(" ")
      .trim();

    if (assignedText) {
      return this.sanitizeText(assignedText);
    }

    const fallbackText = this.fallbackLabel.textContent?.trim();
    if (fallbackText) {
      return this.sanitizeText(fallbackText);
    }

    const hostText = this.textContent?.trim();
    if (hostText) {
      return this.sanitizeText(hostText);
    }

    return null;
  }

  /**
   * Returns only light DOM nodes assigned to a slot, excluding fallback content.
   */
  private getAssignedLightNodes(slot: HTMLSlotElement): Node[] {
    const assigned = slot.assignedNodes({ flatten: true });
    return assigned.filter((node) => node.getRootNode() !== this.shadowRootRef);
  }

  /**
   * Updates the aria-label when no explicit name is provided.
   */
  private updateAccessibleName() {
    if (
      !this.button.getAttribute("aria-label") &&
      !this.button.getAttribute("aria-labelledby")
    ) {
      const labelText = this.getAccessibleLabelText();
      if (labelText) {
        this.button.setAttribute("aria-label", labelText);
      } else {
        console.warn(
          "ZbkButton: No accessible name provided. Please add an aria-label or aria-labelledby attribute."
        );
      }
    }
  }

  /**
   * Sanitizes text for use in attributes.
   * @param text - The text to sanitize.
   * @returns The sanitized text.
   */
  private sanitizeText(text: string): string {
    // Remove any character that isn't alphanumeric, space, or hyphen
    let sanitized = text.replace(/[^a-zA-Z0-9\s-]/g, "");
    // Replace spaces with hyphens
    sanitized = sanitized.replace(/\s+/g, "-");
    // Remove any leading or trailing hyphens
    sanitized = sanitized.replace(/^-+|-+$/g, "");
    // Convert to lowercase
    return sanitized.toLowerCase();
  }

  /**
   * Updates an accessibility attribute on the button.
   * @param name - The name of the attribute to update.
   * @param value - The new value for the attribute.
   */
  private updateAccessibilityAttribute(name: string, value: string | null) {
    if (
      this.isMigratingAccessibilityAttributes &&
      value === null &&
      ZbkButton.accessibilityAttributes.includes(name)
    ) {
      return;
    }
    if (value === null) {
      this.button.removeAttribute(name);
      return;
    }

    // At this point, TypeScript knows that value is a string
    this.button.setAttribute(name, value);
    // Special handling for certain attributes
    switch (name) {
      case "aria-pressed":
      case "aria-expanded":
        if (value === "true" || value === "false") {
          this.button.setAttribute(name, value);
        } else {
          console.warn(
            `ZbkButton: Invalid value for ${name}. Expected "true" or "false".`
          );
        }
        break;
      case "tabindex":
        if (value === "" || value === "-1" || /^\d+$/.test(value)) {
          // Valid values: empty string, -1, or any non-negative integer
          const tabIndexValue = value === "" ? 0 : parseInt(value, 10);
          this.button.tabIndex = tabIndexValue;
        } else {
          console.warn(
            `ZbkButton: Invalid tabindex value "${value}". Expected -1, a non-negative integer, or empty string. Disregarding and removing attribute.`
          );
          this.button.removeAttribute(name);
        }
        break;
      default:
        this.button.setAttribute(name, value);
    }
  }

  /**
   * Syncs the disabled state onto the internal button and aria-disabled state.
   */
  private updateDisabledState(isDisabled: boolean): void {
    this.button.disabled = isDisabled;
    if (isDisabled) {
      this.button.setAttribute("aria-disabled", "true");
    } else {
      this.button.removeAttribute("aria-disabled");
    }
  }

  /**
   * Sets the disabled state of the button.
   * @param isDisabled - Whether the button should be disabled.
   */
  setDisabledState(isDisabled: boolean): void {
    this.isSyncingDisabledAttribute = true;
    try {
      if (isDisabled && !this.hasAttribute("disabled")) {
        this.setAttribute("disabled", "");
      } else if (!isDisabled && this.hasAttribute("disabled")) {
        this.removeAttribute("disabled");
      }
    } finally {
      this.isSyncingDisabledAttribute = false;
    }
    this.updateDisabledState(isDisabled);
  }

  /**
   * Gets the current disabled state of the button.
   * @returns The disabled state of the button.
   */
  getDisabledState(): boolean {
    return this.button.disabled;
  }

  /**
   * Updates the options for the button.
   * @param newOptions - The new options to apply.
   */
  updateOptions(newOptions: Partial<ZbkButtonOptions>): void {
    this.parseOptions(newOptions);
  }

  /**
   * Sets the text content of the button.
   * @param text - The new text for the button.
   */
  setButtonText(text: string): void {
    this.fallbackLabel.textContent = text;
    if (!this.hasLabelSlot) {
      this.updateAccessibleName();
      return;
    }

    console.warn(
      "ZbkButton: setButtonText updated the fallback label, but slotted content is present. Update the slotted content directly to change the visible label."
    );
  }

  /**
   * Gets the current text content of the button.
   * @returns The current text content of the button.
   */
  getButtonText(): string {
    return this.fallbackLabel.textContent || "";
  }

  /**
   * Sets the aria-pressed state of the button.
   * @param isPressed - Whether the button is in a pressed state.
   */
  setAriaPressed(isPressed: boolean): void {
    this.button.setAttribute("aria-pressed", isPressed.toString());
  }

  /**
   * Sets the aria-expanded state of the button.
   * @param isExpanded - Whether the button is in an expanded state.
   */
  setAriaExpanded(isExpanded: boolean): void {
    this.button.setAttribute("aria-expanded", isExpanded.toString());
  }

  /**
   * Resolve variant names into concrete class names. Uses registered variants
   * when available and also applies legacy classes for compatibility.
   */
  private resolveVariantClasses(variantNames: string[]): string[] {
    const classes: string[] = [];

    for (const name of variantNames) {
      const normalized = name.toLowerCase();
      const registeredClass =
        REGISTERED_VARIANT_CLASSES[normalized] ||
        `${ZEBKIT_PREFIX}-button--${normalized}`;

      if (!classes.includes(registeredClass)) {
        classes.push(registeredClass);
      }

      // Ensure the base variant class is always added for compatibility
      const legacyClass = `${ZEBKIT_PREFIX}-button--${normalized}`;
      if (!classes.includes(legacyClass)) {
        classes.push(legacyClass);
      }
    }

    return classes;
  }
}

export const defineZbkButton = () => {
  if (typeof window !== "undefined" && !customElements.get("zbk-button")) {
    customElements.define("zbk-button", ZbkButton);
  }
};

export default ZbkButton;
