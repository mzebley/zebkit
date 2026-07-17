// <zbk-pagination> — the zebkit pagination.
//
// A light-DOM custom element rendering the APG pagination pattern: a
// <nav aria-label="Pagination"> wrapping a list of page items with
// previous/next controls, the current page marked aria-current="page", and a
// windowed page display with non-interactive ellipses (see ./window.ts for
// the algorithm and its worked examples).
//
//   <zbk-pagination current="3" total="12"></zbk-pagination>
//
// One spelling per navigation intent: when `href-template` is present every
// item is a real link (`?page={page}` -> ?page=7) and the browser navigates;
// without it items are buttons and a page choice surfaces as a cancelable
// `zbk-page-change` event — uncanceled, the element adopts the page and
// announces it through the shared live region.
//
// Styling lives entirely in the compiled zebkit CSS (`.zbk-pagination`,
// consuming `--zbk-pagination-*` tokens) — this file contains zero visual
// opinion.

import {
  html,
  nothing,
  type PropertyDeclarations,
  type PropertyValues,
  type TemplateResult,
} from "lit";
import { ZebkitElement, type IconPosition } from "../base/zebkit-element";
import { announce } from "../base/announce";
import { paginationVariants } from "./variants/index";
import { slotContract } from "./slot-contract";
import { paginationWindow, type PaginationWindowItem } from "./window";

export { paginationWindow, type PaginationWindowItem } from "./window";

/** Detail carried by the `zbk-page-change` event. */
export interface ZbkPageChangeDetail {
  /** The page the user chose (already clamped to 1..total). */
  page: number;
}

/**
 * The zebkit pagination: a light-DOM element rendering page navigation for a
 * partitioned collection as a `<nav>` of page items with previous/next
 * controls, `aria-current="page"` on the current page, and a windowed page
 * display with ellipses. Items are real links when `href-template` is set
 * (the browser navigates); otherwise they are buttons and a choice surfaces
 * as the cancelable `zbk-page-change` event — uncanceled, the element adopts
 * the page and announces "Page X of Y" through the shared live region.
 *
 * @fires zbk-page-change - A page was chosen in button mode. `detail.page` is
 * the requested page; `preventDefault()` keeps `current` unchanged for
 * consumers that own the state.
 */
export class ZbkPagination extends ZebkitElement {
  static componentName = "pagination";
  static variantConfigs = paginationVariants;
  static slotContract = slotContract;

  static properties: PropertyDeclarations = {
    current: { type: Number },
    total: { type: Number },
    siblings: { type: Number },
    boundaries: { type: Number },
    compact: { type: Boolean },
    hrefTemplate: { type: String, attribute: "href-template" },
  };

  /** The current page, 1-based. Values outside 1..total warn and clamp. */
  current = 1;

  /** Total number of pages in the collection. */
  total = 1;

  /** Page neighbors shown on each side of the current page. */
  siblings = 1;

  /** Pages pinned at each end of the window. */
  boundaries = 1;

  /** Compact presentation: previous/next around a "Page X of Y" readout. */
  compact = false;

  /**
   * URL template with a `{page}` placeholder (e.g. "?page={page}"). When set,
   * items render as real links and navigation is the browser's — better for
   * crawlers and modified-click. Leave unset for buttons + `zbk-page-change`.
   */
  hrefTemplate?: string;

  protected get nativeElement(): HTMLElement | null {
    return this.querySelector(":scope > nav");
  }

  /** Focus lands on the current page item (or the first control in compact mode). */
  protected get focusTarget(): HTMLElement | null {
    return (
      this.querySelector<HTMLElement>('[aria-current="page"]') ??
      this.querySelector<HTMLElement>(`.${this.baseClass}__item`)
    );
  }

  /** `total`, floored to a sane page count. */
  private pageCount(): number {
    return Math.max(1, Math.floor(this.total) || 1);
  }

  /** `current`, clamped into 1..total for rendering. */
  private clampedCurrent(): number {
    return Math.min(Math.max(Math.floor(this.current) || 1, 1), this.pageCount());
  }

  protected render(): TemplateResult {
    const total = this.pageCount();
    const current = this.clampedCurrent();
    return html`<nav class=${this.componentClasses}>
      <ul class="${this.baseClass}__list">
        <li>${this.renderControl("previous", current, total)}</li>
        ${this.compact
          ? html`<li>
              <span class="${this.baseClass}__status">Page ${current} of ${total}</span>
            </li>`
          : this.windowItems(current, total).map(
              (item) => html`<li>${this.renderWindowItem(item, current)}</li>`,
            )}
        <li>${this.renderControl("next", current, total)}</li>
      </ul>
    </nav>`;
  }

  private windowItems(current: number, total: number): PaginationWindowItem[] {
    return paginationWindow(
      current,
      total,
      Math.max(0, Math.floor(this.siblings) || 0),
      Math.max(0, Math.floor(this.boundaries) || 0),
    );
  }

