# Notes

A place to keep track of things I don't want to forget as we build this out.

## Bugs

- [ ] Look into how we're handing Google fonts vs self-hosted fonts and associated @font-face CSS code to be sure it's as easy on the end user as possible.
- [x] We need to set up a good reset.css style thing that sets things like box-sizing and html root font-size=100%, etc. Designed to not interfer with our tokens, but set sensible defaults to work from consistently. (`src/core/styles/base/reset.scss`, `@layer base`)
- [x] Need things for right panel to do when x-ray doesn't make sense. Also, x-ray should be available for more pages (token catalogue, component page (every time a token is listed on a page?)) - Idea for utility class documentation: click on a class name to see what the class applies (with appropriate tokens, IE the literal class) in the right panel. (Adaptive `Inspector.svelte` rail: token x-ray / utility-class inspector / on-this-page contents fallback. Shared `InstrumentShell.svelte` puts the rail on reference + component pages; token tables and utility class names are now inspectable. Class declarations derived from the manifests, mirroring `generate.ts`.)
- [x] More colors need to be added to colors section in the doc site (action, caution, info, positive, primitive palette, etc). Full documentation
- [x] No mobile/tablet responsive/fluid views (Three-regime responsive shell driven by zebkit's own breakpoint tokens — `full` ≥80rem / `reading` 50–80rem / `compact` <50rem, in `viewport.svelte.ts`. Left nav: persistent column on full/reading, off-canvas drawer below, summoned by a TopBar hamburger. Inspector: sticky rail on full, right-drawer toggle on reading, bottom-sheet on compact (raised on token pin); rail vessel swaps in `InstrumentShell`, panel state in `ui.svelte.ts`. All panels share one accessible `Overlay` primitive — focus trap, Esc, scrim-dismiss, focus return, reduced-motion, plus a `keepMounted` mode so the inspector's page wiring stays live while closed. Hero diff panel drops sticky when stacked; fake app-nav reflows.)
- [x] font size and spacing sizes are far too big at default values, need adjustment. Utopia fluid font sizes will help, but aren't enough on their own - for sure

## Enhancements

- [x] Breakpoints should be tokens that can be set that way (rather than through the config) now that we're moving to manifests and can implement them that way. We also need to insure that they're respecting the "enable breakpoints config option" and create a way to disable a breakpoint option in the tokens (set it to null or false?) and then have the manifests respect that when generating CSS even if the manifest calls for all breakpoints (should be interpretted as 'if available' not forced to be included) (New `src/core/breakpoint` token module is the single source of truth; the build injects the token-derived, config-filtered scale into SCSS `$active-breakpoints`. Collapsed the four hardcoded copies. Disable a breakpoint per-theme with `value: null`; `extendedTokens.breakpoints` kept as a per-build filter, now validated against token keys. Manifests requesting "all" already resolve to "all available" via the `from-breakpoint` no-op. New opt-in `extendedTokens.emitBreakpointVars` emits `--zbk-breakpoint-*` vars for JS. Parity test guards the one remaining static type const.)
- [ ] Referenced tokens no longer need to be listed out as values under the 'pattern' field on manifests (see margin manifest). This makes the experience of writing them more efficient, but when reviewing them they no longer include the full picture of what will be included to derive classes from without also having access to the tokens file and cross-checking manually. Not sure how to solve for this (or if it's even an actual problem), but worth noting to think about later.
- [ ] Create ability through the config to only generate token -> css var conversion and only for the tokens that you include. Allowing for a selector scoped, minimal update for things like "high contrast" that would then leave alone already set things like font sizes and spacing and whatnot, only updating color tokens or whatever you want to be changed from the defaults.
- [x] Incorporate (overhaul) [utopia fluid type](https://utopia.fyi/type/calculator?c=360,18,1.2,1240,20,1.25,5,2,&s=0.75%7C0.5%7C0.25,1.5%7C2%7C3%7C4%7C6,s-l&g=s,l,xl,12) into type scaling. Primary driver seems to be using individual scale step viewport modifiers rather than sharing a singular one and calculating min-width scale formula differently than max-width formula (major third vs golden ratio, etc). Would be cool to leverage their calculator directly in the tokens? Select min width font size and scale, then max-width font size and scale and then leverage their calculator in the compile ts to build the scales themselves dynamically when we're adding in the a11y modifier.
- [ ] Steal the @container query utility class from tailwind
- [ ] Brainstorm ways to improve delivery of final css, IE difference between what you need for developing and building versus what you need for production. Strip unused classes and vars from final css when production is built? Create a hook to do that?

## Polish

- [ ] Add schema for zebkit config JSON files
- [ ] Make right panel "trace a token" search box support actual fuzzy search

