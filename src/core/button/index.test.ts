import { defineZbkButton } from "./index";

describe("ZbkButton (light DOM)", () => {
  beforeAll(() => {
    defineZbkButton();
  });

  afterEach(() => {
    document.body.innerHTML = "";
    jest.restoreAllMocks();
  });

  const getInternalButton = (el: HTMLElement): HTMLButtonElement => {
    const button = el.querySelector("button");
    if (!(button instanceof HTMLButtonElement)) {
      throw new Error("Internal button not found");
    }
    return button;
  };

  it("renders a native button and moves children inside", () => {
    const el = document.createElement("zbk-button");
    el.setAttribute("aria-label", "label");
    el.innerHTML = `<span slot="icon">★</span><span>Label</span>`;
    document.body.appendChild(el);

    const btn = getInternalButton(el);
    expect(btn.textContent).toContain("Label");
    expect(btn.querySelector('[slot="icon"]')).toBeInstanceOf(HTMLElement);
    // Host and internal button share classes via mirroring
    expect(btn.classList.contains("zbk-button")).toBe(true);
  });

  it("auto-applies .zbk-icon to slotted icons lacking the class", () => {
    const el = document.createElement("zbk-button");
    el.setAttribute("aria-label", "download");
    const icon = document.createElement("i");
    icon.setAttribute("slot", "icon");
    el.append(icon, document.createTextNode("Download"));
    document.body.appendChild(el);

    const btn = getInternalButton(el);
    const slotted = btn.querySelector('[slot="icon"]') as HTMLElement;
    expect(slotted.classList.contains("zbk-icon")).toBe(true);
  });

  it("applies variant classes from space/comma separated values", () => {
    const el = document.createElement("zbk-button");
    el.setAttribute("aria-label", "variants");
    el.setAttribute("variant", "outline, large");
    document.body.appendChild(el);

    expect(el.classList.contains("zbk-button--outline")).toBe(true);
    expect(el.classList.contains("zbk-button--large")).toBe(true);

    const btn = getInternalButton(el);
    expect(btn.classList.contains("zbk-button--outline")).toBe(true);
    expect(btn.classList.contains("zbk-button--large")).toBe(true);
  });

  it("setButtonText updates text content and fallback aria-label", () => {
    const el = document.createElement("zbk-button") as any;
    el.setAttribute("aria-label", "initial");
    document.body.appendChild(el);

    const btn = getInternalButton(el);
    el.setButtonText("Submit");

    expect(btn.textContent).toBe("Submit");
    expect(btn.getAttribute("aria-label")).toBe("submit");
  });
});
