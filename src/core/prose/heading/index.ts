import { LitElement, css, nothing } from "lit";
import { html, unsafeStatic } from "lit/static-html.js";
import { customElement, property, state } from "lit/decorators.js";
import { ZEBKIT_PREFIX } from "@config";

const CSS_VAR_PREFIX = `--${ZEBKIT_PREFIX}-`;

const headingVar = (level: number, name: string) =>
  `var(${CSS_VAR_PREFIX}h${level}-${name})`;

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const LINK_ICON_SVG = html`<svg
  xmlns="http://www.w3.org/2000/svg"
  width="1em"
  height="1em"
  viewBox="0 0 16 16"
  fill="currentColor"
  aria-hidden="true"
>
  <path
    d="M7.775 3.275a.75.75 0 0 0 1.06 1.06l1.25-1.25a2 2 0 1 1 2.83 2.83l-2.5 2.5a2 2 0 0 1-2.83 0 .75.75 0 0 0-1.06 1.06 3.5 3.5 0 0 0 4.95 0l2.5-2.5a3.5 3.5 0 0 0-4.95-4.95l-1.25 1.25zm-4.69 9.64a2 2 0 0 1 0-2.83l2.5-2.5a2 2 0 0 1 2.83 0 .75.75 0 0 0 1.06-1.06 3.5 3.5 0 0 0-4.95 0l-2.5 2.5a3.5 3.5 0 0 0 4.95 4.95l1.25-1.25a.75.75 0 0 0-1.06-1.06l-1.25 1.25a2 2 0 0 1-2.83 0z"
  />
</svg>`;

const CHECK_ICON_SVG = html`<svg
  xmlns="http://www.w3.org/2000/svg"
  width="1em"
  height="1em"
  viewBox="0 0 16 16"
  fill="currentColor"
  aria-hidden="true"
>
  <path
    d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0z"
  />
</svg>`;

const COPIED_RESET_MS = 2000;

@customElement("zbk-heading")
export class ZbkHeading extends LitElement {
  static styles = css`
    :host {
      display: block;
      margin-block-start: var(--zbk-heading-spacing-before, 0);
      margin-block-end: var(--zbk-heading-spacing-after, 0);
    }

    :host([hidden]) {
      display: none;
    }

    .zbk-heading {
      font-family: var(--zbk-heading-font-family, inherit);
      font-size: var(--zbk-heading-font-size, inherit);
      font-weight: var(--zbk-heading-font-weight, inherit);
      font-style: var(--zbk-heading-font-style, normal);
      line-height: var(--zbk-heading-line-height, inherit);
      letter-spacing: var(--zbk-heading-letter-spacing, normal);
      color: var(--zbk-heading-color, inherit);
      text-transform: var(--zbk-heading-text-transform, none);
      max-width: var(--zbk-heading-measure, none);
      position: relative;
    }

    /* Plain anchor point — no visual */
    .zbk-heading-anchor {
      display: inline-block;
    }

    /* Copy-link affordance */
    .zbk-heading-anchor--copy {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-inline-end: var(--zbk-heading-anchor-gap, 0.35em);
      color: var(--zbk-heading-anchor-color, currentColor);
      opacity: 0;
      transition: opacity 0.15s ease, color 0.15s ease;
      text-decoration: none;
      vertical-align: middle;
      line-height: 1;
      cursor: pointer;
      border: none;
      background: none;
      padding: 0;
    }

    :host(:hover) .zbk-heading-anchor--copy,
    .zbk-heading-anchor--copy:focus-visible {
      opacity: var(--zbk-heading-anchor-hover-opacity, 0.6);
    }

    .zbk-heading-anchor--copy:hover {
      opacity: 1 !important;
    }

    .zbk-heading-anchor--copy[data-copied] {
      opacity: 1;
      color: var(--zbk-heading-anchor-copied-color, currentColor);
    }
  `;

  @property({ type: Number, reflect: true })
  level = 1;

