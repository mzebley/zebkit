export interface ZRadioChangeDetail {
  checked: boolean;
  value: string;
}

const RADIO_STYLE = /* css */ `
:host {
  display: inline-block;
}

.z-radio {
  display: inline-flex;
  align-items: center;
  gap: var(--zbk-radio-label-gap);
  font-family: var(--zbk-radio-label-font-family);
  font-size: var(--zbk-radio-label-font-size);
  font-weight: var(--zbk-radio-label-font-weight);
  line-height: var(--zbk-radio-label-line-height);
  letter-spacing: var(--zbk-radio-label-letter-spacing);
  color: var(--zbk-radio-label-color);
  cursor: pointer;
  user-select: none;
}

.z-radio__input {
  appearance: none;
  width: var(--zbk-radio-size);
  height: var(--zbk-radio-size);
  margin: 0;
  border-radius: var(--zbk-radio-border-radius);
  border: var(--zbk-radio-border-width) solid var(--zbk-radio-border-color);
  background-color: var(--zbk-radio-background);
  display: grid;
  place-content: center;
  transition:
    background-color var(--zbk-radio-transition-duration)
      var(--zbk-radio-transition-timing-function),
    border-color var(--zbk-radio-transition-duration)
      var(--zbk-radio-transition-timing-function),
    box-shadow var(--zbk-radio-transition-duration)
      var(--zbk-radio-transition-timing-function),
    transform var(--zbk-radio-transition-duration)
      var(--zbk-radio-transition-timing-function);
  position: relative;
}

.z-radio__input::before {
  content: "";
  width: var(--zbk-radio-indicator-size);
  height: var(--zbk-radio-indicator-size);
  border-radius: var(--zbk-radio-indicator-border-radius);
  background-color: var(--zbk-radio-indicator-color);
  transform: scale(0);
  transition: transform var(--zbk-radio-transition-duration)
    var(--zbk-radio-transition-timing-function);
}

.z-radio__input:focus {
  outline: none;
}

.z-radio__input:focus-visible {
  outline: var(--zbk-radio-focus-ring-width) solid
    var(--zbk-radio-focus-ring-color);
  outline-offset: var(--zbk-radio-focus-ring-offset);
  border-color: var(--zbk-radio-border-color-active);
}

.z-radio__input:checked {
  border-color: var(--zbk-radio-border-color-active);
  background-color: var(--zbk-radio-background-checked);
}

.z-radio__input:checked::before {
  transform: scale(1);
}

.z-radio__input:disabled {
  border-color: var(--zbk-radio-border-color-disabled);
  background-color: var(--zbk-radio-background);
  cursor: not-allowed;
  opacity: var(--zbk-radio-disabled-opacity);
}

.z-radio__input:disabled::before {
  background-color: var(--zbk-radio-indicator-disabled-color);
}

:host([disabled]) .z-radio,
.z-radio__input:disabled + slot {
  cursor: not-allowed;
  color: var(--zbk-radio-label-disabled-color);
}

@media (hover: hover) and (pointer: fine) {
  .z-radio__input:not(:disabled):hover {
    border-color: var(--zbk-radio-border-color-hover);
  }
}
`;

const RADIO_TEMPLATE = document.createElement("template");
RADIO_TEMPLATE.innerHTML = `
  <style>${RADIO_STYLE}</style>
  <label class="z-radio">
    <input type="radio" class="z-radio__input" />
    <slot></slot>
  </label>
`;

export class ZRadio extends HTMLElement {
  private input: HTMLInputElement;
  private label: HTMLLabelElement;
  private mutationObserver?: MutationObserver;

  private static readonly mirroredBooleanAttributes = [
    "checked",
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
      ...ZRadio.mirroredBooleanAttributes,
      ...ZRadio.mirroredStringAttributes,
      ...ZRadio.accessibilityAttributes,
    ];
  }

  constructor() {
    super();

    const shadow = this.attachShadow({ mode: "open" });
    const templateContent = RADIO_TEMPLATE.content.cloneNode(true);
    shadow.append(templateContent);

    this.label = shadow.querySelector("label.z-radio") as HTMLLabelElement;
    this.input = shadow.querySelector("input.z-radio__input") as HTMLInputElement;

    if (!this.label || !this.input) {
      throw new Error("ZRadio: Failed to initialize shadow DOM structure.");
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

    ZRadio.observedAttributes.forEach((name) => {
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

    if (ZRadio.mirroredBooleanAttributes.includes(name as any)) {
      const isPresent = newValue !== null;
      switch (name) {
        case "checked":
          this.input.checked = isPresent;
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

    if (ZRadio.mirroredStringAttributes.includes(name as any)) {
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
          `ZRadio: Invalid tabindex value "${newValue}". Expected -1, a non-negative integer, or empty string. Disregarding and removing attribute.`
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
      ZRadio.accessibilityAttributes.includes(name) ||
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

  get disabled(): boolean {
    return this.hasAttribute("disabled");
  }

  set disabled(value: boolean) {
    this.toggleAttribute("disabled", value);
  }

  get required(): boolean {
    return this.hasAttribute("required");
  }

  set required(value: boolean) {
    this.toggleAttribute("required", value);
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

    const isChecked = this.input.checked;
    if (isChecked) {
      this.uncheckOtherRadiosInGroup();
    }
    this.toggleAttribute("checked", isChecked);

    const detail: ZRadioChangeDetail = {
      checked: isChecked,
      value: this.input.value,
    };

    this.dispatchEvent(
      new CustomEvent<ZRadioChangeDetail>("z-change", {
        detail,
        bubbles: true,
        composed: true,
      })
    );
  }

  private uncheckOtherRadiosInGroup(): void {
    const rawName = this.getAttribute("name");
    if (!rawName) {
      return;
    }

    const normalizedName = rawName.trim();
    if (!normalizedName) {
      return;
    }

    const searchRoot = this.getRadioGroupRoot();
    const radios = Array.from(
      searchRoot.querySelectorAll<ZRadio>("z-radio[name]")
    );

    for (const radio of radios) {
      if (radio === this) {
        continue;
      }

      const otherName = radio.getAttribute("name");
      if (otherName && otherName.trim() === normalizedName) {
        radio.checked = false;
      }
    }
  }

  private getRadioGroupRoot(): ParentNode {
    const form = this.closest("form");
    if (form) {
      return form;
    }

    const root = this.getRootNode({ composed: true });
    if (root instanceof Document || root instanceof DocumentFragment) {
      return root;
    }

    return document;
  }

  private syncFromAttributes(): void {
    this.attributeChangedCallback("checked", null, this.getAttribute("checked"));
  }

  private reflectClassToLabel(attributeName: string): void {
    if (attributeName !== "class") {
      return;
    }
    const elementClasses = Array.from(this.classList);
    this.label.className = "z-radio";
    elementClasses.forEach((cls) => {
      if (!cls.startsWith("z-radio__")) {
        this.label.classList.add(cls);
      }
    });
  }

  private reflectAllClasses(): void {
    this.reflectClassToLabel("class");
  }
}

export function defineZRadio() {
  if (!customElements.get("z-radio")) {
    customElements.define("z-radio", ZRadio);
  }
}

export default ZRadio;
