import { ZButton, defineZButton } from "./index";

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
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(element.classList.contains("outline")).toBe(true);
    expect(element.classList.contains("raised")).toBe(false);

    element.setAttribute("variant", "raised");

    // Wait for attribute change handling and class mirroring to complete
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(element.classList.contains("raised")).toBe(true);
    expect(element.classList.contains("outline")).toBe(false);

    const internalButton = element.querySelector("button");
    expect(internalButton).toBeInstanceOf(HTMLButtonElement);
    expect(internalButton?.classList.contains("raised")).toBe(true);
    expect(internalButton?.classList.contains("outline")).toBe(false);
  });
});
