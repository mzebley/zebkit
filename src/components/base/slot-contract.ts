/**
 * The runtime half of a component's slot contract (GRAMMAR.md §7), generated
 * from its zbk-{name}.manifest.json by `npm run generate:components`. ZebkitElement
 * uses it to warn on unknown `slot` names (whose content would otherwise
 * silently never render) and on missing required default content.
 */
export interface SlotContract {
  /** Every slot the component delivers; "default" = unnamed children. */
  readonly slots: readonly string[];
  /** Slots the author must fill (dev mode warns when empty). */
  readonly required: readonly string[];
}
