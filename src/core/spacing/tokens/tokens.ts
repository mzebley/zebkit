import type { LayerName } from "@definitions/layers";
import { z } from "zod";
import { tokenSchema } from "./token-schema";

export const key = "spacing";
export const layer: LayerName = "base";
export type SpacingTokens = z.infer<typeof tokenSchema>;

const tokens = {
  "viewport-modifier": {
    value: `1vw`,
    type: "utility",
    description:
      "Amount of viewport to add to sizing classes (only on screens wider than 40rem)",
  },
  "max-size-modifer": {
    value: `1.25`,
    type: "utility",
    description:
      "Maximum amount the viewport modifier can increase a sizing token by.",
  },
  "neg-15": {
    value: `-15rem`,
    type: "utility",
    description:
      "Extremely large negative spacing (major overlap or pull effects).",
    a11y: true,
  },
  "neg-10": {
    value: `-10rem`,
    type: "rootSize",
    description: "Very large negative spacing.",
    a11y: true,
  },
  "neg-9": {
    value: `-9rem`,
    type: "rootSize",
    description: "Large negative spacing.",
    a11y: true,
  },
  "neg-8": {
    value: `-8rem`,
    type: "rootSize",
    description: "Large negative spacing (slightly smaller).",
    a11y: true,
  },
  "neg-7": {
    value: `-7rem`,
    type: "rootSize",
    description: "Medium-large negative spacing.",
    a11y: true,
  },
  "neg-6": {
    value: `-6rem`,
    type: "rootSize",
    description: "Medium negative spacing.",
    a11y: true,
  },
  "neg-5": {
    value: `-5rem`,
    type: "rootSize",
    description: "Medium negative spacing (slightly smaller).",
    a11y: true,
  },
  "neg-4": {
    value: `-4rem`,
    type: "rootSize",
    description: "Small-medium negative spacing.",
    a11y: true,
  },
  "neg-3": {
    value: `-3rem`,
    type: "rootSize",
    description: "Small negative spacing.",
    a11y: true,
  },
  "neg-205": {
    value: `-2.5rem`,
    type: "rootSize",
    description: "Extra-small negative spacing.",
    a11y: true,
  },
  "neg-2": {
    value: `-2rem`,
    type: "rootSize",
    description: "Tiny negative spacing.",
    a11y: true,
  },
  "neg-105": {
    value: `-1.5rem`,
    type: "rootSize",
    description: "Very tiny negative spacing.",
    a11y: true,
  },
  "neg-1": {
    value: `-1rem`,
    type: "rootSize",
    description: "Minimal negative spacing.",
    a11y: true,
  },
  "neg-05": {
    value: `-.5rem`,
    type: "rootSize",
    description: "Minimal negative spacing (smaller).",
    a11y: true,
  },
  "neg-025": {
    value: `-.25rem`,
    type: "rootSize",
    description: "Hairline negative spacing.",
    a11y: true,
  },
  "neg-2px": {
    value: `-2px`,
    type: "rootSize",
    description: "Precision negative spacing (coarse).",
    a11y: true,
  },
  "neg-1px": {
    value: `-1px`,
    type: "rootSize",
    description: "Precision negative spacing (fine).",
    a11y: true,
  },
  "0": {
    value: `0px`,
    type: "rootSize",
    description: "Zero spacing.",
  },
  "1px": {
    value: `1px`,
    type: "rootSize",
    description: "Precision spacing (fine).",
    a11y: true,
  },
  "2px": {
    value: `2px`,
    type: "rootSize",
    description: "Precision spacing (coarse).",
    a11y: true,
  },
  "025": {
    value: `.25rem`,
    type: "rootSize",
    description: "Extra-tiny spacing.",
    a11y: true,
  },
  "05": {
    value: `.5rem`,
    type: "rootSize",
    description: "Tiny spacing.",
    a11y: true,
  },
  "1": {
    value: `1rem`,
    type: "rootSize",
    description: "Small spacing.",
    a11y: true,
  },
  "105": {
    value: `1.5rem`,
    type: "rootSize",
    description: "Small-plus spacing.",
    a11y: true,
  },
  "2": {
    value: `2rem`,
    type: "rootSize",
    description: "Base spacing.",
    a11y: true,
  },
  "205": {
    value: `2.5rem`,
    type: "rootSize",
    description: "Base-plus spacing.",
    a11y: true,
  },
  "3": {
    value: `3rem`,
    type: "rootSize",
    description: "Medium spacing.",
    a11y: true,
  },
  "4": {
    value: `4rem`,
    type: "rootSize",
    description: "Medium-plus spacing.",
    a11y: true,
  },
  "5": {
    value: `5rem`,
    type: "rootSize",
    description: "Large spacing.",
    a11y: true,
  },
  "6": {
    value: `6rem`,
    type: "rootSize",
    description: "Large-plus spacing.",
    a11y: true,
  },
  "7": {
    value: `7rem`,
    type: "rootSize",
    description: "XL spacing.",
    a11y: true,
  },
  "8": {
    value: `8rem`,
    type: "rootSize",
    description: "XL-plus spacing.",
    a11y: true,
  },
  "9": {
    value: `9rem`,
    type: "rootSize",
    description: "2XL spacing.",
    a11y: true,
  },
  "10": {
    value: `10rem`,
    type: "rootSize",
    description: "2XL-plus spacing.",
    a11y: true,
  },
  "15": {
    value: `15rem`,
    type: "rootSize",
    description: "3XL layout spacing.",
    a11y: true,
  },
  "20": {
    value: `20rem`,
    type: "rootSize",
    description: "4XL layout spacing.",
    a11y: true,
  },
  "25": {
    value: `25rem`,
    type: "rootSize",
    description: "5XL layout spacing.",
    a11y: true,
  },
  "30": {
    value: `30rem`,
    type: "rootSize",
    description: "6XL layout spacing.",
    a11y: true,
  },
  "40": {
    value: `40rem`,
    type: "rootSize",
    description: "7XL layout spacing.",
    a11y: true,
  },
  "50": {
    value: `50rem`,
    type: "rootSize",
    description: "8XL layout spacing.",
    a11y: true,
  },
  "60": {
    value: `60rem`,
    type: "rootSize",
    description: "9XL layout spacing.",
    a11y: true,
  },
  "70": {
    value: `70rem`,
    type: "rootSize",
    description: "10XL layout spacing.",
    a11y: true,
  },
  "80": {
    value: `80rem`,
    type: "rootSize",
    description: "11XL layout spacing.",
    a11y: true,
  },
  "90": {
    value: `90rem`,
    type: "rootSize",
    description: "12XL layout spacing.",
    a11y: true,
  },
  "100": {
    value: `100rem`,
    type: "rootSize",
    description: "13XL layout spacing.",
    a11y: true,
  },
} as const satisfies SpacingTokens;

export default tokens;
