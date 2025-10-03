import { ZRadio, ZRadioChangeDetail, defineZRadio } from "./index";

describe("ZRadio", () => {
  beforeAll(() => {
    defineZRadio();
  });

  afterEach(() => {
    document.body.innerHTML = "";
    jest.restoreAllMocks();
  });

  const getInternalInput = (element: ZRadio) => {
    const input = element.shadowRoot?.querySelector("input[type=radio]");
    if (!(input instanceof HTMLInputElement)) {
      throw new Error("Internal radio input not found");
    }
    return input;
  };

  it("renders an internal radio input inside a label", () => {
    const element = document.createElement("z-radio") as ZRadio;
    element.textContent = "Label";

    document.body.appendChild(element);

    expect(element.shadowRoot).toBeInstanceOf(ShadowRoot);

    const label = element.shadowRoot?.querySelector("label.z-radio");
    const input = element.shadowRoot?.querySelector("input[type=radio]");
    const slot = element.shadowRoot?.querySelector("slot");

    expect(label).toBeInstanceOf(HTMLLabelElement);
    expect(input).toBeInstanceOf(HTMLInputElement);
    expect(slot).toBeInstanceOf(HTMLSlotElement);
  });

  it("mirrors control and accessibility attributes to the internal input", () => {
    const element = document.createElement("z-radio") as ZRadio;
    element.checked = true;
    element.disabled = true;
    element.required = true;
    element.name = "choice";
    element.value = "a";
    element.setAttribute("aria-label", "Choose option A");
    element.setAttribute("aria-describedby", "hint");
    element.setAttribute("aria-checked", "true");
    element.setAttribute("tabindex", "2");

    document.body.appendChild(element);

    const input = getInternalInput(element);

    expect(input.checked).toBe(true);
    expect(input.disabled).toBe(true);
    expect(input.required).toBe(true);
    expect(input.name).toBe("choice");
    expect(input.value).toBe("a");
    expect(input.getAttribute("aria-label")).toBe("Choose option A");
    expect(input.getAttribute("aria-describedby")).toBe("hint");
    expect(input.getAttribute("aria-checked")).toBe("true");
    expect(input.tabIndex).toBe(2);
    expect(input.getAttribute("tabindex")).toBe("2");
  });

  it("emits z-change only when the radio is enabled", () => {
    const element = document.createElement("z-radio") as ZRadio;
    element.value = "on";

    document.body.appendChild(element);

    const input = getInternalInput(element);
    const handler = jest.fn();
    element.addEventListener("z-change", handler);

    input.checked = true;
    input.dispatchEvent(new Event("change", { bubbles: true }));

    expect(handler).toHaveBeenCalledTimes(1);
    const event = handler.mock.calls[0]?.[0] as CustomEvent<ZRadioChangeDetail>;
    expect(event.detail).toEqual({ checked: true, value: "on" });

    element.disabled = true;

    input.checked = false;
    input.dispatchEvent(new Event("change", { bubbles: true }));

    expect(handler).toHaveBeenCalledTimes(1);
    expect(element.checked).toBe(true);
    expect(input.checked).toBe(true);
  });

  it("sanitizes tabindex values and warns when invalid input is provided", () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const element = document.createElement("z-radio") as ZRadio;
    document.body.appendChild(element);

    const input = getInternalInput(element);

    element.setAttribute("tabindex", "");
    expect(input.tabIndex).toBe(0);
    expect(input.getAttribute("tabindex")).toBe("0");

    element.setAttribute("tabindex", "-1");
    expect(input.tabIndex).toBe(-1);
    expect(input.getAttribute("tabindex")).toBe("-1");

    element.setAttribute("tabindex", "3");
    expect(input.tabIndex).toBe(3);
    expect(input.getAttribute("tabindex")).toBe("3");

    element.setAttribute("tabindex", "oops");

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0]?.[0]).toContain(
      'Invalid tabindex value "oops". Expected -1, a non-negative integer, or empty string'
    );
    expect(element.hasAttribute("tabindex")).toBe(false);
    expect(input.hasAttribute("tabindex")).toBe(false);
    expect(input.tabIndex).toBe(0);
  });
});
