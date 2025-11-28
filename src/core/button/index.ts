import { buttonVariants } from "./variants/index";
import { buildVariantClassMap } from "@component-scripts/helpers";
import { ZEBKIT_PREFIX } from "@config";

type ButtonVariantEntry = (typeof buttonVariants)[number];

const REGISTERED_VARIANT_CLASSES: Record<string, string> = buildVariantClassMap(
  "button",
  ZEBKIT_PREFIX,
  buttonVariants as ButtonVariantEntry[]
);

/**
 * Interface defining the options for the ZbkButton component.
 */
export interface ZbkButtonOptions {
  /**
   * Optional list of variant names (space/comma separated in the `variant` attribute)
   * that will be converted into scoped variant classes (zbk-button--{name}).
   */
  variant?: string[];
}

/**
 * ZbkButton is a custom web component that creates an enhanced button element.
 * It provides additional functionality and styling options beyond a standard HTML button.
 */
export class ZbkButton extends HTMLElement {
  /** The actual button element that this component wraps. */
  private button: HTMLButtonElement;

  /** Stores the click handler function if provided. */
  private clickHandler: Function | null = null;

  /** Stores the bound handleClick reference for add/remove event listener symmetry. */
  private boundHandleClick: EventListener;

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
  private static defaultOptions: ZbkButtonOptions = {};

  /** Current options for this ZbkButton instance. */
  private options: ZbkButtonOptions = { ...ZbkButton.defaultOptions };

  /** Tracks the concrete classes applied for variants to enable removal. */
  private previousVariantClasses: string[] = [];
  /** Normalized class names sourced from the variant attribute. */
  private variantNames: string[] = [];

  /** Indicates if accessibility attributes are currently being migrated. */
  private isMigratingAccessibilityAttributes = false;

  /**
   * Specifies which attributes should be observed for changes.
   * Changes to these attributes will trigger the attributeChangedCallback.
   */
  static get observedAttributes() {
    return [
      "(click)",
      ...ZbkButton.accessibilityAttributes,
      "options",
      "variant",
    ];
  }

  /** MutationObserver to watch for class changes */
  private classObserver: MutationObserver;

  /**
   * Constructor for the ZbkButton component.
   * Initializes the button element and adds the base class.
   */
  constructor() {
    super();
    this.button = document.createElement("button");
    this.button.classList.add("zbk-button");
    this.boundHandleClick = this.handleClick.bind(this);
    // Initialize the MutationObserver
    this.classObserver = new MutationObserver(
      this.handleClassChanges.bind(this)
    );
  }

  /**
   * Lifecycle callback that runs when the component is added to the DOM.
   * Sets up the button, event listeners, and initial state.
   */
  connectedCallback() {
    this.setupButton();
    this.button.addEventListener("click", this.boundHandleClick);
    this.updateClickHandler();
    this.setupAccessibility();
    this.parseOptions();
    this.mirrorClasses();

    // Start observing class changes
    this.classObserver.observe(this, {
      attributes: true,
      attributeFilter: ["class"],
    });

    // Use requestAnimationFrame to defer showing the button
    requestAnimationFrame(() => {
      this.classList.add("zbk-button-ready");
    });
  }

  /**
   * Lifecycle callback that runs when the component is removed from the DOM.
   * Removes the click event listener and class observer
   */
  disconnectedCallback() {
    this.button.removeEventListener("click", this.boundHandleClick);
    this.classObserver.disconnect();
  }

  /**
   * Handles class changes on the custom element.
   * @param mutations - MutationRecord objects describing the changes.
   */
  private handleClassChanges(mutations: MutationRecord[]) {
    mutations.forEach((mutation) => {
      if (
        mutation.type === "attributes" &&
        mutation.attributeName === "class"
      ) {
        this.mirrorClasses();
      }
    });
  }

