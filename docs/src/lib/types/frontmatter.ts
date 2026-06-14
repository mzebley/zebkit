/** Page register selected by mdsvex frontmatter; resolves to a layout component. */
export type Register = 'editorial' | 'reference';

/** Publication status of a docs page. */
export type PageStatus = 'draft' | 'review' | 'published';

/**
 * Frontmatter contract for markdown docs pages.
 * `layout` defaults to `editorial` (see svelte.config.js mdsvex `layout._`).
 */
export interface Frontmatter {
  title: string;
  description: string;
  layout: Register;
  /** IA section this page belongs to (matches navigation.ts section labels). */
  section: string;
  status: PageStatus;
}
