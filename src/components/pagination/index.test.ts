/**
 * @jest-environment jsdom
 */
import { ZbkPagination, defineZbkPagination } from "./index";
import { paginationVariants } from "./variants/index";
import { resetAnnouncer } from "../base/announce";

defineZbkPagination();

async function mount(markup: string): Promise<ZbkPagination> {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = markup;
  document.body.appendChild(wrapper);
  const el = wrapper.querySelector("zbk-pagination") as ZbkPagination;
  await el.updateComplete;
  return el;
}

const nav = (el: ZbkPagination): HTMLElement =>
  el.querySelector("nav") as HTMLElement;

const pageItems = (el: ZbkPagination): HTMLElement[] =>
  Array.from(el.querySelectorAll(".zbk-pagination__item--page"));

const pageItem = (el: ZbkPagination, page: number): HTMLElement | undefined =>
  pageItems(el).find((item) => item.textContent?.trim() === String(page));

const control = (el: ZbkPagination, dir: "previous" | "next"): HTMLElement =>
  el.querySelector(`.zbk-pagination__item--${dir}`) as HTMLElement;

describe("ZbkPagination", () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    document.body.innerHTML = "";
    resetAnnouncer();
    warnSpy.mockRestore();
  });

  describe("skeleton", () => {
    it("renders a nav > ul of items carrying the base class", async () => {
      const el = await mount('<zbk-pagination current="3" total="12"></zbk-pagination>');
      const root = nav(el);
      expect(root.classList.contains("zbk-pagination")).toBe(true);
      expect(root.querySelector("ul.zbk-pagination__list")).not.toBeNull();
      expect(pageItems(el).length).toBeGreaterThan(0);
    });

    it('defaults the nav accessible name to "Pagination"', async () => {
      const el = await mount('<zbk-pagination total="3"></zbk-pagination>');
      expect(nav(el).getAttribute("aria-label")).toBe("Pagination");
    });

    it("relocated authored aria-label wins over the default", async () => {
      const el = await mount(
        '<zbk-pagination total="3" aria-label="Search results pages"></zbk-pagination>',
      );
      expect(el.hasAttribute("aria-label")).toBe(false);
      expect(nav(el).getAttribute("aria-label")).toBe("Search results pages");
    });

    it("marks the current page with aria-current and labels every page", async () => {
      const el = await mount('<zbk-pagination current="3" total="12"></zbk-pagination>');
      const current = pageItem(el, 3)!;
      expect(current.getAttribute("aria-current")).toBe("page");
      expect(current.getAttribute("aria-label")).toBe("Page 3");
      expect(pageItem(el, 1)!.hasAttribute("aria-current")).toBe(false);
    });

    it("renders the default window: 1 2 3 4 5 … 12", async () => {
      const el = await mount('<zbk-pagination current="1" total="12"></zbk-pagination>');
      expect(pageItems(el).map((item) => item.textContent?.trim())).toEqual([
        "1", "2", "3", "4", "5", "12",
      ]);
      const ellipses = el.querySelectorAll(".zbk-pagination__ellipsis");
      expect(ellipses).toHaveLength(1);
      expect(ellipses[0].getAttribute("aria-hidden")).toBe("true");
    });

    it("honors siblings and boundaries attributes", async () => {
      const el = await mount(
        '<zbk-pagination current="10" total="20" siblings="2" boundaries="2"></zbk-pagination>',
      );
      expect(pageItems(el).map((item) => item.textContent?.trim())).toEqual([
        "1", "2", "8", "9", "10", "11", "12", "19", "20",
      ]);
    });

    it("draws chevron glyphs in the prev/next controls by default", async () => {
      const el = await mount('<zbk-pagination current="2" total="5"></zbk-pagination>');
      expect(control(el, "previous").querySelector(".zbk-pagination__icon svg")).not.toBeNull();
      expect(control(el, "next").querySelector(".zbk-pagination__icon svg")).not.toBeNull();
    });

    it("slotted icon content replaces the drawn glyph per position", async () => {
      const el = await mount(
        '<zbk-pagination current="2" total="5"><span slot="icon" data-position="start" data-i></span></zbk-pagination>',
      );
      const prevIcon = control(el, "previous").querySelector(".zbk-pagination__icon")!;
      expect(prevIcon.querySelector("[data-i]")).not.toBeNull();
      expect(prevIcon.querySelector("svg")).toBeNull();
      expect(control(el, "next").querySelector(".zbk-pagination__icon svg")).not.toBeNull();
      expect(prevIcon.getAttribute("aria-hidden")).toBe("true");
    });
  });

  describe("button mode (no href-template)", () => {
    it("renders page items as type=button buttons", async () => {
      const el = await mount('<zbk-pagination current="1" total="5"></zbk-pagination>');
      for (const item of pageItems(el)) {
        expect(item.tagName).toBe("BUTTON");
        expect((item as HTMLButtonElement).type).toBe("button");
      }
    });

    it("fires cancelable zbk-page-change and adopts the page uncanceled", async () => {
      const el = await mount('<zbk-pagination current="1" total="5"></zbk-pagination>');
      const seen: number[] = [];
      el.addEventListener("zbk-page-change", (event) => {
        seen.push((event as CustomEvent<{ page: number }>).detail.page);
      });
      pageItem(el, 3)!.click();
      await el.updateComplete;
      expect(seen).toEqual([3]);
      expect(el.current).toBe(3);
      expect(pageItem(el, 3)!.getAttribute("aria-current")).toBe("page");
    });

    it("preventDefault keeps current unchanged (consumer-owned state)", async () => {
      const el = await mount('<zbk-pagination current="1" total="5"></zbk-pagination>');
      el.addEventListener("zbk-page-change", (event) => event.preventDefault());
      pageItem(el, 3)!.click();
      await el.updateComplete;
      expect(el.current).toBe(1);
    });

    it("does not fire for the already-current page", async () => {
      const el = await mount('<zbk-pagination current="2" total="5"></zbk-pagination>');
      const onChange = jest.fn();
      el.addEventListener("zbk-page-change", onChange);
      pageItem(el, 2)!.click();
      expect(onChange).not.toHaveBeenCalled();
    });

    it("previous/next step one page", async () => {
      const el = await mount('<zbk-pagination current="2" total="5"></zbk-pagination>');
      control(el, "next").click();
      await el.updateComplete;
      expect(el.current).toBe(3);
      control(el, "previous").click();
      await el.updateComplete;
      expect(el.current).toBe(2);
    });

    it("disables the ends with aria-disabled and stays focusable", async () => {
      const el = await mount('<zbk-pagination current="1" total="5"></zbk-pagination>');
      const prev = control(el, "previous") as HTMLButtonElement;
      expect(prev.getAttribute("aria-disabled")).toBe("true");
      expect(prev.disabled).toBe(false);
      prev.focus();
      expect(document.activeElement).toBe(prev);
      const onChange = jest.fn();
      el.addEventListener("zbk-page-change", onChange);
      prev.click();
      expect(onChange).not.toHaveBeenCalled();
      expect(el.current).toBe(1);
    });

    it("announces the adopted page through the shared live region", async () => {
      jest.useFakeTimers();
      try {
        const el = await mount('<zbk-pagination current="1" total="5"></zbk-pagination>');
        pageItem(el, 2)!.click();
        jest.advanceTimersByTime(60);
        const region = document.querySelector('[role="status"]');
        expect(region?.textContent).toBe("Page 2 of 5");
      } finally {
        jest.useRealTimers();
      }
    });
  });

  describe("link mode (href-template)", () => {
    it("renders page items as real links from the template", async () => {
      const el = await mount(
        '<zbk-pagination current="3" total="12" href-template="?page={page}"></zbk-pagination>',
      );
      const item = pageItem(el, 4)!;
      expect(item.tagName).toBe("A");
      expect(item.getAttribute("href")).toBe("?page=4");
      expect(pageItem(el, 3)!.getAttribute("aria-current")).toBe("page");
    });

    it("links previous/next to the neighbor pages", async () => {
      const el = await mount(
        '<zbk-pagination current="3" total="12" href-template="/items/page/{page}"></zbk-pagination>',
      );
      expect(control(el, "previous").getAttribute("href")).toBe("/items/page/2");
      expect(control(el, "next").getAttribute("href")).toBe("/items/page/4");
    });

    it("a disabled control drops its href (placeholder link)", async () => {
      const el = await mount(
        '<zbk-pagination current="1" total="5" href-template="?page={page}"></zbk-pagination>',
      );
      const prev = control(el, "previous");
      expect(prev.tagName).toBe("A");
      expect(prev.hasAttribute("href")).toBe(false);
      expect(prev.getAttribute("aria-disabled")).toBe("true");
    });

    it("does not fire zbk-page-change — navigation is the browser's", async () => {
      const el = await mount(
        '<zbk-pagination current="1" total="5" href-template="?page={page}"></zbk-pagination>',
      );
      const onChange = jest.fn();
      el.addEventListener("zbk-page-change", onChange);
      pageItem(el, 2)!.addEventListener("click", (event) => event.preventDefault());
      pageItem(el, 2)!.click();
      expect(onChange).not.toHaveBeenCalled();
    });

    it("warns when the template has no {page} placeholder, naming the fix", async () => {
      await mount(
        '<zbk-pagination current="1" total="5" href-template="/items"></zbk-pagination>',
      );
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('no "{page}" placeholder'),
      );
    });
  });

  describe("compact", () => {
    it('renders prev/next around a "Page X of Y" readout, no page window', async () => {
      const el = await mount(
        '<zbk-pagination compact current="3" total="12"></zbk-pagination>',
      );
      expect(el.querySelector(".zbk-pagination__status")?.textContent?.trim()).toBe(
        "Page 3 of 12",
      );
      expect(pageItems(el)).toHaveLength(0);
      expect(control(el, "previous")).not.toBeNull();
      expect(control(el, "next")).not.toBeNull();
    });

    it("previous/next still page in compact mode", async () => {
      const el = await mount(
        '<zbk-pagination compact current="3" total="12"></zbk-pagination>',
      );
      control(el, "next").click();
      await el.updateComplete;
      expect(el.querySelector(".zbk-pagination__status")?.textContent?.trim()).toBe(
        "Page 4 of 12",
      );
    });
  });

  describe("variants", () => {
    it("ships sm, lg", () => {
      expect(paginationVariants.map((variant) => variant.name)).toEqual(["sm", "lg"]);
    });

    it("applies variant classes to the nav", async () => {
      const el = await mount('<zbk-pagination variant="sm" total="3"></zbk-pagination>');
      expect(nav(el).classList.contains("zbk-pagination--sm")).toBe(true);
    });

    it("every shipped variant override is an alias reference or structural literal", () => {
      const structural = new Set(["transparent", "none", "0", "currentColor"]);
      for (const variant of paginationVariants) {
        for (const value of Object.values(variant.overrides ?? {})) {
          const ok =
            /^\{[a-z0-9.-]+\}$/i.test(value as string) ||
            structural.has(value as string) ||
            /^[\d.]+(rem|em)$/.test(value as string);
          expect(ok ? true : `${variant.name}: ${value}`).toBe(true);
        }
      }
    });
  });

  describe("validation", () => {
    it("clamps and warns on an out-of-range current, naming the fix", async () => {
      const el = await mount('<zbk-pagination current="15" total="12"></zbk-pagination>');
      expect(pageItem(el, 12)!.getAttribute("aria-current")).toBe("page");
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Keep current between 1 and total"),
      );
    });

    it("treats a missing total as a single page", async () => {
      const el = await mount("<zbk-pagination></zbk-pagination>");
      expect(pageItems(el).map((item) => item.textContent?.trim())).toEqual(["1"]);
      expect(control(el, "previous").getAttribute("aria-disabled")).toBe("true");
      expect(control(el, "next").getAttribute("aria-disabled")).toBe("true");
    });
  });

  describe("accessibility", () => {
    it("forwards focus() to the current page item", async () => {
      const el = await mount('<zbk-pagination current="3" total="12"></zbk-pagination>');
      el.focus();
      expect(document.activeElement).toBe(pageItem(el, 3));
    });

    it("forwards focus() to the first control in compact mode", async () => {
      const el = await mount(
        '<zbk-pagination compact current="3" total="12"></zbk-pagination>',
      );
      el.focus();
      expect(document.activeElement).toBe(control(el, "previous"));
    });
  });
});
