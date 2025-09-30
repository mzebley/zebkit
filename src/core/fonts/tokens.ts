export const zbkTypographyTokens = {
  "zbk-typography": {
    styles: {
      "font-family-primary": {
        value: `"UnifrakturCook", sans-serif`,
        type: "fontFamily",
        weights: "700",
        variableFont: "false",
        desc: "Primary font family.",
      },
      "font-family-secondary": {
        value: `"Merriweather", serif`,
        type: "fontFamily",
        weights: "300,400,700,900",
        variableFont: "true",
        desc: "Secondary font family.",
      },
      "font-family-alt": {
        value: `"DM Serif Display", serif`,
        type: "fontFamily",
        weights: "",
        variableFont: "false",
        desc: "Alternate font family.",
      },
      "font-family-monospace": {
        value: `"Fira Code", monospace`,
        type: "fontFamily",
        weights: "300,700",
        variableFont: "true",
        desc: "Monospace font family.",
      },
      "font-family-interface": {
        value: "$font-family-primary",
        type: "fontFamily",
        desc: "Font family for interface items (buttons, links, etc).",
      },
      "font-family-heading": {
        value: "$font-family-secondary",
        type: "fontFamily",
        desc: "Font family for heading elements.",
      },
      "font-family-body": {
        value: "$font-family-primary",
        type: "fontFamily",
        desc: "Font family for prose elements and content.",
      },
      "font-family-code": {
        value: "$font-family-monospace",
        type: "fontFamily",
        desc: "Font family for code elements (pre, code, etc).",
      },
      "line-height-1": {
        value: "100%",
        type: "lineHeight",
        desc: "Smallest line height"
      },
      "line-height-2": {
        value: "115%",
        type: "lineHeight",
        desc: "Small line height"
      },
      "line-height-3": {
        value: "130%",
        type: "lineHeight",
        desc: "Standard line height"
      },
      "line-height-4": {
        value: "150%",
        type: "lineHeight",
        desc: "large line height"
      },
      "line-height-5": {
        value: "180%",
        type: "lineHeight",
        desc: "Largest line height"
      },
      "line-height-interface": {
        value: "$line-height-2",
        type: "lineHeight",
        desc: "Default interface line height"
      },
      "line-height-heading": {
        value: "$line-height-3",
        type: "lineHeight",
        desc: "Default heading line height"
      },
      "line-height-body": {
        value: "$line-height-4",
        type: "lineHeight",
        desc: "Default body line height"
      },
      "line-height-code": {
        value: "$line-height-5",
        type: "lineHeight",
        desc: "Default code line height"
      },
      "letter-spacing-neg-2": {
        value: "-.125rem",
        type: "letterSpacing",
        desc: "Tightest letter spacing amount"
      },
      "letter-spacing-neg-1": {
        value: "-.05rem",
        type: "letterSpacing",
        desc: "Tight letter spacing amount"
      },
      "letter-spacing-0": {
        value: "0",
        type: "letterSpacing",
        desc: "Unset letter spacing amount"
      },
      "letter-spacing-1": {
        value: ".05rem",
        type: "letterSpacing",
        desc: "Loose letter spacing amount"
      },
      "letter-spacing-2": {
        value: ".125rem",
        type: "letterSpacing",
        desc: "Looser letter spacing amount"
      },
      "letter-spacing-interface": {
        value: "$letter-spacing-1",
        type: "letterSpacing",
        desc: "Default letter spacing for interface elements"
      },
      "letter-spacing-heading": {
        value: "$letter-spacing-1",
        type: "letterSpacing",
        desc: "Default letter spacing for heading elements"
      },
      "letter-spacing-body": {
        value: "$letter-spacing-1",
        type: "letterSpacing",
        desc: "Default letterspacing for body elements"
      },
      "letter-spacing-code": {
        value: "$letter-spacing-2",
        type: "letterSpacing",
        desc: "Default letterspacing for code elements"
      }
    },
  },
};
