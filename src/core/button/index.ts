/**
 * Interface defining the options for the ZButton component.
 */
export interface ZButtonOptions {
  /** Specifies the position of the icon within the button. */
  iconPosition?: "start" | "end";
  /** Specifies the variant class applied to the button. */
  variant?: "flat" | "raised" | "outline" | "unstyled";
   /** Specifies the size class applied to the button. */
  size?: "xs" | "sm" | "md" | "lg" | "xl";
}

/**
 * ZButton is a custom web component that creates an enhanced button element.
 * It provides additional functionality and styling options beyond a standard HTML button.
 */
export class ZButton extends HTMLElement {
  /** The actual button element that this component wraps. */
  private button: HTMLButtonElement;

  /** Stores the click handler function if provided. */
  private clickHandler: Function | null = null;

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

  /** Default options for all ZButton instances. */
  private static defaultOptions: ZButtonOptions = {
    iconPosition: "start",
    variant: "outline",
    size: "md",
  };

  /** Current options for this ZButton instance. */
  private options: ZButtonOptions = { ...ZButton.defaultOptions };

  /** Indicates if accessibility attributes are currently being migrated. */
  private isMigratingAccessibilityAttributes = false;

  /**
   * Specifies which attributes should be observed for changes.
   * Changes to these attributes will trigger the attributeChangedCallback.
   */
  static get observedAttributes() {
    return [
      "(click)",
      ...ZButton.accessibilityAttributes,
      "icon-position",
      "options",
      "variant",
      "size",
    ];
  }

  /** MutationObserver to watch for class changes */
  private classObserver: MutationObserver;

