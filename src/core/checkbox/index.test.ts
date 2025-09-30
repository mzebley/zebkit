import {
  ZCheckbox,
  ZCheckboxChangeDetail,
  defineZCheckbox,
} from "./index";

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("ZCheckbox", () => {
  beforeAll(() => {
    defineZCheckbox();
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  const getInternalInput = (element: ZCheckbox) => {
    const input = element.shadowRoot?.querySelector("input[type=checkbox]");
    if (!(input instanceof HTMLInputElement)) {
      throw new Error("Internal checkbox input not found");
    }
    return input;
  };

  it("mirrors standard attributes to the internal input", async () => {
    const element = document.createElement("z-checkbox") as ZCheckbox;
    element.checked = true;
    element.indeterminate = true;
    element.disabled = true;
    element.name = "agreement";
    element.value = "yes";
    element.required = true;
    element.setAttribute("aria-label", "Accept terms");
    element.tabIndex = -1;
    element.classList.add("custom-class");

    document.body.appendChild(element);
    await flush();

    const input = getInternalInput(element);
    const label = element.shadowRoot?.querySelector("label");

    expect(input.checked).toBe(true);
    expect(input.indeterminate).toBe(true);
    expect(input.disabled).toBe(true);
    expect(input.name).toBe("agreement");
    expect(input.value).toBe("yes");
    expect(input.required).toBe(true);
    expect(input.getAttribute("aria-label")).toBe("Accept terms");
    expect(input.tabIndex).toBe(-1);
    expect(label?.classList.contains("custom-class")).toBe(true);
  });

  it("dispatches z-change events when toggled", () => {
    const element = document.createElement("z-checkbox") as ZCheckbox;
    document.body.appendChild(element);

    const input = getInternalInput(element);

    const handler = jest.fn();
    element.addEventListener("z-change", handler);

    input.checked = true;
    input.dispatchEvent(new Event("change", { bubbles: true }));

    expect(element.checked).toBe(true);
    expect(handler).toHaveBeenCalledTimes(1);
    const event = handler.mock.calls[0]?.[0] as CustomEvent<ZCheckboxChangeDetail>;
    expect(event.detail.checked).toBe(true);
    expect(event.detail.indeterminate).toBe(false);
  });

  it("prevents interaction when disabled", () => {
    const element = document.createElement("z-checkbox") as ZCheckbox;
    element.disabled = true;
    document.body.appendChild(element);

    const input = getInternalInput(element);

    const handler = jest.fn();
    element.addEventListener("z-change", handler);

    input.checked = true;
    input.dispatchEvent(new Event("change", { bubbles: true }));

    expect(handler).not.toHaveBeenCalled();
    expect(element.checked).toBe(false);
    expect(input.checked).toBe(false);
  });
});
