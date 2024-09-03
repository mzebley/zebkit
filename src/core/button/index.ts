export class ZButton extends HTMLElement {
  private button: HTMLButtonElement;
  private clickHandler: Function | null = null;

  // List of attributes to observe for changes
  static get observedAttributes() {
    return [
      "(click)",
      "aria-label",
      "aria-describedby",
      "aria-pressed",
      "aria-expanded",
      "aria-controls",
      "role",
      "tabindex",
    ];
  }

  constructor() {
    super();
    this.button = document.createElement("button");
    this.button.classList.add("z-button");
  }

  connectedCallback() {
    this.setupButton();
    this.button.addEventListener("click", this.handleClick.bind(this));
    this.updateClickHandler();
    this.setupAccessibility();
    // Use requestAnimationFrame to defer showing the button
    requestAnimationFrame(() => {
      this.classList.add("z-button-ready");
    });
  }

  disconnectedCallback() {
    this.button.removeEventListener("click", this.handleClick.bind(this));
  }

  attributeChangedCallback(
    name: string,
    _oldValue: string | null,
    newValue: string | null
  ) {
    if (name === "(click)") {
      this.updateClickHandler();
    } else if (
      [
        "aria-label",
        "aria-describedby",
        "aria-pressed",
        "aria-expanded",
        "aria-controls",
        "role",
        "tabindex",
      ].includes(name)
    ) {
      this.updateAccessibilityAttribute(name, newValue);
    }
  }

  private setupButton() {
    // Create icon wrapper
    const iconWrapper = document.createElement("span");
    iconWrapper.classList.add("z-button__icon");

    // Create edge element
    const edge = document.createElement("span");
    edge.classList.add("z-button__edge");

    // Create content wrapper
    const contentWrapper = document.createElement("span");
    contentWrapper.classList.add("z-button__front");

    // Move existing content to appropriate wrappers
    while (this.firstChild) {
      const child = this.firstChild;
      if (
        child instanceof HTMLElement &&
        child.getAttribute("slot") === "icon"
      ) {
        iconWrapper.appendChild(child);
      } else {
        contentWrapper.appendChild(child);
      }
    }

    contentWrapper.prepend(iconWrapper);

    // Append wrappers to button
    this.button.appendChild(edge);
    this.button.appendChild(contentWrapper);

    // Append button to component
    this.appendChild(this.button);
  }

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

  private updateClickHandler() {
    const clickAttr = this.getAttribute("(click)");
    if (clickAttr) {
      this.clickHandler = new Function("event", clickAttr) as Function;
    } else {
      this.clickHandler = null;
    }
  }

  private setupAccessibility() {
   // Ensure the button has a type
   if (!this.button.getAttribute("type")) {
    this.button.setAttribute("type", "button");
  }

  // Transfer existing accessibility attributes
  ["aria-label", "aria-describedby", "aria-pressed", "aria-expanded", "aria-controls", "role", "tabindex"].forEach(attr => {
    const value = this.getAttribute(attr);
    this.updateAccessibilityAttribute(attr, value);
    this.removeAttribute(attr);
  });

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

  private updateAccessibilityAttribute(name: string, value: string | null) {
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
          console.warn(`ZButton: Invalid value for ${name}. Expected "true" or "false".`);
        }
        break;
        case "tabindex":
          if (value === "" || value === "-1" || /^\d+$/.test(value)) {
            // Valid values: empty string, -1, or any non-negative integer
            const tabIndexValue = value === "" ? 0 : parseInt(value, 10);
            this.button.tabIndex = tabIndexValue;
            console.log(this.button);
            console.log(this.button.tabIndex)
          } else {
            console.warn(`ZButton: Invalid tabindex value "${value}". Expected -1, a non-negative integer, or empty string. Disregarding and removing attribute.`);
            this.button.removeAttribute(name);
          }
          break;
          default:
            this.button.setAttribute(name, value);
    }
  }

  // Public methods
  setDisabledState(isDisabled: boolean): void {
    this.button.disabled = isDisabled;
    if (isDisabled) {
      this.button.setAttribute("aria-disabled", "true");
    } else {
      this.button.removeAttribute("aria-disabled");
    }
  }

  getDisabledState(): boolean {
    return this.button.disabled;
  }


  setButtonText(text: string): void {
    const contentWrapper = this.button.querySelector('.z-button__front');
    if (contentWrapper) {
      contentWrapper.textContent = text;
      // Update aria-label if it was previously auto-generated
      if (!this.getAttribute("aria-label") && !this.getAttribute("aria-labelledby")) {
        const sanitizedText = this.sanitizeText(text);
        this.button.setAttribute("aria-label", sanitizedText);
      }
    }
  }

  getButtonText(): string {
    const contentWrapper = this.button.querySelector(".z-button__front");
    return contentWrapper ? contentWrapper.textContent || "" : "";
  }

  setAriaPressed(isPressed: boolean): void {
    this.button.setAttribute("aria-pressed", isPressed.toString());
  }

  setAriaExpanded(isExpanded: boolean): void {
    this.button.setAttribute("aria-expanded", isExpanded.toString());
  }
}

// Helper function to define the custom element
export function defineZButton() {
  if (typeof window !== "undefined" && !customElements.get("z-button")) {
    customElements.define("z-button", ZButton);
  }
}

// Auto-define only if in a browser environment
if (typeof window !== "undefined") {
  defineZButton();
}
