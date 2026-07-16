# Notes

A place to keep track of things I don't want to forget as we build this out.

## Bugs

- [ ] No responsive variant utility classes for position-sticky, etc

## Enhancements

- [ ] Create .eyebrow prose tokens & css classes
- [ ] Create viewport classes for text-alignment (check into other typography things as well)
- [ ] Create .lede prose tokens & css classes
- [ ] Create code & pre prose tokens & css classes
- [ ] Create .link tokens & css classes
- [ ] Create .breadcrumb tokens & css classes
- [ ] Refine ideas around page padding semantic tokens (how to make different size at different breakpoints, but use same class?)
- [ ] Referenced tokens no longer need to be listed out as values under the 'pattern' field on manifests (see margin manifest). This makes the experience of writing them more efficient, but when reviewing them they no longer include the full picture of what will be included to derive classes from without also having access to the tokens file and cross-checking manually. Not sure how to solve for this (or if it's even an actual problem), but worth noting to think about later.
- [ ] Steal the @container query utility class from tailwind
- [x] Brainstorm ways to improve delivery of final css, IE difference between what you need for developing and building versus what you need for production. Strip unused classes and vars from final css when production is built? Create a hook to do that?
- [ ] Create documentation pages for config and getting started

## Polish

- [ ] Add schema for zebkit config JSON files
- [ ] Make right panel "trace a token" search box support actual fuzzy search
- [ ] Create extended :hover/:action tokens (transform for buttons, links, and cards, text-decoration color, offset for links, etc)
