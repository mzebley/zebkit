import { defineZbkButton } from "./index";

describe("ZbkButton (shadow DOM)", () => {
  beforeAll(() => {
    defineZbkButton();
  });

  afterEach(() => {
    document.body.innerHTML = "";
    jest.restoreAllMocks();
  });

  const getInternalButton = (el: HTMLElement): HTMLButtonElement => {
    const button = el.shadowRoot?.querySelector("button") ?? null;
    if (!(button instanceof HTMLButtonElement)) {
      throw new Error("Internal button not found");
    }
    return button;
  };

  it("renders a native button with shadow DOM slots", () => {
    const el = document.createElement("zbk-button");
    el.setAttribute("aria-label", "label");
    el.innerHTML = `<span slot="icon">★</span><span>Label</span>`;
    document.body.appendChild(el);

    const btn = getInternalButton(el);
    const iconSlot = el.shadowRoot?.querySelector("slot[name='icon']");
    const defaultSlot = el.shadowRoot?.querySelector("slot:not([name])");
    expect(iconSlot).toBeInstanceOf(HTMLSlotElement);
    expect(defaultSlot).toBeInstanceOf(HTMLSlotElement);
    // Host and internal button share a base class for overrides
    expect(el.classList.contains("zbk-button")).toBe(true);
    expect(btn.classList.contains("zbk-button")).toBe(true);
  });

  it("auto-applies .zbk-icon to slotted icons lacking the class", () => {
    const el = document.createElement("zbk-button");
    el.setAttribute("aria-label", "download");
    const icon = document.createElement("i");
    icon.setAttribute("slot", "icon");
    el.append(icon, document.createTextNode("Download"));
    document.body.appendChild(el);

    expect(icon.classList.contains("zbk-icon")).toBe(true);
  });

  it("applies variant classes from space/comma separated values", () => {
    const el = document.createElement("zbk-button");
    el.setAttribute("aria-label", "variants");
    el.setAttribute("variant", "outline, large");
    document.body.appendChild(el);

    expect(el.classList.contains("zbk-button--outline")).toBe(true);
    expect(el.classList.contains("zbk-button--large")).toBe(true);
  });

  it("setButtonText updates fallback label and aria-label", () => {
    const el = document.createElement("zbk-button") as any;
    document.body.appendChild(el);

    const btn = getInternalButton(el);
    el.setButtonText("Submit");

    const fallbackLabel = el.shadowRoot?.querySelector(
      "[data-fallback-label]"
    ) as HTMLElement | null;
    expect(fallbackLabel?.textContent).toBe("Submit");
    expect(btn.getAttribute("aria-label")).toBe("submit");
  });
});
