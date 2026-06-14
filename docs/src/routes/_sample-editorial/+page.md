---
title: Sample — Editorial register
description: Proves a markdown page with layout editorial renders in EditorialLayout.
layout: editorial
section: Foundations
status: draft
---

# The editorial register

This page proves the other half of the content engine. Because its frontmatter says
`layout: editorial` — and editorial is also the default — this markdown is wrapped by
`EditorialLayout`: a single comfortable column, display headings in the serif face, and
room for marginalia.

<aside class="editorial-marginalia">
A sidenote. Marginalia carry asides, citations, and definitions without breaking the
reading line — the restraint of good print, not the busyness of a content farm.
</aside>

## Why a register at all

Most design-system docs are a catalog. Zebkit's claim is a verb — *change everything,
rewrite nothing* — so the docs lean on **strong typographic presence** rather than
decoration. Headlines read like headlines; body reads like body.

### Code still reads as data

Even in narrative prose, a token like `--zbk-font-family-alt` keeps its monospace
signal, marking the thing you can change.

## Holding the baseline

Set a rhythm and hold it. Generous leading, an honest measure, and a confident
hierarchy do the work that color and shadow would otherwise be asked to do.