  /**
   * Constructor for the ZButton component.
   * Initializes the button element and adds the base class.
   */
  constructor() {
    super();
    this.button = document.createElement("button");
    this.button.classList.add("z-button");
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
    this.button.addEventListener("click", this.handleClick.bind(this));
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
      this.classList.add("z-button-ready");
    });
  }

  /**
   * Lifecycle callback that runs when the component is removed from the DOM.
   * Removes the click event listener and class observer
   */
  disconnectedCallback() {
    this.button.removeEventListener("click", this.handleClick.bind(this));
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
      if (cls !== "z-button" && !cls.startsWith("z-button__")) {
        this.button.classList.remove(cls);
      }
    });

    // Add all classes from the custom element to the button
    elementClasses.forEach((cls) => {
      if (cls !== "z-button-ready") {
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
    } else if (ZButton.accessibilityAttributes.includes(name)) {
      if (this.isMigratingAccessibilityAttributes) {
        return;
      }
      this.updateAccessibilityAttribute(name, newValue);
    } else if (
      name === "options" ||
      name === "icon-position" ||
      name === "variant" ||
      name === "size"
    ) {
      this.parseOptions();
    }
  }

  /**
   * Parses and updates the component's options.
   * @param newOptions - Optional object containing new options to apply.
   */
  private parseOptions(newOptions?: Partial<ZButtonOptions>) {
    // Start with the current options
    let updatedOptions: ZButtonOptions = { ...this.options };

    if (newOptions) {
      // If newOptions is provided, merge it with current options
      updatedOptions = { ...updatedOptions, ...newOptions };
    } else {
      // Parse options from the 'options' attribute
      const optionsAttr = this.getAttribute("options");
      if (optionsAttr) {
        try {
          const parsedOptions = JSON.parse(optionsAttr);
          updatedOptions = { ...updatedOptions, ...parsedOptions };
        } catch (error) {
          console.warn("Error parsing options:", error);
          console.warn(
            "Falling back to current options and individual attributes"
          );
        }
      }

      // Parse individual option attributes
      const iconPosition = this.getAttribute("icon-position");
      if (iconPosition === "start" || iconPosition === "end") {
        updatedOptions.iconPosition = iconPosition;
      }

      const variant = this.getAttribute("variant");
      if (
        variant === "flat" ||
        variant === "raised" ||
        variant === "outline" ||
        variant === "unstyled"
      ) {
        updatedOptions.variant = variant;
      }

      const size = this.getAttribute("size");
      if (
        size === "xs" ||
        size === "sm" ||
        size === "md" ||
        size === "lg" ||
        size === "xl"
      ) {
        updatedOptions.size = size;
      }
    }

    // Update the options
    this.options = updatedOptions;
    this.applyOptions();
  }

  /**
   * Applies the current options to the button's layout.
   */
  private applyOptions() {
    const iconWrapper = this.button.querySelector(
      ".z-button__icon"
    ) as HTMLElement;
    const contentWrapper = this.button.querySelector(
      ".z-button__front"
    ) as HTMLElement;

    if (iconWrapper && contentWrapper) {
      if (this.options.iconPosition === "end") {
        contentWrapper.appendChild(iconWrapper);
      } else {
        contentWrapper.prepend(iconWrapper);
      }
    }

    if (this.options.variant) this.classList.add(this.options.variant);
    if (this.options.size) this.classList.add(this.options.size);
  }

  /**
   * Sets up the initial structure of the button.
   */
  private setupButton() {
    // Create edge element
    const edge = document.createElement("span");
    edge.classList.add("z-button__edge");

    // Create content wrapper
    const contentWrapper = document.createElement("span");
    contentWrapper.classList.add("z-button__front");

    let iconElement: HTMLElement | null = null;

    // Move existing content to appropriate wrappers
    while (this.firstChild) {
      const child = this.firstChild;
      if (
        child instanceof HTMLElement &&
        child.getAttribute("slot") === "icon"
      ) {
        if (!iconElement) {
          iconElement = document.createElement("span");
          iconElement.classList.add("z-button__icon");
        }
        iconElement.appendChild(child);
      } else {
        contentWrapper.appendChild(child);
      }
    }

    // Only add the icon wrapper if an icon was found
    if (iconElement) {
      if (this.options.iconPosition === "end") {
        contentWrapper.appendChild(iconElement);
      } else {
        contentWrapper.prepend(iconElement);
      }
    }

    // Append wrappers to button
    this.button.appendChild(edge);
    this.button.appendChild(contentWrapper);

    // Append button to component
    this.appendChild(this.button);
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
      ZButton.accessibilityAttributes.forEach((attr) => {
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
          "ZButton: No accessible name provided. Please add an aria-label or aria-labelledby attribute."
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
      ZButton.accessibilityAttributes.includes(name)
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
            `ZButton: Invalid value for ${name}. Expected "true" or "false".`
          );
        }
        break;
      case "tabindex":
        if (value === "" || value === "-1" || /^\d+$/.test(value)) {
          // Valid values: empty string, -1, or any non-negative integer
          const tabIndexValue = value === "" ? 0 : parseInt(value, 10);
          this.button.tabIndex = tabIndexValue;
          console.log(this.button);
          console.log(this.button.tabIndex);
        } else {
          console.warn(
            `ZButton: Invalid tabindex value "${value}". Expected -1, a non-negative integer, or empty string. Disregarding and removing attribute.`
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
  updateOptions(newOptions: Partial<ZButtonOptions>): void {
    this.parseOptions(newOptions);
  }

  /**
   * Sets the text content of the button.
   * @param text - The new text for the button.
   */
  setButtonText(text: string): void {
    const contentWrapper = this.button.querySelector(".z-button__front");
    if (contentWrapper) {
      contentWrapper.textContent = text;
      // Update aria-label if it was previously auto-generated
      if (
        !this.getAttribute("aria-label") &&
        !this.getAttribute("aria-labelledby")
      ) {
        const sanitizedText = this.sanitizeText(text);
        this.button.setAttribute("aria-label", sanitizedText);
      }
    }
  }

  /**
   * Gets the current text content of the button.
   * @returns The current text content of the button.
   */
  getButtonText(): string {
    const contentWrapper = this.button.querySelector(".z-button__front");
    return contentWrapper ? contentWrapper.textContent || "" : "";
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
}

/**
 * Helper function to define the custom element.
 * This function checks if the custom element is already defined before defining it.
 */
export function defineZButton() {
  if (typeof window !== "undefined" && !customElements.get("z-button")) {
    customElements.define("z-button", ZButton);
  }
}
