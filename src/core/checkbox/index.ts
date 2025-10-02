export interface ZCheckboxChangeDetail {
  checked: boolean;
  indeterminate: boolean;
  value: string;
}

const CHECKBOX_STYLE = /* css */ `
:host {
  display: inline-block;
}

.z-checkbox {
  display: inline-flex;
  align-items: center;
  gap: var(--zbk-checkbox-label-gap);
  font: inherit;
  color: var(--zbk-checkbox-label-color);
  cursor: pointer;
  user-select: none;
}

.z-checkbox__input {
  appearance: none;
  width: var(--zbk-checkbox-size);
  height: var(--zbk-checkbox-size);
  margin: 0;
  border-radius: var(--zbk-checkbox-border-radius);
  border: var(--zbk-checkbox-border-width) solid
    var(--zbk-checkbox-border-color);
  background-color: var(--zbk-checkbox-background);
  display: grid;
  place-content: center;
  transition:
    background-color var(--zbk-checkbox-transition-duration) ease,
    border-color var(--zbk-checkbox-transition-duration) ease,
    box-shadow var(--zbk-checkbox-transition-duration) ease,
    transform var(--zbk-checkbox-transition-duration) ease;
  position: relative;
}

.z-checkbox__input::before {
  content: "";
  width: calc(var(--zbk-checkbox-size) * 0.5);
  height: calc(var(--zbk-checkbox-size) * 0.25);
  border-right: var(--zbk-border-width-sm) solid
    var(--zbk-checkbox-indicator-color);
  border-bottom: var(--zbk-border-width-sm) solid
    var(--zbk-checkbox-indicator-color);
  border-left: 0;
  border-top: 0;
  transform: scale(0) rotate(45deg);
  transform-origin: center;
  transition: transform var(--zbk-checkbox-transition-duration) ease;
}

.z-checkbox__input::after {
  content: "";
  width: calc(var(--zbk-checkbox-size) * 0.6);
  height: var(--zbk-checkbox-indeterminate-bar-height);
  background-color: var(--zbk-checkbox-indicator-color);
  border-radius: var(--zbk-border-radius-pill);
  transform: scaleX(0);
  transition: transform var(--zbk-checkbox-transition-duration) ease;
}

.z-checkbox__input:focus {
  outline: none;
}

.z-checkbox__input:focus-visible {
  outline: var(--zbk-checkbox-focus-ring-width) solid
    var(--zbk-checkbox-focus-ring-color);
  outline-offset: var(--zbk-checkbox-focus-ring-offset);
  border-color: var(--zbk-checkbox-border-color-active);
}

.z-checkbox__input:checked {
  border-color: var(--zbk-checkbox-border-color-active);
  background-color: var(--zbk-checkbox-background-checked);
}

.z-checkbox__input:checked::before {
  transform: scale(1) rotate(45deg);
}

.z-checkbox__input:indeterminate {
  border-color: var(--zbk-checkbox-border-color-active);
  background-color: var(--zbk-checkbox-background-indeterminate);
}

.z-checkbox__input:indeterminate::before {
  transform: scale(0) rotate(45deg);
}

.z-checkbox__input:indeterminate::after {
  transform: scaleX(1);
}

.z-checkbox__input:disabled {
  border-color: var(--zbk-checkbox-border-color-disabled);
  background-color: var(--zbk-checkbox-background);
  cursor: not-allowed;
  opacity: 0.7;
}

.z-checkbox__input:disabled::before {
  border-right-color: var(--zbk-checkbox-indicator-disabled-color);
  border-bottom-color: var(--zbk-checkbox-indicator-disabled-color);
}

.z-checkbox__input:disabled::after {
  background-color: var(--zbk-checkbox-indicator-disabled-color);
}

:host([disabled]) .z-checkbox,
.z-checkbox__input:disabled + slot {
  cursor: not-allowed;
  color: var(--zbk-checkbox-label-disabled-color);
}

@media (hover: hover) and (pointer: fine) {
  .z-checkbox__input:not(:disabled):hover {
    border-color: var(--zbk-checkbox-border-color-hover);
  }
}
`;

const CHECKBOX_TEMPLATE_HTML = `
  <style>${CHECKBOX_STYLE}</style>
  <label class="z-checkbox">
    <input type="checkbox" class="z-checkbox__input" />
    <slot></slot>
  </label>
`;

let checkboxTemplate: HTMLTemplateElement | undefined;

function getCheckboxTemplate(): HTMLTemplateElement {
  if (typeof document === "undefined") {
    throw new Error(
      "ZCheckbox: document is not available. Ensure this component is used in a browser environment."
    );
  }

  if (!checkboxTemplate) {
    checkboxTemplate = document.createElement("template");
    checkboxTemplate.innerHTML = CHECKBOX_TEMPLATE_HTML;
  }

  return checkboxTemplate;
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
    const templateContent = getCheckboxTemplate().content.cloneNode(true);
    shadow.append(templateContent);

    this.label = shadow.querySelector("label.z-checkbox") as HTMLLabelElement;
    this.input = shadow.querySelector(
      "input.z-checkbox__input"
    ) as HTMLInputElement;

    if (!this.label || !this.input) {
      throw new Error("ZCheckbox: Failed to initialize shadow DOM structure.");
    }

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
          this.input.tabIndex = 0;
          this.input.removeAttribute("tabindex");
          return;
        }

        const value = newValue.trim();

        if (value === "") {
          this.input.tabIndex = 0;
          this.input.setAttribute("tabindex", "0");
          return;
        }

        if (value === "-1" || /^\d+$/.test(value)) {
          const parsedValue = value === "-1" ? -1 : parseInt(value, 10);
          this.input.tabIndex = parsedValue;
          this.input.setAttribute("tabindex", value);
          return;
        }

        console.warn(
          `ZCheckbox: Invalid tabindex value "${newValue}". Expected -1, a non-negative integer, or empty string. Disregarding and removing attribute.`
        );
        this.input.tabIndex = 0;
        this.input.removeAttribute("tabindex");
        if (this.hasAttribute("tabindex")) {
          this.removeAttribute("tabindex");
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
