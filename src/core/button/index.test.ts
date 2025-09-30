import { ZButton, defineZButton } from "./index";

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("ZButton", () => {
  beforeAll(() => {
    defineZButton();
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("reuses the internal structure when disconnected and reconnected", () => {
    const element = document.createElement("z-button") as ZButton;
    element.innerHTML = "<span>Label</span><span slot=\"icon\">⭐</span>";

    expect(() => {
      document.body.appendChild(element);
      document.body.removeChild(element);
      document.body.appendChild(element);
    }).not.toThrow();

    const internalButton = element.querySelector("button");
    expect(internalButton).toBeInstanceOf(HTMLButtonElement);
    expect(internalButton?.parentElement).toBe(element);

    const edgeElements = internalButton!.querySelectorAll(".z-button__edge");
    expect(edgeElements).toHaveLength(1);

    const frontElements = internalButton!.querySelectorAll(".z-button__front");
    expect(frontElements).toHaveLength(1);

    const front = frontElements[0] as HTMLElement;
    const iconWrappers = front.querySelectorAll(".z-button__icon");
    expect(iconWrappers).toHaveLength(1);

    const iconWrapper = iconWrappers[0] as HTMLElement;
    expect(iconWrapper.children).toHaveLength(1);
    expect(iconWrapper.firstElementChild?.getAttribute("slot")).toBe("icon");

    expect(front.textContent).toContain("Label");

    expect(element.querySelectorAll("button")).toHaveLength(1);
    expect(element.firstElementChild).toBe(internalButton);
  });

  it("reapplies variant classes when the variant attribute changes", async () => {
    const element = document.createElement("z-button") as ZButton;
    element.textContent = "Label";

    document.body.appendChild(element);

    // Allow MutationObservers to sync the initial classes
    await flush();

    expect(element.classList.contains("outline")).toBe(true);
    expect(element.classList.contains("raised")).toBe(false);

    element.setAttribute("variant", "raised");

    // Wait for attribute change handling and class mirroring to complete
    await flush();

    expect(element.classList.contains("raised")).toBe(true);
    expect(element.classList.contains("outline")).toBe(false);

    const internalButton = element.querySelector("button");
    expect(internalButton).toBeInstanceOf(HTMLButtonElement);
    expect(internalButton?.classList.contains("raised")).toBe(true);
    expect(internalButton?.classList.contains("outline")).toBe(false);

    element.setAttribute("variant", "flat");
    await flush();

    expect(element.classList.contains("flat")).toBe(true);
    expect(element.classList.contains("raised")).toBe(false);
    expect(element.classList.contains("outline")).toBe(false);
    expect(internalButton?.classList.contains("flat")).toBe(true);
    expect(internalButton?.classList.contains("raised")).toBe(false);

    element.setAttribute("variant", "unstyled");
    await flush();

    expect(element.classList.contains("unstyled")).toBe(true);
    expect(element.classList.contains("flat")).toBe(false);
    expect(element.classList.contains("raised")).toBe(false);
    expect(element.classList.contains("outline")).toBe(false);
    expect(internalButton?.classList.contains("unstyled")).toBe(true);
    expect(internalButton?.classList.contains("flat")).toBe(false);
    expect(internalButton?.classList.contains("raised")).toBe(false);
    expect(internalButton?.classList.contains("outline")).toBe(false);

    expect(element.classList.contains("md")).toBe(true);
    element.setAttribute("size", "lg");
    await flush();

    expect(element.classList.contains("lg")).toBe(true);
    expect(element.classList.contains("md")).toBe(false);
    expect(internalButton?.classList.contains("lg")).toBe(true);
    expect(internalButton?.classList.contains("md")).toBe(false);

    element.setAttribute("size", "xs");
    await flush();

    expect(element.classList.contains("xs")).toBe(true);
    expect(element.classList.contains("lg")).toBe(false);
    expect(element.classList.contains("md")).toBe(false);
    expect(internalButton?.classList.contains("xs")).toBe(true);
    expect(internalButton?.classList.contains("lg")).toBe(false);
    expect(internalButton?.classList.contains("md")).toBe(false);
  });
});