  private renderWindowItem(
    item: PaginationWindowItem,
    current: number,
  ): TemplateResult {
    if (item === "ellipsis") {
      return html`<span class="${this.baseClass}__ellipsis" aria-hidden="true"
        >&hellip;</span
      >`;
    }
    const classes = `${this.baseClass}__item ${this.baseClass}__item--page`;
    const label = `Page ${item}`;
    const isCurrent = item === current;
    if (this.hrefTemplate) {
      return html`<a
        class=${classes}
        href=${this.hrefFor(item)}
        aria-label=${label}
        aria-current=${isCurrent ? "page" : nothing}
        >${item}</a
      >`;
    }
    return html`<button
      type="button"
      class=${classes}
      aria-label=${label}
      aria-current=${isCurrent ? "page" : nothing}
      @click=${() => this.requestPage(item)}
    >
      ${item}
    </button>`;
  }

  private renderControl(
    direction: "previous" | "next",
    current: number,
    total: number,
  ): TemplateResult {
    const isPrevious = direction === "previous";
    const target = isPrevious ? current - 1 : current + 1;
    const disabled = isPrevious ? current <= 1 : current >= total;
    const classes = `${this.baseClass}__item ${this.baseClass}__item--${direction}`;
    const label = isPrevious ? "Previous page" : "Next page";
    const glyph = this.controlGlyph(isPrevious ? "start" : "end");
    if (this.hrefTemplate) {
      // A disabled control drops its href (a placeholder link): unreachable by
      // Tab and announced as plain text — native link semantics, no dead click.
      return html`<a
        class=${classes}
        href=${disabled ? nothing : this.hrefFor(target)}
        aria-label=${label}
        aria-disabled=${disabled ? "true" : nothing}
        >${glyph}</a
      >`;
    }
    // aria-disabled (not native disabled) keeps the control focusable, so
    // keyboard users reaching the first/last page don't lose their place.
    return html`<button
      type="button"
      class=${classes}
      aria-label=${label}
      aria-disabled=${disabled ? "true" : nothing}
      @click=${() => (disabled ? undefined : this.requestPage(target))}
    >
      ${glyph}
    </button>`;
  }

  /** Slotted icon content replaces the drawn chevron at that position. */
  private controlGlyph(position: IconPosition): TemplateResult {
    if (this.hasIcon(position)) {
      return this.renderIcon(position) as TemplateResult;
    }
    // The chevron is structure (the shape of a chevron); its size is the
    // icon-size token and its color is the item's ink via currentColor.
    const path = position === "start" ? "M10 3 5 8l5 5" : "M6 3l5 5-5 5";
    return html`<span
      class="${this.baseClass}__icon ${this.baseClass}__icon--${position}"
      aria-hidden="true"
      ><svg viewBox="0 0 16 16" fill="none">
        <path
          d=${path}
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        /></svg
    ></span>`;
  }

  /** The URL for a page, from the `href-template` `{page}` placeholder. */
  private hrefFor(page: number): string {
    return (this.hrefTemplate ?? "").split("{page}").join(String(page));
  }

  /**
   * Button-mode page choice: dispatch the cancelable event; uncanceled, adopt
   * the page and announce it through the shared live region.
   */
  private requestPage(page: number): void {
    const total = this.pageCount();
    const next = Math.min(Math.max(page, 1), total);
    if (next === this.clampedCurrent()) return;
    const proceed = this.dispatchEvent(
      new CustomEvent<ZbkPageChangeDetail>("zbk-page-change", {
        detail: { page: next },
        bubbles: true,
        composed: true,
        cancelable: true,
      }),
    );
    if (proceed) {
      this.current = next;
      announce(`Page ${next} of ${total}`);
    }
  }

  protected willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed);
    if (changed.has("current") || changed.has("total")) {
      const total = this.pageCount();
      const raw = Math.floor(this.current) || 1;
      if (raw < 1 || raw > total) {
        this.warn(
          `current="${this.current}" is outside 1–${total}; rendering page ${this.clampedCurrent()}. Keep current between 1 and total.`,
        );
      }
    }
    if (
      changed.has("hrefTemplate") &&
      this.hrefTemplate &&
      !this.hrefTemplate.includes("{page}")
    ) {
      this.warn(
        `href-template "${this.hrefTemplate}" has no "{page}" placeholder, so every page links to the same URL. Put "{page}" where the page number belongs, e.g. "?page={page}".`,
      );
    }
  }

  protected firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed);
    // The nav needs an accessible name; authored aria-label/aria-labelledby
    // (relocated by the base class) wins, "Pagination" is the default.
    const nav = this.nativeElement;
    if (
      nav &&
      !nav.hasAttribute("aria-label") &&
      !nav.hasAttribute("aria-labelledby")
    ) {
      nav.setAttribute("aria-label", "Pagination");
    }
  }
}

/** Register <zbk-pagination> (idempotent). */
export const defineZbkPagination = (): void => {
  if (!customElements.get("zbk-pagination")) {
    customElements.define("zbk-pagination", ZbkPagination);
  }
};
