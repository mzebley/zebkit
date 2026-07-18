/**
 * @jest-environment node
 */

import type { TokenGroupExtensions, TokenInterface } from "@definitions/tokens";
import { resolveSpaceScale } from "./build-space-scale";

const SPACING = "zbk-spacing";
const FONT = "zbk-font-size";

const GROUP_EXTENSIONS: Record<string, TokenGroupExtensions> = {
  [FONT]: {
    "dev.zebkit": {
      scale: { "min-viewport": "360px", "max-viewport": "1240px" },
    },
  },
  [SPACING]: {
    "dev.zebkit": {
      scale: { "max-scale": 1.25 },
    },
  },
};

function makeTokens(): Record<string, TokenInterface> {
  return {
    [SPACING]: {
      "2": { $value: "2rem", $type: "rootSize", $description: "Base spacing.", $extensions: { "dev.zebkit": { a11y: true } } } as unknown as TokenInterface[string],
      "neg-2": { $value: "-2rem", $type: "rootSize", $description: "Negative.", $extensions: { "dev.zebkit": { a11y: true } } } as unknown as TokenInterface[string],
      // Micro floor (== MICRO_ANCHOR): curve growth is exactly 1, so it stays flat.
      "05": { $value: "0.5rem", $type: "rootSize", $description: "Tiny.", $extensions: { "dev.zebkit": { a11y: true } } } as unknown as TokenInterface[string],
      // Macro floor (== MACRO_ANCHOR): curve growth reaches the full max-scale.
      "16": { $value: "16rem", $type: "rootSize", $description: "Macro.", $extensions: { "dev.zebkit": { a11y: true } } } as unknown as TokenInterface[string],
      // Per-token override: pins growth, bypassing the curve.
      pinned: { $value: "1rem", $type: "rootSize", $description: "Pinned.", $extensions: { "dev.zebkit": { a11y: true } }, growth: 1.5 } as unknown as TokenInterface[string],
      "0": { $value: "0px", $type: "rootSize", $description: "Zero." } as unknown as TokenInterface[string],
      "1px": { $value: "1px", $type: "rootSize", $description: "Hairline.", $extensions: { "dev.zebkit": { a11y: true } } } as unknown as TokenInterface[string],
      // A semantic alias that shares the module key — must pass through untouched.
      md: { $value: "{spacing.2}", $type: "spacing", $description: "Alias." } as unknown as TokenInterface[string],
    },
  };
}

describe("resolveSpaceScale", () => {
  it("falls back to default controls when group scale metadata is absent", () => {
    const out = resolveSpaceScale(makeTokens());
    // Defaults match the shipped controls, so resolution still produces clamps.
    expect(out[SPACING]["2"].$value).toMatch(/^clamp\(/);
  });

  it("generates a fluid clamp carrying density and body-text coupling on every term", () => {
    const out = resolveSpaceScale(makeTokens(), { groupExtensions: GROUP_EXTENSIONS });
    const v = out[SPACING]["2"].$value as string;
    expect(v).toMatch(/^clamp\(/);
    // both runtime forces, three times (min / preferred / max)
    expect(v.match(/--zbk-a11y-spacing-modifier/g)).toHaveLength(3);
    expect(
      v.match(/1 \+ \(var\(--zbk-a11y-font-size-modifier-md\) - 1\) \* var\(--zbk-a11y-spacing-text-coupling\)/g)
    ).toHaveLength(3);
    // 2rem authored floor (min anchor); curve growth at 2rem is t=0.4 → ×1.10 → 2.2rem max
    expect(v).toContain("2rem");
    expect(v).toContain("2.2rem");
  });

  it("keeps micro floors flat — no viewport growth at/below the micro anchor", () => {
    const out = resolveSpaceScale(makeTokens(), { groupExtensions: GROUP_EXTENSIONS });
    const v = out[SPACING]["05"].$value as string;
    expect(v).not.toContain("clamp(");
    expect(v).not.toContain("vw");
    expect(v).toBe(
      "calc(0.5rem * var(--zbk-a11y-spacing-modifier) * (1 + (var(--zbk-a11y-font-size-modifier-md) - 1) * var(--zbk-a11y-spacing-text-coupling)))"
    );
  });

  it("grows macro floors to the full max-scale ceiling", () => {
    const out = resolveSpaceScale(makeTokens(), { groupExtensions: GROUP_EXTENSIONS });
    const v = out[SPACING]["16"].$value as string;
    // 16rem floor (== macro anchor) → growth 1.25 → 20rem max anchor
    expect(v).toMatch(/^clamp\(calc\(16rem/);
    expect(v).toContain("20rem");
  });

  it("honors a per-token growth override, bypassing the curve", () => {
    const out = resolveSpaceScale(makeTokens(), { groupExtensions: GROUP_EXTENSIONS });
    const v = out[SPACING].pinned.$value as string;
    // 1rem floor; curve would give ~1.05, but growth:1.5 pins the max anchor to 1.5rem
    expect(v).toMatch(/^clamp\(calc\(1rem/);
    expect(v).toContain("1.5rem");
  });

  it("orders clamp bounds by magnitude for negative spacing", () => {
    const out = resolveSpaceScale(makeTokens(), { groupExtensions: GROUP_EXTENSIONS });
    const v = out[SPACING]["neg-2"].$value as string;
    // -2rem floor; curve grows magnitude to -2.2rem, the most-negative (lower) bound
    expect(v).toMatch(/^clamp\(calc\(-2.2rem/);
    expect(v).toContain("-2rem");
  });

  it("emits zero exact (scaling zero is pointless)", () => {
    const out = resolveSpaceScale(makeTokens(), { groupExtensions: GROUP_EXTENSIONS });
    expect(out[SPACING]["0"].$value).toBe("0");
  });

  it("scales precision px with the a11y multiplier but no viewport interpolation", () => {
    const out = resolveSpaceScale(makeTokens(), { groupExtensions: GROUP_EXTENSIONS });
    const v = out[SPACING]["1px"].$value as string;
    // no fluid interpolation for a hairline...
    expect(v).not.toContain("clamp(");
    expect(v).not.toContain("vw");
    // ...but the px value still honors the runtime a11y dials
    expect(v).toBe(
      "calc(1px * var(--zbk-a11y-spacing-modifier) * (1 + (var(--zbk-a11y-font-size-modifier-md) - 1) * var(--zbk-a11y-spacing-text-coupling)))"
    );
  });

  it("passes semantic aliases ({…} references, type spacing) through untouched", () => {
    const out = resolveSpaceScale(makeTokens(), { groupExtensions: GROUP_EXTENSIONS });
    expect(out[SPACING].md.$value).toBe("{spacing.2}");
    expect(out[SPACING].md.$type).toBe("spacing");
  });

  it("drops the viewport interpolation in static mode but keeps density + coupling", () => {
    const out = resolveSpaceScale(makeTokens(), { mode: "static", groupExtensions: GROUP_EXTENSIONS });
    const v = out[SPACING]["2"].$value as string;
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
