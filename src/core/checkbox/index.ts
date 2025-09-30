export interface ZCheckboxChangeDetail {
  checked: boolean;
  indeterminate: boolean;
  value: string;
}

export class ZCheckbox extends HTMLElement {
  private input: HTMLInputElement;
  private label: HTMLLabelElement;
  private mutationObserver?: MutationObserver;

  private static readonly mirroredBooleanAttributes = [
    "checked",
    "indeterminate",
    "disabled",
    "required",
  ] as const;

  private static readonly mirroredStringAttributes = [
    "name",
    "value",
    "tabindex",
  ] as const;

  private static readonly accessibilityAttributes = [
    "aria-label",
    "aria-labelledby",
    "aria-describedby",
    "aria-controls",
    "aria-checked",
    "aria-required",
    "aria-invalid",
    "aria-disabled",
    "aria-expanded",
    "role",
  ];

  static get observedAttributes(): string[] {
    return [
      ...ZCheckbox.mirroredBooleanAttributes,
      ...ZCheckbox.mirroredStringAttributes,
      ...ZCheckbox.accessibilityAttributes,
    ];
  }

  constructor() {
    super();

    const shadow = this.attachShadow({ mode: "open" });
    this.label = document.createElement("label");
    this.label.classList.add("z-checkbox");

    this.input = document.createElement("input");
    this.input.type = "checkbox";
    this.input.classList.add("z-checkbox__input");

    const slot = document.createElement("slot");

    this.label.append(this.input, slot);
    shadow.append(this.label);

    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleClick = this.handleClick.bind(this);

    this.mutationObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "attributes" && mutation.attributeName) {
          this.reflectClassToLabel(mutation.attributeName);
        }
      }
    });
  }

  connectedCallback(): void {
    this.input.addEventListener("change", this.handleInputChange);
    this.input.addEventListener("input", this.handleInputChange);
    this.addEventListener("click", this.handleClick);

    ZCheckbox.observedAttributes.forEach((name) => {
      this.attributeChangedCallback(name, null, this.getAttribute(name));
    });

    this.reflectAllClasses();
    this.mutationObserver?.observe(this, {
      attributes: true,
      attributeFilter: ["class"],
    });
  }

  disconnectedCallback(): void {
    this.input.removeEventListener("change", this.handleInputChange);
    this.input.removeEventListener("input", this.handleInputChange);
    this.removeEventListener("click", this.handleClick);
    this.mutationObserver?.disconnect();
  }

  attributeChangedCallback(
    name: string,
    _oldValue: string | null,
    newValue: string | null
  ): void {
    if (!this.input) {
      return;
    }

    if (ZCheckbox.mirroredBooleanAttributes.includes(name as any)) {
      const isPresent = newValue !== null;
      switch (name) {
        case "checked":
          this.input.checked = isPresent;
          break;
        case "indeterminate":
          this.input.indeterminate = isPresent;
          break;
        case "disabled":
          this.input.disabled = isPresent;
          break;
        case "required":
          this.input.required = isPresent;
          break;
      }
      return;
    }

    if (ZCheckbox.mirroredStringAttributes.includes(name as any)) {
      if (name === "tabindex") {
        if (newValue === null) {
          this.input.removeAttribute("tabindex");
          this.input.tabIndex = 0;
        } else {
          this.input.tabIndex = Number(newValue);
        }
        return;
      }

      if (newValue === null) {
        this.input.removeAttribute(name);
        if (name === "value") {
          this.input.value = "on";
        } else if (name === "name") {
          this.input.name = "";
        }
      } else {
        if (name === "value") {
          this.input.value = newValue;
        } else if (name === "name") {
          this.input.name = newValue;
        }
      }
      return;
    }

    if (
      ZCheckbox.accessibilityAttributes.includes(name) ||
      name.startsWith("aria-")
    ) {
      if (newValue === null) {
        this.input.removeAttribute(name);
      } else {
        this.input.setAttribute(name, newValue);
      }
    }
  }

  get checked(): boolean {
    return this.hasAttribute("checked");
  }

  set checked(value: boolean) {
    this.toggleAttribute("checked", value);
  }

  get indeterminate(): boolean {
    return this.hasAttribute("indeterminate");
  }

  set indeterminate(value: boolean) {
    this.toggleAttribute("indeterminate", value);
    this.input.indeterminate = value;
  }

  get disabled(): boolean {
    return this.hasAttribute("disabled");
  }

  set disabled(value: boolean) {
    this.toggleAttribute("disabled", value);
  }

  get name(): string {
    return this.getAttribute("name") ?? "";
  }

  set name(value: string) {
    this.setAttribute("name", value);
  }

  get value(): string {
    return this.getAttribute("value") ?? "on";
  }

  set value(value: string) {
    this.setAttribute("value", value);
  }

  get required(): boolean {
    return this.hasAttribute("required");
  }

  set required(value: boolean) {
    this.toggleAttribute("required", value);
  }

  focus(options?: FocusOptions): void {
    this.input.focus(options);
  }

  private handleClick(event: MouseEvent): void {
    if (this.disabled) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }

  private handleInputChange(event: Event): void {
    if (this.disabled) {
      event.preventDefault();
      this.syncFromAttributes();
      return;
    }

    this.toggleAttribute("checked", this.input.checked);
    if (this.input.indeterminate) {
      this.setAttribute("indeterminate", "");
    } else {
      this.removeAttribute("indeterminate");
    }

    const detail: ZCheckboxChangeDetail = {
      checked: this.input.checked,
      indeterminate: this.input.indeterminate,
      value: this.input.value,
    };

    this.dispatchEvent(
      new CustomEvent<ZCheckboxChangeDetail>("z-change", {
        detail,
        bubbles: true,
        composed: true,
      })
    );
  }

  private syncFromAttributes(): void {
    this.attributeChangedCallback(
      "checked",
      null,
      this.getAttribute("checked")
    );
    this.attributeChangedCallback(
      "indeterminate",
      null,
      this.getAttribute("indeterminate")
    );
  }

  private reflectClassToLabel(attributeName: string): void {
    if (attributeName !== "class") {
      return;
    }
    const elementClasses = Array.from(this.classList);
    this.label.className = "z-checkbox";
    elementClasses.forEach((cls) => {
      if (!cls.startsWith("z-checkbox__")) {
        this.label.classList.add(cls);
      }
    });
  }

  private reflectAllClasses(): void {
    this.reflectClassToLabel("class");
  }
}

export function defineZCheckbox() {
  if (!customElements.get("z-checkbox")) {
    customElements.define("z-checkbox", ZCheckbox);
  }
}

export default ZCheckbox;
