# Component Authoring

A zebkit component is a finished semantic pattern with light-DOM behavior and a complete token surface, not a visual preset. Read the [component vision](../../foundations/COMPONENT-VISION.md) for the why and [GRAMMAR.md](../../foundations/GRAMMAR.md) for the binding contract.

## Build a component

The canonical checklist, file layout, external edits, and reference implementations live in [the shared component conventions](../../plans/components/00-conventions.md). That file is the authoritative how-to; this page is only the map.

<!-- If the plans directory is retired, move the canonical checklist here. -->

Component manifests own slot semantics and authoring guidance. Follow the [component manifest workflow](../scripts/components/README.md#workflow-manifesting-a-component); its lint rules are the delivery check between a manifest and its component.

## Verify

Run `npm run generate && npm run lint && npm run check`. In dev mode, diagnostics name the correction and valid vocabulary as required by [GRAMMAR.md §9](../../foundations/GRAMMAR.md#9-feedback-names-the-fix).

For implementation patterns, use the [reference implementation table](../../plans/components/00-conventions.md#reference-implementations) rather than copying a checklist into this guide.
