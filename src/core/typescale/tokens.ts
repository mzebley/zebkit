// Fluid + dynamically user-adjustable non-linear type scaling variables
// Each scale stop gets its own A11Y_MODIFIER to fine tune a11y scaling

// SMALLEST_SIZE: 16px;
// LARGEST_SIZE: 20px;
// A11Y_MODIFIER: 1;
// VIEWPORT_SCALE: .4vw;
// FONT_SIZE: clamp(
//    (SMALLEST_SIZE * A11Y_MODIFIER),
//    ((SMALLEST_SIZE + VIEWPORT_SCALE) * A11Y_MODIFIER),
//    (LARGEST_SIZE * A11Y_MODIFIER)
//   )

export const zbkTypescaleTokens = {
  "zbk-typescale": {
    styles: {
        "viewport-modifier": {
            value: '.4vw',
            type: "sizing",
            desc: "Amount of viewport to be passed into typescaling equations to dynamically adjust sizing with user viewport dimensions. Set to 0vw to disabled viewport scaling.",
        },
        "font-size-spread": {
            value: '.4',
            type: "modifier",
            desc: "Amount that dynamic type is allowed to flex from their font size. Used in CSS clamp() to get min: (FONT_SIZE * (1 - SPREAD)) and max: (FONT_SIZE * (1 + SPREAD))",
        },
        "font-size-2xs-base": {
            value: '10px',
            type: "typescale",
            desc: "Baseline size of text set to 2xs size. Used in 'font-size-2xs' equation.",
        },
        "font-size-xs-base": {
            value: '12px',
            type: "typescale",
            desc: "Baseline size of text set to xs size. Used in 'font-size-xs' equation.",
        },
        "font-size-sm-base": {
            value: '15px',
            type: "typescale",
            desc: "Baseline size of text set to sm size. Used in 'font-size-sm' equation.",
        },
        "font-size-md-base": {
            value: '18px',
            type: "typescale",
            desc: "Baseline size of text set to md size. Used in 'font-size-md' equation.",
        },
        "font-size-lg-base": {
            value: '24px',
            type: "typescale",
            desc: "Baseline size of text set to lg size. Used in 'font-size-lg' equation.",
        },
        "font-size-xl-base": {
            value: '32px',
            type: "typescale",
            desc: "Baseline size of text set to xl size. Used in 'font-size-xl' equation.",
        },
        "font-size-2xl-base": {
            value: '44px',
            type: "typescale",
            desc: "Baseline size of text set to 2xl size. Used in 'font-size-2xl' equation.",
        },
        "font-size-3xl-base": {
            value: '68px',
            type: "typescale",
            desc: "Baseline size of text set to 3xl size. Used in 'font-size-3xl' equation.",
        }
    },
  },
};
