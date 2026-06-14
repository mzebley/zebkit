/**
 * @jest-environment node
 */

import type { TokenInterface } from "@definitions/tokens";
import { resolveTypeScale } from "./build-type-scale";

const KEY = "zbk-font-size";

function makeModule(): Record<string, TokenInterface> {
  return {
    [KEY]: {
      "min-viewport": { value: "360px", type: "setting", description: "" },
      "max-viewport": { value: "1240px", type: "setting", description: "" },
      "min-base": { value: "1.125rem", type: "setting", description: "" },
      "max-base": { value: "1.25rem", type: "setting", description: "" },
      "min-ratio": { value: 1.2 as unknown as string, type: "setting", description: "" },
      "max-ratio": { value: 1.25 as unknown as string, type: "setting", description: "" },
      md: {
        index: 0,
        type: "rootFontSize",
        description: "Base.",
        a11y: "--zbk-a11y-font-size-modifier-md",
      } as unknown as TokenInterface[string],
      "3xs": {
        index: -4,
        type: "rootFontSize",
        description: "Smallest.",
        a11y: "--zbk-a11y-font-size-modifier-3xs",
      } as unknown as TokenInterface[string],
      lg: {
        index: 1,
        type: "rootFontSize",
        description: "Large.",
        a11y: "--zbk-a11y-font-size-modifier-lg",
      } as unknown as TokenInterface[string],
    },
  };
}

describe("resolveTypeScale", () => {
  it("strips control settings so they never become CSS variables", () => {
    const out = resolveTypeScale(makeModule(), { mode: "fluid" });
    const keys = Object.keys(out[KEY]);
    expect(keys).not.toContain("min-viewport");
    expect(keys).not.toContain("max-ratio");
    expect(keys).toEqual(expect.arrayContaining(["md", "lg", "3xs"]));
  });

  it("generates a fluid clamp with the a11y modifier baked into every term", () => {
    const out = resolveTypeScale(makeModule(), { mode: "fluid" });
    const md = out[KEY].md.value as string;
    // md is base: min anchor 1.125rem, max anchor 1.25rem.
    expect(md).toBe(
      "clamp(calc(1.125rem * var(--zbk-a11y-font-size-modifier-md)), " +
        "calc((1.0739rem + 0.2273vw) * var(--zbk-a11y-font-size-modifier-md)), " +
        "calc(1.25rem * var(--zbk-a11y-font-size-modifier-md)))"
    );
  });

  it("orders clamp bounds by magnitude so inverted (sub-base) steps don't pin", () => {
    const out = resolveTypeScale(makeModule(), { mode: "fluid" });
    const xs = out[KEY]["3xs"].value as string;
    // For negative steps the small-viewport size (0.5425rem) exceeds the large-viewport
    // size (0.512rem); the lower bound must be the smaller value.
    expect(xs).toMatch(/^clamp\(calc\(0\.512rem /);
    expect(xs).toContain("0.5425rem * var(--zbk-a11y-font-size-modifier-3xs)))");
  });

  it("emits authored literals (a11y-wrapped) in static mode", () => {
    const mod = makeModule();
    (mod[KEY].md as unknown as { value: string }).value = "1.1rem";
    const out = resolveTypeScale(mod, { mode: "static" });
    expect(out[KEY].md.value).toBe(
      "calc(1.1rem * var(--zbk-a11y-font-size-modifier-md))"
    );
  });

  it("honors a per-step static override inside an otherwise-fluid scale", () => {
    const mod = makeModule();
    (mod[KEY].lg as unknown as { value: string }).value = "2rem";
    const out = resolveTypeScale(mod, { mode: "fluid" });
    expect(out[KEY].lg.value).toBe(
      "calc(2rem * var(--zbk-a11y-font-size-modifier-lg))"
    );
    // Other steps stay fluid.
    expect(out[KEY].md.value).toContain("clamp(");
  });

  it("returns the input unchanged when the font-size module is absent", () => {
    const other = { "zbk-color": {} as TokenInterface };
    expect(resolveTypeScale(other)).toBe(other);
  });
});