  /**
   * Mirrors classes from the custom element to the internal button.
   */
  private mirrorClasses() {
    // Get all classes from the custom element
    const elementClasses = Array.from(this.classList);

    // Remove all existing mirrored classes from the button
    this.button.classList.forEach((cls) => {
      if (cls !== "zbk-button" && !cls.startsWith("zbk-button--")) {
        this.button.classList.remove(cls);
      }
    });

    // Add all classes from the custom element to the button
    elementClasses.forEach((cls) => {
      if (cls !== "zbk-button-ready") {
        this.button.classList.add(cls);
      }
    });
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
    } else if (ZbkButton.accessibilityAttributes.includes(name)) {
      if (this.isMigratingAccessibilityAttributes) {
        return;
      }
      this.updateAccessibilityAttribute(name, newValue);
    } else if (
      name === "options" ||
      name === "icon-position" ||
      name === "variant"
    ) {
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
      (updatedOptions.variant || []).filter(Boolean)
    );

    if (newOptions) {
      updatedOptions = { ...updatedOptions, ...newOptions };
      (newOptions.variant || []).forEach((v) => v && variantSet.add(v));
    } else {
      // Parse options from the 'options' attribute
      const optionsAttr = this.getAttribute("options");
      if (optionsAttr) {
        try {
          const parsedOptions = JSON.parse(optionsAttr);
          updatedOptions = { ...updatedOptions, ...parsedOptions };
          (parsedOptions.variant || []).forEach((v: string) => v && variantSet.add(v));
        } catch (error) {
          console.warn("Error parsing options:", error);
          console.warn(
            "Falling back to current options and individual attributes"
          );
        }
      }

      const variantAttr = this.getAttribute("variant");
      if (variantAttr) {
        variantAttr
          .split(/[\s,]+/)
          .map((v) => v.trim())
          .filter(Boolean)
          .forEach((v) => variantSet.add(v));
      }

      updatedOptions.variant = Array.from(variantSet);
    }

    this.options = updatedOptions;
    this.variantNames = Array.from(new Set(variantSet));
    this.applyOptions();
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
  }

  /**
   * Sets up the initial structure of the button.
   */
  private setupButton() {
    const button = this.button;

    const children = Array.from(this.childNodes);
    for (const child of children) {
      if (child === button) continue;
      if (child instanceof HTMLElement && child.getAttribute("slot") === "icon") {
        if (!child.classList.contains("zbk-icon")) {
          child.classList.add("zbk-icon");
        }
      }
      button.appendChild(child);
    }

    if (!button.classList.contains("zbk-button")) {
      button.classList.add("zbk-button");
    }

    if (button.parentElement !== this) {
      this.appendChild(button);
    }
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

    // If no accessible name is provided, use the sanitized button's text content or log a warning
    if (
      !this.button.getAttribute("aria-label") &&
      !this.button.getAttribute("aria-labelledby")
    ) {
      const buttonText = this.button.textContent?.trim();
      if (buttonText) {
        const sanitizedText = this.sanitizeText(buttonText);
        this.button.setAttribute("aria-label", sanitizedText);
      } else {
        console.warn(
          "ZbkButton: No accessible name provided. Please add an aria-label or aria-labelledby attribute."
        );
      }
    }

    // If role is not provided, set it to "button"
    if (!this.button.getAttribute("role")) {
      this.button.setAttribute("role", "button");
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
   * Sets the disabled state of the button.
   * @param isDisabled - Whether the button should be disabled.
   */
  setDisabledState(isDisabled: boolean): void {
    this.button.disabled = isDisabled;
    if (isDisabled) {
      this.button.setAttribute("aria-disabled", "true");
    } else {
      this.button.removeAttribute("aria-disabled");
    }
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
    this.button.textContent = text;
    // Update aria-label if it was previously auto-generated
    if (
      !this.getAttribute("aria-label") &&
      !this.getAttribute("aria-labelledby")
    ) {
      const sanitizedText = this.sanitizeText(text);
      this.button.setAttribute("aria-label", sanitizedText);
    }
  }

  /**
   * Gets the current text content of the button.
   * @returns The current text content of the button.
   */
  getButtonText(): string {
    return this.button.textContent || "";
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

      classes.push(registeredClass);

    }

    return Array.from(new Set(classes));
  }
}

/**
 * Helper function to define the custom element.
 * This function checks if the custom element is already defined before defining it.
 */
export function defineZbkButton() {
  if (typeof window !== "undefined" && !customElements.get("zbk-button")) {
    customElements.define("zbk-button", ZbkButton);
  }
}
