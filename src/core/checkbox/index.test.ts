import {
  ZCheckbox,
  ZCheckboxChangeDetail,
  defineZCheckbox,
} from "./index";

describe("ZCheckbox", () => {
  beforeAll(() => {
    defineZCheckbox();
  });

  afterEach(() => {
    document.body.innerHTML = "";
    jest.restoreAllMocks();
  });

  const getInternalInput = (element: ZCheckbox) => {
    const input = element.shadowRoot?.querySelector("input[type=checkbox]");
    if (!(input instanceof HTMLInputElement)) {
      throw new Error("Internal checkbox input not found");
    }
    return input;
  };

  it("renders an internal checkbox input inside a label", () => {
    const element = document.createElement("z-checkbox") as ZCheckbox;
    element.textContent = "Label";

    document.body.appendChild(element);

    expect(element.shadowRoot).toBeInstanceOf(ShadowRoot);

    const label = element.shadowRoot?.querySelector("label.z-checkbox");
    const input = element.shadowRoot?.querySelector("input[type=checkbox]");
    const slot = element.shadowRoot?.querySelector("slot");

    expect(label).toBeInstanceOf(HTMLLabelElement);
    expect(input).toBeInstanceOf(HTMLInputElement);
    expect(slot).toBeInstanceOf(HTMLSlotElement);
  });

  it("mirrors control and accessibility attributes to the internal input", () => {
    const element = document.createElement("z-checkbox") as ZCheckbox;
    element.checked = true;
    element.indeterminate = true;
    element.disabled = true;
    element.required = true;
    element.name = "agreement";
    element.value = "yes";
    element.setAttribute("aria-label", "Accept terms");
    element.setAttribute("aria-describedby", "hint");
    element.setAttribute("aria-checked", "mixed");
    element.setAttribute("tabindex", "3");

    document.body.appendChild(element);

    const input = getInternalInput(element);

    expect(input.checked).toBe(true);
    expect(input.indeterminate).toBe(true);
    expect(input.disabled).toBe(true);
    expect(input.required).toBe(true);
    expect(input.name).toBe("agreement");
    expect(input.value).toBe("yes");
    expect(input.getAttribute("aria-label")).toBe("Accept terms");
    expect(input.getAttribute("aria-describedby")).toBe("hint");
    expect(input.getAttribute("aria-checked")).toBe("mixed");
    expect(input.tabIndex).toBe(3);
    expect(input.getAttribute("tabindex")).toBe("3");
  });

  it("emits z-change only when the checkbox is enabled", () => {
    const element = document.createElement("z-checkbox") as ZCheckbox;
    element.value = "on";

    document.body.appendChild(element);

    const input = getInternalInput(element);
    const handler = jest.fn();
    element.addEventListener("z-change", handler);

    input.checked = true;
    input.dispatchEvent(new Event("change", { bubbles: true }));

    expect(handler).toHaveBeenCalledTimes(1);
    const event = handler.mock.calls[0]?.[0] as CustomEvent<ZCheckboxChangeDetail>;
    expect(event.detail).toEqual({ checked: true, indeterminate: false, value: "on" });

    element.disabled = true;

    input.checked = false;
    input.dispatchEvent(new Event("change", { bubbles: true }));

    expect(handler).toHaveBeenCalledTimes(1);
    expect(element.checked).toBe(true);
    expect(input.checked).toBe(true);
  });

  it("sanitizes tabindex values and warns when invalid input is provided", () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const element = document.createElement("z-checkbox") as ZCheckbox;
    document.body.appendChild(element);

    const input = getInternalInput(element);

    element.setAttribute("tabindex", "");
    expect(input.tabIndex).toBe(0);
    expect(input.getAttribute("tabindex")).toBe("0");

    element.setAttribute("tabindex", "-1");
    expect(input.tabIndex).toBe(-1);
    expect(input.getAttribute("tabindex")).toBe("-1");

    element.setAttribute("tabindex", "5");
    expect(input.tabIndex).toBe(5);
    expect(input.getAttribute("tabindex")).toBe("5");

    element.setAttribute("tabindex", "abc");

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0]?.[0]).toContain(
      'Invalid tabindex value "abc". Expected -1, a non-negative integer, or empty string'
    );
    expect(element.hasAttribute("tabindex")).toBe(false);
    expect(input.hasAttribute("tabindex")).toBe(false);
    expect(input.tabIndex).toBe(0);
  });
});
