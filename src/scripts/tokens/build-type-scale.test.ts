/**
 * @jest-environment node
 */

import type { TokenGroupExtensions, TokenInterface } from "@definitions/tokens";
import { resolveTypeScale } from "./build-type-scale";

const KEY = "zbk-font-size";

function makeGroupExtensions(): Record<string, TokenGroupExtensions> {
  return {
    [KEY]: {
      "dev.zebkit": {
        scale: {
          "min-viewport": "360px",
          "max-viewport": "1240px",
          "min-base": "1.125rem",
          "max-base": "1.25rem",
          "min-ratio": 1.2,
          "max-ratio": 1.25,
        },
      },
    },
  };
}

function makeModule(): Record<string, TokenInterface> {
  return {
    [KEY]: {
      md: {
        $type: "rootFontSize",
        $description: "Base.",
        $extensions: {
          "dev.zebkit": { a11y: "--zbk-a11y-font-size-modifier-md", scale: { index: 0 } },
        },
      } as unknown as TokenInterface[string],
      "3xs": {
        $type: "rootFontSize",
        $description: "Smallest.",
        $extensions: {
          "dev.zebkit": { a11y: "--zbk-a11y-font-size-modifier-3xs", scale: { index: -4 } },
        },
      } as unknown as TokenInterface[string],
      lg: {
        $type: "rootFontSize",
        $description: "Large.",
        $extensions: {
          "dev.zebkit": { a11y: "--zbk-a11y-font-size-modifier-lg", scale: { index: 1 } },
        },
      } as unknown as TokenInterface[string],
    },
  };
}

describe("resolveTypeScale", () => {
  it("resolves every step from the group-level scale controls", () => {
    const out = resolveTypeScale(makeModule(), {
      mode: "fluid",
      groupExtensions: makeGroupExtensions(),
    });
    const keys = Object.keys(out[KEY]);
    expect(keys).toEqual(expect.arrayContaining(["md", "lg", "3xs"]));
    for (const key of keys) {
      expect(typeof out[KEY][key].$value).toBe("string");
    }
  });

  it("leaves the scale unresolved when the group's controls are incomplete", () => {
    const incomplete: Record<string, TokenGroupExtensions> = {
      [KEY]: { "dev.zebkit": { scale: { "min-viewport": "360px" } } },
    };
    const mod = makeModule();
    const out = resolveTypeScale(mod, { mode: "fluid", groupExtensions: incomplete });
    expect(out).toBe(mod);
  });

  it("generates a fluid clamp with the a11y modifier baked into every term", () => {
    const out = resolveTypeScale(makeModule(), {
      mode: "fluid",
      groupExtensions: makeGroupExtensions(),
    });
    const md = out[KEY].md.$value as string;
    // md is base: min anchor 1.125rem, max anchor 1.25rem.
    expect(md).toBe(
      "clamp(calc(1.125rem * var(--zbk-a11y-font-size-modifier-md)), " +
        "calc((1.0739rem + 0.2273vw) * var(--zbk-a11y-font-size-modifier-md)), " +
        "calc(1.25rem * var(--zbk-a11y-font-size-modifier-md)))"
    );
  });

  it("orders clamp bounds by magnitude so inverted (sub-base) steps don't pin", () => {
    const out = resolveTypeScale(makeModule(), {
      mode: "fluid",
      groupExtensions: makeGroupExtensions(),
    });
    const xs = out[KEY]["3xs"].$value as string;
    // For negative steps the small-viewport size (0.5425rem) exceeds the large-viewport
    // size (0.512rem); the lower bound must be the smaller value.
    expect(xs).toMatch(/^clamp\(calc\(0\.512rem /);
    expect(xs).toContain("0.5425rem * var(--zbk-a11y-font-size-modifier-3xs)))");
  });

  it("emits authored literals (a11y-wrapped) in static mode", () => {
    const mod = makeModule();
    (mod[KEY].md as unknown as { $value: string }).$value = "1.1rem";
    const out = resolveTypeScale(mod, {
      mode: "static",
      groupExtensions: makeGroupExtensions(),
    });
    expect(out[KEY].md.$value).toBe(
      "calc(1.1rem * var(--zbk-a11y-font-size-modifier-md))"
    );
  });

  it("honors a per-step static override inside an otherwise-fluid scale", () => {
    const mod = makeModule();
    (mod[KEY].lg as unknown as { $value: string }).$value = "2rem";
    const out = resolveTypeScale(mod, {
      mode: "fluid",
      groupExtensions: makeGroupExtensions(),
    });
    expect(out[KEY].lg.$value).toBe(
      "calc(2rem * var(--zbk-a11y-font-size-modifier-lg))"
    );
    // Other steps stay fluid.
    expect(out[KEY].md.$value).toContain("clamp(");
  });

  it("returns the input unchanged when the font-size module is absent", () => {
    const other = { "zbk-color": {} as TokenInterface };
    expect(resolveTypeScale(other)).toBe(other);
  });
});
