# Notes

A place to keep track of things I don't want to forget as we build this out.

## Bugs

- [ ] Look into how we're handing Google fonts vs self-hosted fonts and associated @font-face CSS code to be sure it's as easy on the end user as possible.
- [ ] We need to set up a good reset.css style thing that sets things like box-sizing and html root font-size
- [ ] Need things for right panel to do when x-ray doesn't make sense. Also, x-ray should be available for more pages (token catalogue, component page (every time a token is listed on a page?)) - Idea for utility class documentation: click on a class name to see what the class applies (with appropriate tokens, IE the literal class) in the right panel.
- [x] More colors need to be added to colors section in the doc site (action, caution, info, positive, primitive palette, etc). Full documentation
- [ ] No mobile/tablet responsive/fluid views
- [ ] font size and spacing sizes are far too big at default values, need adjustment. Utopia fluid font sizes will help, but aren't enough on their own - for sure

## Enhancements

- [ ] Breakpoints should be tokens that can be set that way (rather than through the config) now that we're moving to manifests and can implement them that way. We also need to insure that they're respecting the "enable breakpoints config option" and create a way to disable a breakpoint option in the tokens (set it to null or false?) and then have the manifests respect that when generating CSS even if the manifest calls for all breakpoints (should be interpretted as 'if available' not forced to be included)
- [ ] Referenced tokens no longer need to be listed out as values under the 'pattern' field on manifests (see margin manifest). This makes the experience of writing them more efficient, but when reviewing them they no longer include the full picture of what will be included to derive classes from without also having access to the tokens file and cross-checking manually. Not sure how to solve for this (or if it's even an actual problem), but worth noting to think about later.
- [ ] Create ability through the config to only generate token -> css var conversion and only for the tokens that you include. Allowing for a selector scoped, minimal update for things like "high contrast" that would then leave alone already set things like font sizes and spacing and whatnot, only updating color tokens or whatever you want to be changed from the defaults.
- [x] Incorporate (overhaul) [utopia fluid type](https://utopia.fyi/type/calculator?c=360,18,1.2,1240,20,1.25,5,2,&s=0.75%7C0.5%7C0.25,1.5%7C2%7C3%7C4%7C6,s-l&g=s,l,xl,12) into type scaling. Primary driver seems to be using individual scale step viewport modifiers rather than sharing a singular one and calculating min-width scale formula differently than max-width formula (major third vs golden ratio, etc). Would be cool to leverage their calculator directly in the tokens? Select min width font size and scale, then max-width font size and scale and then leverage their calculator in the compile ts to build the scales themselves dynamically when we're adding in the a11y modifier.

## Polish

- [ ] Add schema for zebkit config JSON files

## Doc site design references

- Radix Themes (radix-ui.com) — the live theme panel; how a control surface coexists with docs. Steal: the panel pattern, restraint.
- shadcn/ui + tweakcn / themes — "copy for your use" model and the live theme editor. Steal: the copy-the-artifact flow, the theme-as-shareable-object idea.
- Material Theme Builder (m3.material.io) — seed-color → whole-system recolor. Steal: the drama of full-system propagation (you go further: full re-design).
- Tailwind CSS docs — the gold standard for utility reference density, search, class→CSS reveal. Steal: utility page ergonomics, search.
- Stripe docs + stripe.com — "this is precision infrastructure" feel; right-rail code that tracks the prose. Steal: the instrument tone, code-follows-content layout.
- Vercel / Geist (vercel.com/geist) — monochrome, mono-accented, data-dense system docs. Steal: the neutral chrome that lets content carry color.
- Linear — high-craft restraint, motion used sparingly and meaningfully. Steal: the discipline.
- Open Props (open-props.style) — literally "CSS variables as a product"; shows the var + its value plainly. Steal: how to make a variable feel like a first-class documented object.
- Utopia.fyi — sliders driving a live fluid-type/space preview. Steal: the "operate the system and watch it respond" interaction model — perfect for your a11y dials.
- IBM Carbon / Shopify Polaris — serious token browsers and tables. Steal: the token-catalog structure (then make yours live).
- Leonardo / Huetone (color tools) — contrast-aware palette generation. Steal: ideas for the color/a11y story, contrast feedback baked into swatches.
