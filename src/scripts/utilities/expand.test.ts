/**
 * @jest-environment node
 *
 * Class prediction for the `rules` family kind. A rules family carries verbatim
 * rule blocks (compound/pseudo/element selectors) instead of a class grammar, so
 * its predicted class set is every '.class' token in its selectors — that is what
 * keeps U3's bidirectional diff honest for hand-written rule blocks.
 */

import {
  classesInSelector,
  classesFromRules,
  expandFamily,
  statePatternEntries,
  type UtilityFamily,
} from "./expand";

describe("classesInSelector", () => {
  it("extracts class tokens and ignores element/attribute/pseudo parts", () => {
    expect(classesInSelector(".prose > p, p.prose")).toEqual(["prose", "prose"]);
    expect(classesInSelector("[class^='transition-'], [class*=' transition-']")).toEqual([]);
    expect(classesInSelector("&.transition-slow")).toEqual(["transition-slow"]);
    expect(classesInSelector(".focusable:focus, .focusable:focus-visible")).toEqual([
      "focusable",
      "focusable",
    ]);
  });
});

describe("classesFromRules", () => {
  it("walks nested rules", () => {
    const classes = classesFromRules([
      {
        selector: "[class^='transition-']",
        declarations: { "transition-duration": "var(--zbk-transition-duration)" },
        nested: [
          { selector: "&.transition-slow", declarations: { "--zbk-transition-duration": "1s" } },
          { selector: "&.transition-fast", declarations: { "--zbk-transition-duration": "0s" } },
        ],
      },
    ]);
    expect(new Set(classes)).toEqual(new Set(["transition-slow", "transition-fast"]));
  });
});

describe("expandFamily on a rules family", () => {
  it("predicts exactly the classes named in the selectors", () => {
    const family: UtilityFamily = {
      name: "focus",
      description: "",
      source: "src/tokens/focus/styles.scss",
      properties: ["outline-color"],
      rules: [
        {
          selector: ".focusable:focus, .focusable:focus-within, .focusable:focus-visible",
          declarations: { "outline-color": "var(--zbk-focus-color)" },
        },
      ],
    };
    const { classes } = expandFamily(family);
    expect(classes).toEqual(new Set(["focusable"]));
  });
});

describe("statePattern projections", () => {
  const family: UtilityFamily = {
    name: "semantic-color",
    description: "",
    source: "semantic-color.scss",
    properties: ["color", "fill", "stroke"],
    statePattern: {
      axes: { family: ["app", "brand"] },
      projections: [
        {
          targets: { ink: "color" },
          class: "{target}-{family}",
          var: "--zbk-{family}-{target}",
        },
        {
          targets: { fill: "fill", stroke: "stroke" },
          axes: { role: ["canvas", "ink"] },
          class: "{target}-{family}-{role}",
          var: "--zbk-{family}-{role}",
        },
      ],
      states: ["base"],
    },
  };

  it("keeps the CSS property target independent from the selected token role", () => {
    expect(statePatternEntries(family.statePattern!)).toContainEqual({
      className: "fill-app-canvas",
      properties: ["fill"],
      varName: "--zbk-app-canvas",
      varSource: undefined,
    });
    expect(statePatternEntries(family.statePattern!)).toContainEqual({
      className: "stroke-brand-ink",
      properties: ["stroke"],
      varName: "--zbk-brand-ink",
      varSource: undefined,
    });
  });

  it("expands every projection into the claimed class vocabulary", () => {
    const { classes } = expandFamily(family);
    expect(classes).toContain("ink-app");
    expect(classes).toContain("fill-app-canvas");
    expect(classes).toContain("stroke-brand-ink");
    expect(classes).not.toContain("fill-app");
  });
});
