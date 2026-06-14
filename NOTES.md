# Notes

A place to keep track of things I don't want to forget as we build this out.

## Bugs

- [ ] Look into how we're handing Google fonts vs self-hosted fonts and associated @font-face CSS code to be sure it's as easy on the end user as possible.
- [ ] We need to set up a good reset.css style thing that sets things like box-sizing and html root font-size

## Enhancements

- [ ] Breakpoints should be tokens that can be set that way (rather than through the config) now that we're moving to manifests and can implement them that way. We also need to insure that they're respecting the "enable breakpoints config option" and create a way to disable a breakpoint option in the tokens (set it to null or false?) and then have the manifests respect that when generating CSS even if the manifest calls for all breakpoints (should be interpretted as 'if available' not forced to be included)
- [ ] Referenced tokens no longer need to be listed out as values under the 'pattern' field on manifests (see margin manifest). This makes the experience of writing them more efficient, but when reviewing them they no longer include the full picture of what will be included to derive classes from without also having access to the tokens file and cross-checking manually. Not sure how to solve for this (or if it's even an actual problem), but worth noting to think about later.
- [ ] Create ability through the config to only generate token -> css var conversion and only for the tokens that you include. Allowing for a selector scoped, minimal update for things like "high contrast" that would then leave alone already set things like font sizes and spacing and whatnot, only updating color tokens.

## Polish

- [ ] Add schema for zebkit config JSON files
