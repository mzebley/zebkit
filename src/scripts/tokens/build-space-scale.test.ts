/**
 * @jest-environment node
 */

import type { TokenInterface } from "@definitions/tokens";
import { resolveSpaceScale } from "./build-space-scale";

const SPACING = "zbk-spacing";
const FONT = "zbk-font-size";

function makeTokens(): Record<string, TokenInterface> {
  return {
    [FONT]: {
      "min-viewport": { value: "360px", type: "setting", description: "" },
      "max-viewport": { value: "1240px", type: "setting", description: "" },
    } as unknown as TokenInterface,
    [SPACING]: {
      "min-scale": { value: 0.85 as unknown as string, type: "setting", description: "" },
      "2": { value: "2rem", type: "rootSize", description: "Base spacing.", a11y: true } as unknown as TokenInterface[string],
      "neg-2": { value: "-2rem", type: "rootSize", description: "Negative.", a11y: true } as unknown as TokenInterface[string],
      "0": { value: "0px", type: "rootSize", description: "Zero." } as unknown as TokenInterface[string],
      "1px": { value: "1px", type: "rootSize", description: "Hairline.", a11y: true } as unknown as TokenInterface[string],
      // A semantic alias that shares the module key — must pass through untouched.
      md: { value: "{spacing.2}", type: "spacing", description: "Alias." } as unknown as TokenInterface[string],
    },
  };
}

describe("resolveSpaceScale", () => {
  it("strips the min-scale control so it never becomes a CSS variable", () => {
    const out = resolveSpaceScale(makeTokens());
    expect(Object.keys(out[SPACING])).not.toContain("min-scale");
  });

  it("generates a fluid clamp carrying density and body-text coupling on every term", () => {
    const out = resolveSpaceScale(makeTokens());
    const v = out[SPACING]["2"].value as string;
    expect(v).toMatch(/^clamp\(/);
    // both runtime forces, three times (min / preferred / max)
    expect(v.match(/--zbk-a11y-spacing-modifier/g)).toHaveLength(3);
    expect(
      v.match(/1 \+ \(var\(--zbk-a11y-font-size-modifier-md\) - 1\) \* var\(--zbk-a11y-spacing-text-coupling\)/g)
    ).toHaveLength(3);
    // 2rem max anchor, 1.7rem min anchor
    expect(v).toContain("1.7rem");
    expect(v).toContain("2rem");
  });

  it("orders clamp bounds by magnitude for negative spacing", () => {
    const out = resolveSpaceScale(makeTokens());
    const v = out[SPACING]["neg-2"].value as string;
    // lower bound is the most-negative (-2rem), upper is -1.7rem
    expect(v).toMatch(/^clamp\(calc\(-2rem/);
    expect(v).toContain("-1.7rem");
  });

  it("emits zero exact (scaling zero is pointless)", () => {
    const out = resolveSpaceScale(makeTokens());
    expect(out[SPACING]["0"].value).toBe("0");
  });

  it("scales precision px with the a11y multiplier but no viewport interpolation", () => {
    const out = resolveSpaceScale(makeTokens());
    const v = out[SPACING]["1px"].value as string;
    // no fluid interpolation for a hairline...
    expect(v).not.toContain("clamp(");
    expect(v).not.toContain("vw");
    // ...but the px value still honors the runtime a11y dials
    expect(v).toBe(
      "calc(1px * var(--zbk-a11y-spacing-modifier) * (1 + (var(--zbk-a11y-font-size-modifier-md) - 1) * var(--zbk-a11y-spacing-text-coupling)))"
    );
  });

  it("passes semantic aliases ({…} references, type spacing) through untouched", () => {
    const out = resolveSpaceScale(makeTokens());
    expect(out[SPACING].md.value).toBe("{spacing.2}");
    expect(out[SPACING].md.type).toBe("spacing");
  });

  it("drops the viewport interpolation in static mode but keeps density + coupling", () => {
    const out = resolveSpaceScale(makeTokens(), { mode: "static" });
    const v = out[SPACING]["2"].value as string;
    expect(v).not.toContain("clamp(");
    expect(v).not.toContain("vw");
    expect(v).toContain("var(--zbk-a11y-spacing-modifier)");
    expect(v).toContain("var(--zbk-a11y-spacing-text-coupling)");
  });

  it("returns the input unchanged when the spacing module is absent", () => {
    const other = { "zbk-color": {} as TokenInterface };
    expect(resolveSpaceScale(other)).toBe(other);
  });
});