  @property({ type: Boolean, reflect: true })
  anchor = false;

  @property({ type: Boolean, reflect: true, attribute: "copy-link" })
  copyLink = false;

  @state()
  private _slugId = "";

  @state()
  private _copied = false;

  private _copiedTimer: ReturnType<typeof setTimeout> | null = null;

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._copiedTimer !== null) {
      clearTimeout(this._copiedTimer);
    }
  }

  private _updateSlug() {
    const slot = this.shadowRoot?.querySelector("slot");
    const text =
      slot
        ?.assignedNodes({ flatten: true })
        .map((n) => n.textContent ?? "")
        .join("")
        .trim() ?? "";
    this._slugId = slugify(text);
  }

  private _applyLevelTokens() {
    const l = this.level;
    this.style.setProperty("--zbk-heading-font-family", headingVar(l, "font-family"));
    this.style.setProperty("--zbk-heading-font-size", headingVar(l, "font-size"));
    this.style.setProperty("--zbk-heading-font-weight", headingVar(l, "font-weight"));
    this.style.setProperty("--zbk-heading-font-style", headingVar(l, "font-style"));
    this.style.setProperty("--zbk-heading-line-height", headingVar(l, "line-height"));
    this.style.setProperty("--zbk-heading-letter-spacing", headingVar(l, "letter-spacing"));
    this.style.setProperty("--zbk-heading-color", headingVar(l, "color"));
    this.style.setProperty("--zbk-heading-text-transform", headingVar(l, "text-transform"));
    this.style.setProperty("--zbk-heading-measure", headingVar(l, "measure"));
    this.style.setProperty("--zbk-heading-spacing-before", headingVar(l, "spacing-before"));
    this.style.setProperty("--zbk-heading-spacing-after", headingVar(l, "spacing-after"));
  }

  private async _handleCopyLink(e: Event) {
    e.preventDefault();
    const url =
      window.location.origin +
      window.location.pathname +
      window.location.search +
      "#" +
      this._slugId;
    await navigator.clipboard.writeText(url);
    this._copied = true;
    if (this._copiedTimer !== null) clearTimeout(this._copiedTimer);
    this._copiedTimer = setTimeout(() => {
      this._copied = false;
      this._copiedTimer = null;
    }, COPIED_RESET_MS);
  }

  protected updated(changed: Map<string, unknown>) {
    if (changed.has("level")) {
      this._applyLevelTokens();
    }

    const needsId = this.anchor || this.copyLink;
    if (changed.has("anchor") || changed.has("copyLink") || changed.has("_slugId")) {
      if (needsId && this._slugId) {
        this.setAttribute("id", this._slugId);
      } else if (!needsId) {
        this.removeAttribute("id");
      }
    }
  }

  protected firstUpdated() {
    this._applyLevelTokens();
    this._updateSlug();
  }

  render() {
    const tag = unsafeStatic(`h${this.level}`);
    const showAnchor = (this.anchor || this.copyLink) && this._slugId;

    const anchorEl = showAnchor
      ? this.copyLink
        ? html`<a
            href="#${this._slugId}"
            class="zbk-heading-anchor zbk-heading-anchor--copy"
            part="anchor"
            aria-label="${this._copied ? "Copied!" : "Copy link to this section"}"
            ?data-copied=${this._copied}
            @click=${this._handleCopyLink}
          >
            ${this._copied ? CHECK_ICON_SVG : LINK_ICON_SVG}
          </a>`
        : html`<a
            href="#${this._slugId}"
            class="zbk-heading-anchor"
            part="anchor"
            aria-hidden="true"
            tabindex="-1"
          ></a>`
      : nothing;

    return html`
      <${tag} class="zbk-heading" part="heading">
        ${anchorEl}
        <slot @slotchange=${this._updateSlug}></slot>
      </${tag}>
    `;
  }
}

export const defineZbkHeading = () => {
  if (!customElements.get("zbk-heading")) {
    customElements.define("zbk-heading", ZbkHeading);
  }
};
